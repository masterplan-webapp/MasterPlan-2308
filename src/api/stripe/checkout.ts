import Stripe from 'stripe';
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripeProducts } from '../../config/stripeProducts';

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-10.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { planId, userId, email } = req.body;

  if (!planId || !userId || !email) {
    return res.status(400).json({ 
      error: 'Missing required fields: planId, userId, email' 
    });
  }

  const product = stripeProducts.find(p => p.id === planId);
  if (!product) {
    return res.status(400).json({ error: 'Invalid plan ID' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      client_reference_id: userId,
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.VITE_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          userId,
          planId,
          planName: product.name,
        },
      },
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Checkout failed' 
    });
  }
}
