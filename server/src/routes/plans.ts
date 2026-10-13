import { Router } from 'express';
import { db } from '../database/index.ts';
import { plans, activeSubscriptions } from '../database/schema.ts';
import { eq, and, count } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware.ts';
import { createStripeProduct, createStripePrice } from '../services/stripe.service.ts';

const router = Router();

// GET /api/plans
// Public/Auth'd to see available active plans (Admins see all with subscriber count)
router.get('/', authenticate, async (req: any, res) => {
  try {
    if (req.user?.role === 'ADMIN') {
      const allPlans = await db.select().from(plans).orderBy(plans.id);
      
      const subsCounts = await db
        .select({
          planId: activeSubscriptions.planId,
          count: count(),
        })
        .from(activeSubscriptions)
        .where(eq(activeSubscriptions.status, 'ACTIVE'))
        .groupBy(activeSubscriptions.planId);

      const countMap = new Map<number, number>();
      for (const row of subsCounts) {
        countMap.set(row.planId, Number(row.count));
      }

      const plansWithSubscribers = allPlans.map((p) => ({
        ...p,
        activeSubscribers: countMap.get(p.id) || 0,
      }));

      return res.json(plansWithSubscribers);
    } else {
      const allPlans = await db.select().from(plans).where(eq(plans.status, 'ACTIVE')).orderBy(plans.id);
      return res.json(allPlans);
    }
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/plans
// Admin only - Create a new plan
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, maxStorageMb, durationDays } = req.body;
    
    if (!name || price === undefined || !maxStorageMb) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Create Stripe Product
    const stripeProduct = await createStripeProduct(name, `Storage: ${maxStorageMb}MB`);
    
    // 2. Create Stripe Price (price comes as string or number, parse as float)
    const priceFloat = typeof price === 'string' ? parseFloat(price) : price;
    const stripePrice = await createStripePrice(stripeProduct.id, priceFloat);

    const [newPlan] = await db.insert(plans).values({
      name,
      price: price.toString(),
      maxStorageMb: parseInt(maxStorageMb),
      durationDays: durationDays ? parseInt(durationDays) : 30,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id
    }).returning();

    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/plans/:id
// Admin only - Update a plan
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const { name, price, maxStorageMb, durationDays, status } = req.body;

    const [updatedPlan] = await db.update(plans).set({
      name,
      price: price !== undefined ? price.toString() : undefined,
      maxStorageMb: maxStorageMb !== undefined ? parseInt(maxStorageMb) : undefined,
      durationDays: durationDays !== undefined ? parseInt(durationDays) : undefined,
      status: status !== undefined ? status : undefined,
      updatedAt: new Date()
    })
    .where(eq(plans.id, planId))
    .returning();

    if (!updatedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/plans/:id/deactivate
// Admin only - Deactivate a plan (soft delete)
router.patch('/:id/deactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const [deactivatedPlan] = await db.update(plans).set({
      status: 'INACTIVE',
      updatedAt: new Date()
    })
    .where(eq(plans.id, planId))
    .returning();

    if (!deactivatedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/plans/:id/activate
// Admin only - Activate a plan
router.patch('/:id/activate', authenticate, requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const [activatedPlan] = await db.update(plans).set({
      status: 'ACTIVE',
      updatedAt: new Date()
    })
    .where(eq(plans.id, planId))
    .returning();

    if (!activatedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan activated successfully' });
  } catch (error) {
    console.error('Error activating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/plans/:id
// Admin only - Delete a plan (blocked if active subscribers exist)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    // Check if plan has active subscribers
    const [subCountResult] = await db
      .select({ count: count() })
      .from(activeSubscriptions)
      .where(and(eq(activeSubscriptions.planId, planId), eq(activeSubscriptions.status, 'ACTIVE')));

    const activeCount = Number(subCountResult?.count || 0);
    if (activeCount > 0) {
      return res.status(409).json({
        error: `This plan has ${activeCount} active subscriber(s). You cannot delete it while users are subscribed. Would you like to deactivate the plan instead?`,
        activeSubscribers: activeCount,
        canDeactivate: true,
      });
    }

    const [deletedPlan] = await db.delete(plans)
      .where(eq(plans.id, planId))
      .returning();

    if (!deletedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
