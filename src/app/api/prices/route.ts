import { NextResponse } from 'next/server';

// Strežnik bo osvežil ceno največ enkrat na 10 minut (600 sekund)
export const revalidate = 600; 

export async function GET() {
  try {
    const apiKey = 'dd2686977779477fbe39d7c87091b3b5'; 
    const symbols = 'BTC/USD,ETH/USD,EUR/USD,XAU/USD';
    const url = `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`;
    
    // Fetch s predpomnjenjem
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();

    if (data.status === 'error') {
      return NextResponse.json({ error: data.message }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}