import { Router } from 'express';
import { db } from '../database/index.ts';
import { plans } from '../database/schema.ts';
import { eq } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware.ts';

const router = Router();

// GET /api/plans
// Public/Auth'd to see available active plans
router.get('/', authenticate, async (req, res) => {
  try {
    const allPlans = await db.select().from(plans).where(eq(plans.isActive, true));
    res.json(allPlans);
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

    const [newPlan] = await db.insert(plans).values({
      name,
      price: price.toString(),
      maxStorageMb: parseInt(maxStorageMb),
      durationDays: durationDays ? parseInt(durationDays) : 30
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
    const { name, price, maxStorageMb, durationDays, isActive } = req.body;

    const [updatedPlan] = await db.update(plans).set({
      name,
      price: price !== undefined ? price.toString() : undefined,
      maxStorageMb: maxStorageMb !== undefined ? parseInt(maxStorageMb) : undefined,
      durationDays: durationDays !== undefined ? parseInt(durationDays) : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
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

// DELETE /api/plans/:id
// Admin only - Soft delete a plan
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const [deletedPlan] = await db.update(plans).set({
      isActive: false,
      updatedAt: new Date()
    })
    .where(eq(plans.id, planId))
    .returning();

    if (!deletedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan deactivated successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
