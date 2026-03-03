import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uporabimo Service Role Key, da lahko skripta piše v bazo brez omejitev
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: Request) {
  // 1. Varnostna preverba (Samo Cron Job lahko sproži to ruto)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    // 2. Pridobi vse odprte signale
    const { data: openSignals, error: signalsError } = await supabase
      .from('posts')
      .select('*')
      .eq('signal_status', 'open')
      .not('pair', 'is', null);

    if (signalsError) throw signalsError;
    if (!openSignals || openSignals.length === 0) {
      return NextResponse.json({ message: "No active signals to resolve." });
    }

    // 3. Pridobi trenutne cene iz tvojega internega API-ja
    const baseUrl = new URL(req.url).origin;
    const priceRes = await fetch(`${baseUrl}/api/prices`, { cache: 'no-store' });
    const currentPrices = await priceRes.json();

    const resolvedResults = [];

    // 4. Glavna zanka za preverjanje
    for (const signal of openSignals) {
      const pairKey = signal.pair.toUpperCase(); // npr. BTC/USD
      const priceData = currentPrices[pairKey];

      // Če nimamo cene za ta par, ga preskočimo
      if (!priceData || !priceData.price) continue;

      const currentPrice = parseFloat(priceData.price);
      let finalStatus: string | null = null;

      // Logika za LONG (Kupujemo)
      if (signal.direction === 'LONG') {
        if (currentPrice >= signal.tp_price) finalStatus = 'win';
        else if (currentPrice <= signal.sl_price) finalStatus = 'loss';
      } 
      // Logika za SHORT (Prodajamo)
      else if (signal.direction === 'SHORT') {
        if (currentPrice <= signal.tp_price) finalStatus = 'win';
        else if (currentPrice >= signal.sl_price) finalStatus = 'loss';
      }

      // 5. Če je signal dosegel TP ali SL, ga posodobimo v bazi in zaklenemo Exit Price
      if (finalStatus) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({ 
            signal_status: finalStatus,
            exit_price: currentPrice // ZAKLENEMO CENO OB ZAPRTJU
          })
          .eq('id', signal.id);

        if (!updateError) {
          resolvedResults.push({ 
            id: signal.id, 
            pair: pairKey, 
            status: finalStatus, 
            exitPrice: currentPrice 
          });
        }
      }
    }

    return NextResponse.json({ 
      processed: openSignals.length, 
      resolved: resolvedResults.length,
      details: resolvedResults 
    });

  } catch (err: any) {
    console.error("Auto-Resolver Critical Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}