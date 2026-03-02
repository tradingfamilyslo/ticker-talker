import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { apiKey, apiSecret } = await req.json();

    if (!apiKey || !apiSecret) return NextResponse.json({ error: 'Missing keys' }, { status: 400 });

    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    // Klic na Binance API za stanje računa
    const response = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    
    const data = await response.json();

    // Binance vrne seznam vseh kovancev. Izračunamo skupno vrednost (za poenostavitev vrnemo 24h PnL če bi ga imeli)
    // Ker Binance zahteva več klicev za točen PnL, za začetek vrnemo uspeh povezave
    return NextResponse.json({
      success: !!data.balances,
      accountType: data.accountType,
      totalAssets: data.balances ? data.balances.length : 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Binance API Error' }, { status: 500 });
  }
}