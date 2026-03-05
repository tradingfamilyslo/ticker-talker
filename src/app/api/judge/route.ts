import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Uporabimo Service Role Key za bypass RLS politik
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET() {
  try {
    // 1. Pridobimo vse odprte signale (is_signal mora biti true)
    const { data: openSignals, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('signal_status', 'open');

    if (fetchError) throw fetchError;
    if (!openSignals || openSignals.length === 0) {
      return NextResponse.json({ message: "No open signals to judge." });
    }

    // 2. Pridobimo trenutne cene (Binance API)
    // Opomba: Za več parov bi tukaj naredili zanko čez različne simbole
    const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const priceData = await priceRes.json();
    const currentPrice = parseFloat(priceData.price);

    let closedCount = 0;

    for (const signal of openSignals) {
      const tp = parseFloat(signal.tp_price);
      const sl = parseFloat(signal.sl_price);
      const direction = signal.direction?.toLowerCase(); // 'buy' ali 'sell'
      
      let finalStatus = 'open';

      if (direction === 'buy') {
        if (currentPrice >= tp) finalStatus = 'win';
        if (currentPrice <= sl) finalStatus = 'loss';
      } else if (direction === 'sell') {
        if (currentPrice <= tp) finalStatus = 'win';
        if (currentPrice >= sl) finalStatus = 'loss';
      }

      if (finalStatus !== 'open') {
        // 3. Posodobimo status signala
        await supabase
          .from('posts')
          .update({ 
            signal_status: finalStatus,
            exit_price: currentPrice,
            closed_at: new Date().toISOString() 
          })
          .eq('id', signal.id);
        
        closedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      checked: openSignals.length, 
      closed: closedCount,
      market_price: currentPrice 
    });

  } catch (err: any) {
    console.error("Judge Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}