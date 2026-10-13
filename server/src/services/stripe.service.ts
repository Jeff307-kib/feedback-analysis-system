import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia' as any,
});

export const createStripeProduct = async (name: string, description: string | undefined) => {
  return await stripe.products.create({
    name,
    description: description || undefined,
  });
};

export const createStripePrice = async (productId: string, amount: number, currency: string = 'usd') => {
  return await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amount * 100), // Stripe expects cents
    currency,
    recurring: { interval: 'month' },
  });
};

export const getOrCreateCustomer = async (email: string, name?: string) => {
  const existingCustomers = await stripe.customers.search({
    query: `email:\'${email}\'`,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  return await stripe.customers.create({
    email,
    name: name || undefined,
  });
};
