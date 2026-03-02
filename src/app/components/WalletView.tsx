"use client";
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function WalletView({ userData, darkMode, onPromote, setActiveChat, updateUserBalance, handleStripePurchase }: any) {
  const [account, setAccount] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string>("0.00");

  // --- NOVO: STATE ZA ROČNI VNOS (STRIPE) ---
  const [customGains, setCustomGains] = useState<number>(100);
  const pricePerCoin = 0.10;
  const minEuro = 10;
  const minGains = minEuro / pricePerCoin;

  // --- KONSTANTE ---
  const MY_WALLET_ADDRESS = "0x2E8Cd535f9B2837ba1D9A37BA93ee40395b76484";
  const USDT_CONTRACT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // USDT na Polygonu
  const USDT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)"
  ];

  const packages = [
    { name: 'Starter Pack', gains: 100, price: '10€', amount: 10, icon: '🌊' },
    { name: 'Pro Rider', gains: 550, price: '50€', amount: 50, icon: '🏄‍♂️' },
    { name: 'Whale Surge', gains: 1200, price: '100€', amount: 100, icon: '🐋' },
  ];

  // --- POVEZAVA Z METAMASKOM ---
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const userAddress = accounts[0];
        setAccount(userAddress);

        const contract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);
        const balance = await contract.balanceOf(userAddress);
        setUsdtBalance(ethers.formatUnits(balance, 6));
      } catch (err) {
        console.error("Connection error:", err);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // --- NAKUP Z USDT ---
  const handleBuy = async (pkg: any) => {
    if (!account) {
      alert("Please connect your wallet first!");
      await connectWallet();
      return;
    }

    const proceed = window.confirm(`Send ${pkg.amount} USDT for ${pkg.gains} GAINS?`);
    
    if (proceed) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);

        // USDT na Polygonu ima 6 decimalov
        const amountInUnits = ethers.parseUnits(pkg.amount.toString(), 6);

        alert("Check MetaMask to confirm transaction...");
        const tx = await usdtContract.transfer(MY_WALLET_ADDRESS, amountInUnits);
        
        alert("Transaction sent! Waiting for network confirmation...");
        await tx.wait();

        // Posodobimo stanje v Supabase
        if (updateUserBalance) {
          await updateUserBalance(userData.id, pkg.gains);
          alert("Success! Your GAINS have been synchronized. 🚀");
        }
      } catch (err: any) {
        console.error("Payment failed:", err);
        alert("Transaction failed. Make sure you have enough USDT and MATIC for gas.");
      }
    }
  };

  const handleRequestPayout = () => {
    if (setActiveChat) {
      setActiveChat('Joza');
      alert(`Payout request sent. Admin will contact you. Wallet: ${account || 'Not linked'}`);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4">
        <div className="flex items-center gap-4">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Terminal Node: {account ? 'Online' : 'Discovery Mode'}
          </h3>
          {account && (
            <div className="px-3 py-1 rounded-full border border-green-500/20 bg-green-500/5 flex items-center gap-2">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">Connected Polygon</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={connectWallet}
            className={`px-4 py-2 border rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
              account ? 'border-zinc-800 text-zinc-500' : 'border-blue-600/30 text-blue-500 hover:bg-blue-600 hover:text-white'
            }`}
          >
            {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : '🦊 Link Wallet'}
          </button>
          <button onClick={onPromote} className="px-6 py-2 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl shadow-lg">
            🚀 Promote
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GAINS */}
        <div className={`p-8 rounded-[3rem] border text-center ${darkMode ? 'bg-zinc-900/40 border-blue-500/20 shadow-2xl' : 'bg-white border-blue-200 shadow-xl'}`}>
          <span className="text-3xl mb-4 block">💎</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 opacity-50">Local GAINS</h2>
          <div className="text-5xl font-black font-mono tracking-tighter">{userData.gains_balance || 0}</div>
        </div>

        {/* EARNED */}
        <div className={`p-8 rounded-[3rem] border text-center ${darkMode ? 'bg-zinc-900/40 border-yellow-500/20 shadow-2xl' : 'bg-white border-yellow-200 shadow-xl'}`}>
          <span className="text-3xl mb-4 block">💰</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 opacity-50">Rewards</h2>
          <div className="text-5xl font-black font-mono tracking-tighter">{userData.earned_balance || 0}</div>
          <button onClick={handleRequestPayout} className="mt-4 px-6 py-2 rounded-xl text-[8px] font-black uppercase bg-yellow-500 text-black hover:bg-yellow-400">Claim USDT</button>
        </div>

        {/* METAMASK USDT */}
        <div className={`p-8 rounded-[3rem] border text-center ${darkMode ? 'bg-zinc-900/40 border-green-500/20 shadow-2xl' : 'bg-white border-green-200 shadow-xl'}`}>
          <span className="text-3xl mb-4 block">💵</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 opacity-50">Wallet USDT</h2>
          <div className="text-4xl font-black font-mono tracking-tighter">${parseFloat(usdtBalance).toFixed(2)}</div>
          <p className="text-[7px] opacity-30 mt-4 uppercase">Polygon Network</p>
        </div>
      </div>

      {/* NOVO: STRIPE VISA / MASTERCARD SECTION */}
      <div className={`p-8 rounded-[3rem] border ${darkMode ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-zinc-50 border-zinc-200 shadow-xl'}`}>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className={`text-xs font-black uppercase mb-4 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
              💳 Buy with Card / Apple Pay
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-500 block mb-1">Custom Amount (Min. 10€)</label>
                <div className="relative">
                  <input 
                    type="number"
                    min={minGains}
                    value={customGains}
                    onChange={(e) => setCustomGains(parseInt(e.target.value) || 0)}
                    className={`w-full p-4 rounded-2xl border-2 text-xl font-black outline-none transition-all ${
                      darkMode ? 'bg-black border-zinc-800 text-white focus:border-blue-500' : 'bg-white border-zinc-200 text-zinc-900 focus:border-blue-600'
                    } ${customGains < minGains ? 'border-red-500/50' : ''}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">GAINS</span>
                </div>
                {customGains < minGains && (
                  <p className="text-[8px] text-red-500 font-bold uppercase mt-2 italic">Minimum purchase is 10 €</p>
                )}
              </div>
              <div className={`p-4 rounded-2xl flex justify-between items-center ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <span className="text-[9px] font-black uppercase text-blue-500">Total Price:</span>
                <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                  {(customGains * pricePerCoin).toFixed(2)} €
                </span>
              </div>
              <button 
                onClick={() => handleStripePurchase && handleStripePurchase(customGains)}
                disabled={customGains < minGains}
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                  customGains >= minGains 
                    ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95' 
                    : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                }`}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <p className={`text-[10px] uppercase font-black opacity-30 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Accepted Methods</p>
            <div className="flex flex-wrap gap-4 opacity-50 grayscale">
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-5" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-7" alt="Mastercard" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" className="h-6" alt="Apple Pay" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" className="h-6" alt="Google Pay" />
            </div>
            <div className="p-4 rounded-2xl border border-dashed border-zinc-500/30">
              <p className={`text-[9px] leading-relaxed italic ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Fast & Secure: Credits are applied to your terminal identity immediately after payment verification via Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CRYPTO PACKAGES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <div key={pkg.name} className={`p-6 rounded-[2rem] border transition-all hover:scale-[1.02] ${darkMode ? 'bg-zinc-900/20 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <span className="text-2xl mb-2 block">{pkg.icon}</span>
            <div className="text-2xl font-black text-blue-500 mb-4">{pkg.gains} GAINS</div>
            <button onClick={() => handleBuy(pkg)} className="w-full py-3 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-blue-500 shadow-md">
              Get for {pkg.amount} USDT
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}