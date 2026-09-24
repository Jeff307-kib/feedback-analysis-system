import { Router } from 'express';
import { db } from '../database/index.ts';
import { activeSubscriptions, plans, users } from '../database/schema.ts';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middlewares/authMiddleware.ts';

const router = Router();

// GET /api/subscriptions/me
// Fetch user's current subscription status and quota
router.get('/me', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    // Check if they have used free trial
    const [user] = await db.select({ hasUsedFreeTrial: users.hasUsedFreeTrial }).from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for an active subscription
    const [subscription] = await db
      .select()
      .from(activeSubscriptions)
      .where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));

    if (subscription) {
      // Return their active subscription details
      const [plan] = await db.select().from(plans).where(eq(plans.id, subscription.planId));
      return res.json({
        hasUsedFreeTrial: user.hasUsedFreeTrial,
        subscription,
        plan
      });
    }

    // No active subscription, but return free trial status
    res.json({
      hasUsedFreeTrial: user.hasUsedFreeTrial,
      subscription: null,
      plan: null
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/purchase
// Mock payment endpoint to buy/upgrade a plan
router.post('/purchase', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // Verify plan exists
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }

    // Calculate end date (now + durationDays)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    // Check if user already has a subscription
    const [existingSub] = await db
      .select()
      .from(activeSubscriptions)
      .where(eq(activeSubscriptions.userId, userId));

    let subscription;

    if (existingSub) {
      // Update existing subscription
      [subscription] = await db.update(activeSubscriptions).set({
        planId: plan.id,
        startDate,
        endDate,
        status: 'ACTIVE',
        updatedAt: new Date()
      })
      .where(eq(activeSubscriptions.id, existingSub.id))
      .returning();
    } else {
      // Create new subscription
      [subscription] = await db.insert(activeSubscriptions).values({
        userId,
        planId: plan.id,
        startDate,
        endDate,
        usedStorageMb: '0',
        status: 'ACTIVE'
      }).returning();
    }

    res.json({ message: 'Purchase successful', subscription, plan });
  } catch (error) {
    console.error('Error processing purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
