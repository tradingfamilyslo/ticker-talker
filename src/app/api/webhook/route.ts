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

// --- KONFIGURACIJA EKONOMIJE ---
const TERMINAL_FEE_PERCENT = 20; // Tvoja provizija (20%)

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 1. LOGIKA ZA NAKUP KOVANCEV (Top-up)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amountGains = parseInt(session.metadata?.amount || "0");
    const type = session.metadata?.type;

    if (userId && amountGains > 0) {
      console.log(`Plačilo potrjeno za uporabnika: ${userId} (Znesek: ${amountGains})`);

      // Pridobimo trenutno stanje
      const { data: wallet } = await supabase
        .from('user_balances')
        .select('bulls_balance')
        .eq('user_id', userId)
        .single();

      const newBalance = (wallet?.bulls_balance || 0) + amountGains;

      // Posodobimo stanje v bazi
      const { error } = await supabase
        .from('user_balances')
        .update({ 
          bulls_balance: newBalance, 
          updated_at: new Date() 
        })
        .eq('user_id', userId);
        
      if (error) {
        console.error("Database update error:", error.message);
      } else {
        // Zabeležimo transakcijo v zgodovino (če imaš tabelo transactions)
        await supabase.from('transactions').insert({
          user_id: userId,
          amount: amountGains,
          type: 'deposit',
          description: 'Stripe Top-up'
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}