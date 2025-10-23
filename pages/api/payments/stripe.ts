import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { db } from '../../../drizzle/db';
import { users, payments } from '../../../drizzle/schema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Stripe webhook
    const sig = req.headers['stripe-signature'] as string;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const email = session.customer_email;
      const amount = session.amount_total;
      const credits = Math.floor(amount / 100); // 1 credit per $1
      const user = await db.select().from(users).where(users.email.eq(email)).get();
      if (user) {
        await db.update(users).set({ credits: user.credits + credits }).where(users.id.eq(user.id)).run();
        await db.insert(payments).values({ userId: user.id, provider: 'stripe', amount, credits }).run();
      }
    }
    res.status(200).json({ received: true });
  } else if (req.method === 'GET') {
    // Create Stripe checkout session
    const { email, credits } = req.query;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email as string,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${credits} Credits` },
          unit_amount: Number(credits) * 100,
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=1`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?canceled=1`,
    });
    res.status(200).json({ url: session.url });
  } else {
    res.status(405).end();
  }
} 