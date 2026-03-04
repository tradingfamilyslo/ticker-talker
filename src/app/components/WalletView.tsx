"use client";
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { supabase } from '@/lib/supabaseClient'; // POPRAVLJENO TUKAJ

export default function WalletView({ userData, darkMode, onPromote, setActiveChat, updateUserBalance, handleStripePurchase }: any) {
  const [account, setAccount] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string>("0.00");

  // --- STATE ZA OBRAZEC ZA IZPLAČILO ---
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({ amount: '', method: 'USDT', address: '' });

  // --- STATE ZA ROČNI VNOS (STRIPE) ---
  const [customGains, setCustomGains] = useState<number>(100);
  const pricePerCoin = 0.10;
  const minEuro = 10;
  const minGains = minEuro / pricePerCoin;

  // --- KONSTANTE ---
  const MY_WALLET_ADDRESS = "0x2E8Cd535f9B2837ba1D9A37BA93ee40395b76484";
  const USDT_CONTRACT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; 
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
      } catch (err) { console.error("Connection error:", err); }
    } else { alert("Please install MetaMask!"); }
  };

  const handleBuy = async (pkg: any) => {
    if (!account) { alert("Please connect your wallet first!"); await connectWallet(); return; }
    const proceed = window.confirm(`Send ${pkg.amount} USDT for ${pkg.gains} GAINS?`);
    if (proceed) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
        const amountInUnits = ethers.parseUnits(pkg.amount.toString(), 6);
        const tx = await usdtContract.transfer(MY_WALLET_ADDRESS, amountInUnits);
        await tx.wait();
        if (updateUserBalance) {
          await updateUserBalance(userData.id, pkg.gains);
          alert("Success! Your GAINS have been synchronized. 🚀");
        }
      } catch (err: any) { alert("Transaction failed."); }
    }
  };

  const handleRequestPayout = () => { setShowWithdrawalModal(true); };

  // --- POSODOBLJENA FUNKCIJA ZA SHRANJEVANJE V SUPABASE ---
  const submitWithdrawalRequest = async () => {
    if (!withdrawalData.amount || !withdrawalData.address) {
      alert("Prosimo, izpolnite vsa polja.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert([
          { 
            user_id: userData.id, 
            amount: parseFloat(withdrawalData.amount), 
            method: withdrawalData.method, 
            address: withdrawalData.address,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      alert(`Zahtevek za ${withdrawalData.amount}$ je bil uspešno oddan. Obdelan bo v 24-48 urah.`);
      setShowWithdrawalModal(false);
      setWithdrawalData({ amount: '', method: 'USDT', address: '' });
    } catch (err: any) {
      console.error("Napaka pri shranjevanju:", err.message);
      alert("Prišlo je do napake pri oddaji zahtevka. Poskusite znova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 relative">
      
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
          <button onClick={connectWallet} className={`px-4 py-2 border rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${account ? 'border-zinc-800 text-zinc-500' : 'border-blue-600/30 text-blue-500 hover:bg-blue-600 hover:text-white'}`}>
            {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : '🦊 Link Wallet'}
          </button>
          <button onClick={onPromote} className="px-6 py-2 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl shadow-lg">🚀 Promote</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-8 rounded-[3rem] border text-center ${darkMode ? 'bg-zinc-900/40 border-blue-500/20 shadow-2xl' : 'bg-white border-blue-200 shadow-xl'}`}>
          <span className="text-3xl mb-4 block">💎</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 opacity-50">Local GAINS</h2>
          <div className="text-5xl font-black font-mono tracking-tighter">{userData.gains_balance || 0}</div>
        </div>

        <div className={`p-8 rounded-[3rem] border text-center ${darkMode ? 'bg-zinc-900/40 border-yellow-500/20 shadow-2xl' : 'bg-white border-yellow-200 shadow-xl'}`}>
          <span className="text-3xl mb-4 block">💰</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 opacity-50">Rewards</h2>
          <div className="text-5xl font-black font-mono tracking-tighter">{userData.earned_balance || 0}</div>
          <button onClick={handleRequestPayout} className="mt-4 px-6 py-2 rounded-xl text-[8px] font-black uppercase bg-yellow-500 text-black hover:bg-yellow-400 transition-transform active:scale-95">Withdrawal</button>
        </div>

        <div className={`p-8 rounded-[3rem] border text-center ${darkMode ? 'bg-zinc-900/40 border-green-500/20 shadow-2xl' : 'bg-white border-green-200 shadow-xl'}`}>
          <span className="text-3xl mb-4 block">💵</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 opacity-50">Wallet USDT</h2>
          <div className="text-4xl font-black font-mono tracking-tighter">${parseFloat(usdtBalance).toFixed(2)}</div>
          <p className="text-[7px] opacity-30 mt-4 uppercase">Polygon Network</p>
        </div>
      </div>

      {/* STRIPE SECTION */}
      <div className={`p-8 rounded-[3rem] border ${darkMode ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-zinc-50 border-zinc-200 shadow-xl'}`}>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className={`text-xs font-black uppercase mb-4 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>💳 Buy with Card / Apple Pay</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-500 block mb-1">Custom Amount (Min. 10€)</label>
                <div className="relative">
                  <input type="number" min={minGains} value={customGains} onChange={(e) => setCustomGains(parseInt(e.target.value) || 0)} className={`w-full p-4 rounded-2xl border-2 text-xl font-black outline-none transition-all ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-blue-500' : 'bg-white border-zinc-200 text-zinc-900 focus:border-blue-600'} ${customGains < minGains ? 'border-red-500/50' : ''}`} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">GAINS</span>
                </div>
              </div>
              <button onClick={() => handleStripePurchase && handleStripePurchase(customGains)} disabled={customGains < minGains} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${customGains >= minGains ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`}>Proceed to Checkout</button>
            </div>
          </div>
          <div className="space-y-4">
            <p className={`text-[10px] uppercase font-black opacity-30 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Accepted Methods</p>
            <div className="flex flex-wrap gap-4 opacity-50 grayscale">
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-5" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-7" alt="Mastercard" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" className="h-6" alt="Apple Pay" />
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
            <button onClick={() => handleBuy(pkg)} className="w-full py-3 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-blue-500 shadow-md">Get for {pkg.amount} USDT</button>
          </div>
        ))}
      </div>

      {/* --- WITHDRAWAL MODAL OVERLAY --- */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-8 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} shadow-2xl animate-in zoom-in-95 duration-200`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Withdrawal Request</h3>
              <button onClick={() => setShowWithdrawalModal(false)} className="text-zinc-500 hover:text-red-500 transition-colors">✕</button>
            </div>

            <div className={`p-4 rounded-2xl mb-6 border border-yellow-500/20 bg-yellow-500/5`}>
              <p className="text-[9px] text-yellow-500 font-black uppercase italic leading-relaxed">
                Notice: All withdrawal requests are processed within 24 to 48 hours after security verification.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black uppercase text-zinc-500 block mb-1 ml-1">Znesek ($)</label>
                <input type="number" value={withdrawalData.amount} onChange={(e) => setWithdrawalData({...withdrawalData, amount: e.target.value})} placeholder="0.00" className={`w-full p-4 rounded-2xl border-2 font-black outline-none transition-all ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-yellow-500' : 'bg-zinc-50 border-zinc-200 text-black focus:border-yellow-600'}`} />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-zinc-500 block mb-1 ml-1">Metoda izplačila</label>
                <select value={withdrawalData.method} onChange={(e) => setWithdrawalData({...withdrawalData, method: e.target.value})} className={`w-full p-4 rounded-2xl border-2 font-black outline-none transition-all ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-yellow-500' : 'bg-zinc-50 border-zinc-200 text-black focus:border-yellow-600'}`}>
                  <option value="USDT">USDT (Polygon/BEP-20)</option>
                  <option value="SEPA">Bančno Nakazilo (SEPA)</option>
                </select>
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-zinc-500 block mb-1 ml-1">Naslov (Wallet ali TRR)</label>
                <textarea value={withdrawalData.address} onChange={(e) => setWithdrawalData({...withdrawalData, address: e.target.value})} placeholder="Vpišite vaš naslov denarnice ali IBAN..." className={`w-full p-4 rounded-2xl border-2 font-black outline-none transition-all h-24 resize-none ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-yellow-500' : 'bg-zinc-50 border-zinc-200 text-black focus:border-yellow-600'}`} />
              </div>
              <button onClick={submitWithdrawalRequest} disabled={isSubmitting} className="w-full py-5 bg-yellow-500 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-yellow-400 transition-all active:scale-95 shadow-lg disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Submit Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}