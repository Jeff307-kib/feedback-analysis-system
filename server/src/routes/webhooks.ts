import express, { Router } from 'express';
import { stripe } from '../services/stripe.service.ts';
import { db } from '../database/index.ts';
import { activeSubscriptions, users } from '../database/schema.ts';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (!endpointSecret) throw new Error('Stripe Webhook Secret not configured');
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const stripeCustomerId = subscription.customer;
        const stripeSubscriptionId = subscription.id;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        let status = 'ACTIVE';

        if (subscription.status === 'canceled') status = 'CANCELED';
        else if (subscription.status === 'past_due') status = 'PAST_DUE';
        else if (subscription.status === 'incomplete') status = 'INCOMPLETE';
        else if (subscription.status === 'trialing') status = 'TRIALING';
        else if (subscription.status !== 'active') status = 'EXPIRED';

        // Find the activeSubscription in DB using stripeSubscriptionId
        const [existingSub] = await db.select().from(activeSubscriptions).where(eq(activeSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
        if (existingSub) {
          await db.update(activeSubscriptions).set({
            status: status as any,
            currentPeriodEnd,
            endDate: currentPeriodEnd,
            updatedAt: new Date()
          }).where(eq(activeSubscriptions.id, existingSub.id));
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
