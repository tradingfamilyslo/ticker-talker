import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Uporabimo || '' za varen build na Vercelu
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    // Dodamo traderId v destrukturiranje podatkov
    const { amount, userAlias, userId, traderId } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Ugotovimo, ali gre za naročnino (če je traderId prisoten) ali za top-up
    const isSubscription = !!traderId;
    
    // Nastavimo ime izdelka in opis glede na tip plačila
    const productName = isSubscription 
      ? `VIP Subscription to ${userAlias}` 
      : `${amount} GAINS Coins`;
      
    const productDescription = isSubscription
      ? `Monthly VIP access to signals and private hub.`
      : `Terminal Top-up for Node: ${userAlias}`;

    // Ustvarimo sejo za plačilo
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
              description: productDescription,
            },
            // Če je naročnina, je 'amount' dejanska cena v EUR (npr. 50),
            // če je top-up, pa 'amount' pomeni število kovancev po 0.10€
            unit_amount: isSubscription ? amount * 100 : 10, 
          },
          quantity: isSubscription ? 1 : amount,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      metadata: {
        userId: userId,
        traderId: traderId || '', // Shranimo ID tistega, ki dobi naročnino
        amount: amount.toString(),
        type: isSubscription ? 'subscription' : 'topup' // Ključno za Webhook!
      },
    });

    // Vrnemo URL za direktno preusmeritev
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}