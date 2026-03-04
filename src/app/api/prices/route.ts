import { NextResponse } from 'next/server';

// Strežnik bo osvežil ceno največ enkrat na 1 minuto za Kripto (Binance), 
// TwelveData pa bo prihranjen zaradi manjšega števila klicev.
export const revalidate = 60; 

export async function GET() {
  try {
    const apiKey = 'dd2686977779477fbe39d7c87091b3b5'; 
    let finalPrices: any = {};

    // ==========================================
    // 1. KRIPTO PREKO BINANCE (Brezplačno, neomejeno)
    // ==========================================
    try {
      const binanceUrl = 'https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT"]';
      const binanceRes = await fetch(binanceUrl, { next: { revalidate: 60 } });
      const binanceData = await binanceRes.json();

      if (Array.isArray(binanceData)) {
        binanceData.forEach((item: any) => {
          // Pretvorimo Binance ime (BTCUSDT) v tvoj format (BTC/USD)
          const cleanSymbol = item.symbol.replace('USDT', '/USD'); 
          finalPrices[cleanSymbol] = { price: parseFloat(item.price).toString() };
        });
      }
    } catch (binanceErr) {
      console.error("Binance Fetch Error:", binanceErr);
    }

    // ==========================================
    // 2. FOREX, ZLATO IN DELNICE PREKO TWELVEDATA
    // ==========================================
    try {
      // Odstranili smo kripto iz tega seznama, da prihranimo ogromno kreditov!
      const tdSymbols = [
        "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD",
        "XAU/USD", "XAG/USD", "US30/USD", "NAS100/USD", "SPX500/USD",
        "AAPL/USD", "TSLA/USD", "NVDA/USD", "AMZN/USD"
      ].join(',');

      const tdUrl = `https://api.twelvedata.com/price?symbol=${tdSymbols}&apikey=${apiKey}`;
      const tdRes = await fetch(tdUrl, { next: { revalidate: 600 } });
      const tdData = await tdRes.json();

      if (tdData.status !== 'error') {
        // Združimo TwelveData cene z Binance cenami
        Object.keys(tdData).forEach(key => {
          finalPrices[key] = tdData[key];
        });
      } else {
        console.error("TwelveData Warning:", tdData.message);
        // Tukaj NE vrnemo errorja, ampak gremo naprej, da stran vsaj pokaže Kripto cene!
      }
    } catch (tdErr) {
      console.error("TwelveData Fetch Error:", tdErr);
    }

    // Vrnemo združene cene nazaj tvoji aplikaciji
    return NextResponse.json(finalPrices);

  } catch (error) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}