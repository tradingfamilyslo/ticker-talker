import { NextResponse } from 'next/server';

// Strežnik bo osvežil ceno največ enkrat na 10 minut
export const revalidate = 600; 

export async function GET() {
  try {
    const apiKey = 'dd2686977779477fbe39d7c87091b3b5'; 
    
    // DODANI VSI PARI: Crypto, Forex, Indices (US30, NAS100), Commodities in Stocks
    const symbols = [
      "BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "BNB/USD",
      "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD",
      "XAU/USD", "XAG/USD", "US30/USD", "NAS100/USD", "SPX500/USD",
      "AAPL/USD", "TSLA/USD", "NVDA/USD", "AMZN/USD"
    ].join(',');

    const url = `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`;
    
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();

    if (data.status === 'error') {
      console.error("TwelveData Error:", data.message);
      return NextResponse.json({ error: data.message }, { status: 403 });
    }

    // TwelveData vrne format { "BTC/USD": { "price": "..." }, ... }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}