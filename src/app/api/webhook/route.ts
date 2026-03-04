import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Pridobimo podatke iz metadata, ki smo jih poslali ob kreaciji Checkouta
    const userId = session.metadata?.userId;
    const type = session.metadata?.type; // 'topup' ali 'subscription'
    
    if (!userId) return NextResponse.json({ error: "No userId in metadata" }, { status: 400 });

    // --- OPCIJA A: NAKUP KOVANCEV (Top-up) ---
    if (type === 'topup') {
      const amountGains = parseInt(session.metadata?.amount || "0");
      if (amountGains > 0) {
        const { data: wallet } = await supabase
          .from('user_balances')
          .select('bulls_balance')
          .eq('user_id', userId)
          .maybeSingle();

        const newBalance = (wallet?.bulls_balance || 0) + amountGains;

        await supabase
          .from('user_balances')
          .update({ bulls_balance: newBalance, updated_at: new Date() })
          .eq('user_id', userId);

        await supabase.from('transactions').insert({
          user_id: userId,
          amount: amountGains,
          type: 'deposit',
          description: 'Stripe Top-up (Gains)'
        });
        console.log(`✅ Top-up uspešen za ${userId}: +${amountGains} Gains`);
      }
    }

    // --- OPCIJA B: VIP NAROČNINA NA TRADERJA ---
    if (type === 'subscription') {
      const traderId = session.metadata?.traderId; // ID traderja, na katerega se je naročil
      
      if (traderId) {
        // Vpišemo novo naročnino v bazo
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert([{ 
            user_id: userId, 
            trader_id: traderId, 
            status: 'active',
            created_at: new Date(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dni od danes
          }]);

        if (subError) {
          console.error("❌ Subscription insert error:", subError.message);
        } else {
          // Zabeležimo še v zgodovino transakcij
          await supabase.from('transactions').insert({
            user_id: userId,
            amount: session.amount_total ? session.amount_total / 100 : 0, // Shranimo dejanski $ znesek
            type: 'subscription_payment',
            description: `VIP Subscription to Trader ID: ${traderId}`
          });
          console.log(`✅ VIP Naročnina aktivirana: Uporabnik ${userId} -> Trader ${traderId}`);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}