"use client";
import React, { useState } from 'react';

interface FeedViewProps {
  userData: any;
  posts: any[];
  onBack: () => void;
  // POPRAVEK: Omogočimo, da gumb pošlje podatke o signalu naprej
  handleAddPost: (signalData?: any) => void; 
  newPost: string;
  setNewPost: (val: string) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedImage: string | null;
  darkMode: boolean; 
  handleVote: (id: string, type: 'bull' | 'bear') => void;
  isOwnProfile?: boolean; 
  handleDeletePost: (id: string) => void; 
  handleUnlock?: (id: string, price: number) => void; 
  isPremium?: boolean; 
  setIsPremium?: (val: boolean) => void;
  priceBulls?: number;
  setPriceBulls?: (val: number) => void;
}

export default function FeedView({ 
  userData, 
  posts, 
  onBack, 
  handleAddPost, 
  newPost, 
  setNewPost, 
  handleImageChange, 
  selectedImage,
  darkMode,
  handleVote,
  isOwnProfile = true,
  handleDeletePost,
  handleUnlock,
  isPremium = false,
  setIsPremium,
  priceBulls = 5,
  setPriceBulls
}: FeedViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // --- NOVI STATE-I ZA SIGNAL OBRAZEC ---
  const [isSignalMode, setIsSignalMode] = useState(false);
  const [signalPair, setSignalPair] = useState("");
  const [signalDir, setSignalDir] = useState("LONG");
  const [signalEntry, setSignalEntry] = useState("");
  const [signalSL, setSignalSL] = useState("");
  const [signalTP, setSignalTP] = useState("");

  const safePosts = Array.isArray(posts) ? posts : [];
  const totalBulls = safePosts.reduce((sum, p) => sum + (p.bulls || 0), 0);
  const totalBears = safePosts.reduce((sum, p) => sum + (p.bears || 0), 0);
  const totalVotes = totalBulls + totalBears;
  const pulsePct = totalVotes > 0 ? (totalBulls / totalVotes) * 100 : 50;

  const filteredPosts = safePosts.filter(post => 
    post.text && post.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // FUNKCIJA ZA ZDRUŽITEV PODATKOV IN OBJAVO
  const handlePublishClick = () => {
    if (isSignalMode) {
      if (!signalPair || !signalEntry || !signalSL || !signalTP) {
        alert("Please fill in all signal fields (Pair, Entry, SL, TP).");
        return;
      }
      handleAddPost({
        pair: signalPair.toUpperCase(),
        direction: signalDir,
        entry: parseFloat(signalEntry),
        sl: parseFloat(signalSL),
        tp: parseFloat(signalTP)
      });
    } else {
      handleAddPost(); // Navadna objava
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* 1. NAVIGACIJA */}
      <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-500 ${
        darkMode ? 'bg-zinc-900/20 border-zinc-800/40 backdrop-blur-md' : 'bg-zinc-50 border-zinc-200 shadow-sm'
      }`}>
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBack(); }}
          className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-90 ${
            darkMode 
              ? 'bg-zinc-900 border-zinc-800 text-blue-500 hover:border-blue-500/50' 
              : 'bg-white border-zinc-200 text-blue-600 hover:shadow-md'
          }`}
        >
          ←
        </button>
        
        <div className="flex items-center gap-4 px-1">
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] opacity-40 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
             {isOwnProfile ? 'Terminal Master' : `Node: ${userData?.alias || 'Anonymous'}`}
          </span>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBack(); }}
            className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-transparent rounded-xl ${
              darkMode ? 'text-zinc-500 hover:text-blue-500' : 'text-zinc-500 hover:text-blue-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            {isOwnProfile ? 'Exit Terminal' : 'Back'}
          </button>
        </div>
      </div>

      {/* --- PULSE RANK --- */}
      <div className={`p-5 rounded-[2rem] border transition-all duration-500 ${
        darkMode ? 'bg-zinc-900/40 border-zinc-800 shadow-xl' : 'bg-white border-zinc-100 shadow-sm'
      }`}>
        <div className="flex justify-between items-end mb-3 px-1">
          <div className="flex flex-col">
            <span className="text-[7px] uppercase opacity-40 tracking-widest font-bold">Accuracy</span>
            <span className="text-[10px] font-black text-green-500 tracking-tighter uppercase">
              BULL {pulsePct.toFixed(1)}%
            </span>
          </div>
          <div className="text-center">
            <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>
              TERMINAL PULSE
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[7px] uppercase opacity-40 tracking-widest font-bold">Sentiment</span>
            <span className="text-[10px] font-black text-red-500 tracking-tighter uppercase">
              BEAR {(100 - pulsePct).toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className={`relative w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
          <div className="absolute inset-0 bg-red-600/30" />
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-300 transition-all duration-1000 ease-in-out"
            style={{ width: `${pulsePct}%` }}
          />
          <div 
            className="absolute top-0 h-full w-1 bg-white shadow-[0_0_10px_#fff] z-10 transition-all duration-1000"
            style={{ left: `calc(${pulsePct}% - 1px)` }}
          />
        </div>
      </div>

      {/* 2. BROADCAST MODUL */}
      {isOwnProfile && (
        <div className={`border rounded-[2rem] p-5 transition-all duration-500 flex flex-col gap-4 ${
          darkMode 
            ? 'bg-zinc-900/40 border-blue-500/20 shadow-2xl' 
            : 'bg-white border-zinc-200 shadow-lg'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${darkMode ? 'bg-blue-500' : 'bg-blue-600'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-blue-500/70' : 'text-blue-600'}`}>
                Initial Broadcast
              </span>
            </div>
          </div>

          {/* --- NOVO: OKENCE ZA VNOS SIGNALA --- */}
          {isSignalMode && (
            <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                <label className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Pair</label>
                <input type="text" placeholder="BTC/USD" value={signalPair} onChange={e => setSignalPair(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-mono font-bold uppercase py-1 ${darkMode ? 'border-zinc-700 text-white focus:border-blue-500' : 'border-zinc-300 text-zinc-900 focus:border-blue-500'}`} />
              </div>
              <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                <label className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Direction</label>
                <select value={signalDir} onChange={e => setSignalDir(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-black py-1 cursor-pointer ${darkMode ? 'border-zinc-700' : 'border-zinc-300'} ${signalDir === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                  <option value="LONG">🟢 LONG</option>
                  <option value="SHORT">🔴 SHORT</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-blue-500">Entry</label>
                <input type="number" placeholder="0.00" value={signalEntry} onChange={e => setSignalEntry(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-mono py-1 ${darkMode ? 'border-zinc-700 text-white focus:border-blue-500' : 'border-zinc-300 text-zinc-900 focus:border-blue-500'}`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-red-500">Stop Loss</label>
                <input type="number" placeholder="0.00" value={signalSL} onChange={e => setSignalSL(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-mono py-1 ${darkMode ? 'border-zinc-700 text-white focus:border-red-500' : 'border-zinc-300 text-zinc-900 focus:border-red-500'}`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-green-500">Take Profit</label>
                <input type="number" placeholder="0.00" value={signalTP} onChange={e => setSignalTP(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-mono py-1 ${darkMode ? 'border-zinc-700 text-white focus:border-green-500' : 'border-zinc-300 text-zinc-900 focus:border-green-500'}`} />
              </div>
            </div>
          )}

          <textarea 
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={isSignalMode ? "Additional intel or setup logic (optional)..." : "Input signal data..."}
            className={`w-full bg-transparent border-none focus:ring-0 text-sm md:text-base font-light italic resize-none h-20 outline-none transition-colors ${
              darkMode ? 'text-zinc-100 placeholder:text-zinc-700' : 'text-zinc-900 placeholder:text-zinc-300'
            }`}
          />

          <div className={`flex flex-col lg:flex-row items-start lg:items-center justify-between mt-2 pt-4 border-t gap-4 ${darkMode ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer group flex items-center gap-2 relative">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                  darkMode ? 'bg-zinc-800/50 border-zinc-700 hover:border-blue-500' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                }`}>
                  <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
              </label>

              {selectedImage && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-blue-500 animate-pulse">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
               
               {/* --- NOVI GUMB ZA IZBIRO: POST vs SIGNAL --- */}
               <div className={`flex p-1 rounded-xl border transition-all ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                 <button 
                    type="button"
                    onClick={() => setIsSignalMode(false)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      !isSignalMode ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    💬 Post
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsSignalMode(true)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      isSignalMode ? 'bg-green-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    🎯 Signal
                  </button>
               </div>

               {/* --- OBSTOJEČI GUMB: FREE vs PREM --- */}
               {setIsPremium && (
                 <div className={`flex p-1 rounded-xl border transition-all ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                   <button 
                      type="button"
                      onClick={() => setIsPremium(false)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        !isPremium 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      🔓 Free
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsPremium(true)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        isPremium 
                          ? 'bg-yellow-500 text-black shadow-md' 
                          : 'text-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      🔒 Prem
                    </button>
                 </div>
               )}

               {isPremium && setPriceBulls && (
                 <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                   <input 
                     type="number" 
                     min="0"
                     value={priceBulls === 0 ? "" : priceBulls} 
                     placeholder="0"
                     onChange={(e) => setPriceBulls(Math.max(0, parseInt(e.target.value) || 0))}
                     onFocus={(e) => e.target.select()}
                     className={`w-12 bg-transparent text-center text-xs font-bold text-yellow-500 outline-none`}
                   />
                   <span className="text-[8px] font-black uppercase text-yellow-500 tracking-tighter">GAINS</span>
                 </div>
               )}

              <button 
                onClick={handlePublishClick}
                disabled={(!newPost.trim() && !selectedImage && !isSignalMode) || (isSignalMode && (!signalPair || !signalEntry || !signalSL || !signalTP))}
                className={`flex-1 lg:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                  ((newPost.trim() || selectedImage) || (isSignalMode && signalPair))
                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20' 
                    : (darkMode ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed')
                }`}
              >
                Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. LOG SEZNAM */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 px-4">
          <h3 className={`text-[9px] font-black uppercase tracking-[0.4em] italic ${
            darkMode ? 'text-zinc-700' : 'text-zinc-400'
          }`}>
            {isOwnProfile ? 'Local Node Logs' : `${userData?.alias || 'Node'}'s Transmissions`}
          </h3>
          <div className={`h-[1px] flex-1 ${darkMode ? 'bg-zinc-900/50' : 'bg-zinc-100'}`} />
        </div>

        <div className="grid grid-cols-1 gap-4 pb-10">
          {filteredPosts.map((post, idx) => {
            const showBlur = !isOwnProfile && post.is_premium && !post.is_unlocked;

            return (
              <div key={post.id || idx} className={`group p-5 border rounded-[2rem] transition-all duration-300 relative overflow-hidden ${
                darkMode 
                  ? 'bg-zinc-900/10 border-zinc-800/30 hover:border-blue-500/20' 
                  : 'bg-white border-zinc-200 hover:shadow-md'
              }`}>
                
                {isOwnProfile && (
                  <button 
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      handleDeletePost(post.id); 
                    }} 
                    className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 p-2 bg-black/10 rounded-full z-20"
                    title="Delete Signal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}

                <div className="flex flex-col md:flex-row gap-5">
                  {post.image && !showBlur && (
                    <div 
                      onClick={(e) => { e.stopPropagation(); setZoomImage(post.image); }}
                      className={`shrink-0 w-full md:w-40 h-48 md:h-40 rounded-2xl overflow-hidden border cursor-zoom-in ${
                        darkMode ? 'border-zinc-800' : 'border-zinc-100'
                      }`}
                    >
                      <img src={post.image} alt="Signal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                  )}

                  {post.image && showBlur && (
                    <div className={`shrink-0 w-full md:w-40 h-48 md:h-40 rounded-2xl overflow-hidden border relative ${
                      darkMode ? 'border-zinc-800 bg-black/20' : 'border-zinc-100 bg-zinc-50'
                    }`}>
                       <img src={post.image} alt="Locked" className="w-full h-full object-cover opacity-20 blur-xl pointer-events-none select-none" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl opacity-50">🔒</span>
                       </div>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-tighter ${darkMode ? 'text-blue-500/80' : 'text-blue-600'}`}>
                          {post.authorAlias} {post.is_premium && <span className="text-yellow-500 ml-1">💎 PREM</span>}
                        </span>
                        <span className="text-[7px] font-mono opacity-30 uppercase">{post.time}</span>
                      </div>
                      
                      {showBlur ? (
                          <div className={`relative mt-2 mb-4 p-6 rounded-2xl border flex flex-col items-center justify-center text-center overflow-hidden ${
                            darkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="absolute inset-0 backdrop-blur-md z-0"></div>
                            <div className="z-10 flex flex-col items-center">
                              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Premium Intel Locked</p>
                              <button 
                                onClick={(e) => { 
                                  e.preventDefault();
                                  e.stopPropagation(); 
                                  if (handleUnlock) {
                                    handleUnlock(post.id, post.price_bulls); 
                                  } else {
                                    alert("Nakup kovancev bo kmalu na voljo!");
                                  }
                                }}
                                className="px-6 py-2 bg-yellow-500 text-black text-[9px] font-black uppercase rounded-full hover:bg-yellow-400 transition-all shadow-lg"
                              >
                                Unlock for {post.price_bulls || 5} GAINS 💎
                              </button>
                            </div>
                          </div>
                      ) : (
                        <div>
                          {/* PRIKAZ SIGNALA, ČE JE BIL OBJAVLEN KOT SIGNAL */}
                          {post.pair && (
                             <div className={`mt-2 mb-4 flex flex-wrap gap-2 p-3 rounded-xl border ${darkMode ? 'bg-black/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                                <div className="flex flex-col pr-4 border-r border-zinc-700/30">
                                   <span className="text-[7px] uppercase font-black text-zinc-500">Pair</span>
                                   <span className={`text-[11px] font-black font-mono ${darkMode ? 'text-white' : 'text-black'}`}>{post.pair}</span>
                                </div>
                                <div className="flex flex-col pr-4 border-r border-zinc-700/30">
                                   <span className="text-[7px] uppercase font-black text-zinc-500">Dir</span>
                                   <span className={`text-[11px] font-black ${post.direction === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                                      {post.direction === 'LONG' ? '🟢 LONG' : '🔴 SHORT'}
                                   </span>
                                </div>
                                <div className="flex flex-col pr-4 border-r border-zinc-700/30">
                                   <span className="text-[7px] uppercase font-black text-blue-500">Entry</span>
                                   <span className={`text-[11px] font-mono ${darkMode ? 'text-white' : 'text-black'}`}>{post.entry}</span>
                                </div>
                                <div className="flex flex-col pr-4 border-r border-zinc-700/30">
                                   <span className="text-[7px] uppercase font-black text-red-500">SL</span>
                                   <span className={`text-[11px] font-mono ${darkMode ? 'text-white' : 'text-black'}`}>{post.sl}</span>
                                </div>
                                <div className="flex flex-col">
                                   <span className="text-[7px] uppercase font-black text-green-500">TP</span>
                                   <span className={`text-[11px] font-mono ${darkMode ? 'text-white' : 'text-black'}`}>{post.tp}</span>
                                </div>
                             </div>
                          )}
                          <p className={`text-sm md:text-base font-light leading-relaxed italic break-words ${darkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>
                            "{post.text}"
                          </p>
                        </div>
                      )}
                    </div>

                    {!showBlur && (
                      <div className="flex items-center gap-2 mt-6">
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote(post.id, 'bull'); }}
                          className={`flex-1 md:flex-none py-2 px-6 rounded-xl border text-[9px] font-black transition-all ${
                            darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-green-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:text-green-600'
                          }`}
                        >
                          BULLISH {post.bulls > 0 && `// ${post.bulls}`}
                        </button>
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote(post.id, 'bear'); }}
                          className={`flex-1 md:flex-none py-2 px-6 rounded-xl border text-[9px] font-black transition-all ${
                            darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-red-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:text-red-600'
                          }`}
                        >
                          BEARISH {post.bears > 0 && `// ${post.bears}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {zoomImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" alt="Zoom" />
        </div>
      )}
    </div>
  );
}