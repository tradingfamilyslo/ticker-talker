import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// POPRAVLJENO: Ključ je zdaj samo v .env.local datoteki, tukaj ga samo pokličemo
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(req: Request) {
  try {
    const { amount, userAlias, userId } = await req.json();

    // Ustvarimo sejo za plačilo
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${amount} GAINS Coins`,
              description: `Terminal Top-up for Node: ${userAlias}`,
            },
            unit_amount: 10, // 10 centov na kovanec (0.10€)
          },
          quantity: amount,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      metadata: {
        userId: userId,
        amount: amount.toString(), // To je ključno za Webhook!
      },
    });

    return NextResponse.json({ id: session.id });
  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}