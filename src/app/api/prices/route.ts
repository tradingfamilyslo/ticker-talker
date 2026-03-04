import { NextResponse } from 'next/server';

export const revalidate = 60; 

export async function GET() {
  try {
    const apiKey = 'dd2686977779477fbe39d7c87091b3b5'; 
    let finalPrices: any = {};

    // ==========================================
    // 1. BINANCE (Kripto - ZASTONJ, NEOMEJENO)
    // ==========================================
    try {
      // Tukaj sem dodal še več kripto parov, ker je Binance zastonj!
      const binanceUrl = 'https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT"]';
      const binanceRes = await fetch(binanceUrl, { next: { revalidate: 60 } });
      const binanceData = await binanceRes.json();

      if (Array.isArray(binanceData)) {
        binanceData.forEach((item: any) => {
          const cleanSymbol = item.symbol.replace('USDT', '/USD'); 
          finalPrices[cleanSymbol] = { price: parseFloat(item.price).toString() };
        });
      }
    } catch (binanceErr) {
      console.error("Binance Fetch Error:", binanceErr);
    }

    // ==========================================
    // 2. TWELVEDATA (Točno 8 parov - NIKOLI VEČ BLOKADE!)
    // ==========================================
    try {
      // Pustili smo samo 8 najpomembnejših za Forex in Zlato. 
      // S tem NIKOLI ne presežeš limita 8 kreditov na minuto!
      const tdSymbols = [
        "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD",
        "XAU/USD", "XAG/USD", "US30/USD", "NAS100/USD"
      ].join(',');

      const tdUrl = `https://api.twelvedata.com/price?symbol=${tdSymbols}&apikey=${apiKey}`;
      const tdRes = await fetch(tdUrl, { next: { revalidate: 600 } });
      const tdData = await tdRes.json();

      if (tdData.status !== 'error') {
        Object.keys(tdData).forEach(key => {
          finalPrices[key] = tdData[key];
        });
      } else {
        console.error("TwelveData Warning:", tdData.message);
      }
    } catch (tdErr) {
      console.error("TwelveData Fetch Error:", tdErr);
    }

    return NextResponse.json(finalPrices);

  } catch (error) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}