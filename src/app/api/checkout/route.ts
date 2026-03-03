import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Uporabimo || '' za varen build na Vercelu
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    const { amount, userAlias, userId } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

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
            unit_amount: 10, // 0.10€ na kovanec
          },
          quantity: amount,
        },
      ],
      mode: 'payment',
      // success_url in cancel_url zdaj bereš dinamično iz izvora zahteve
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      metadata: {
        userId: userId,
        amount: amount.toString(),
        type: 'top_up' // Dodano, da webhook ve, da gre za nakup kovancev
      },
    });

    // Vrnemo URL za direktno preusmeritev (rešitev za leto 2026!)
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}