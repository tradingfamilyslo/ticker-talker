import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Zdaj bere iz .env datoteke
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // ... ostali del kode ostane ISTI ...
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amountGains = parseInt(session.metadata?.amount || "0");

    if (userId && amountGains > 0) {
      const { data: wallet } = await supabase
        .from('user_balances')
        .select('bulls_balance')
        .eq('user_id', userId)
        .single();

      const newBalance = (wallet?.bulls_balance || 0) + amountGains;

      await supabase
        .from('user_balances')
        .update({ bulls_balance: newBalance, updated_at: new Date() })
        .eq('user_id', userId);
    }
  }

  return NextResponse.json({ received: true });
}