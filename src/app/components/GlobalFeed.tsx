"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface GlobalFeedProps {
  posts: any[];
  userData: any;
  handleVote: (id: any, type: 'bull' | 'bear') => void;
  handleFollow: (alias: string) => void;
  darkMode: boolean; 
  onVisitProfile: (alias: string) => void;
  handleDeletePost: (id: string) => void;
  handleUnlock?: (id: string, price: number) => void; // DODANO: Funkcija za odklep
}

export default function GlobalFeed({ 
  posts, 
  userData, 
  handleVote, 
  handleFollow, 
  darkMode,
  onVisitProfile,
  handleDeletePost,
  handleUnlock // DODANO
}: GlobalFeedProps) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [lastPostId, setLastPostId] = useState<number | null>(null);
  
  // --- STANJE ZA KOMENTARJE ---
  const [commentsMap, setCommentsMap] = useState<{[key: string]: any[]}>({});
  const [openComments, setOpenComments] = useState<{[key: string]: boolean}>({});
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});
  
  const safePosts = Array.isArray(posts) ? posts : [];

  useEffect(() => {
    if (safePosts.length > 0) {
      setLastPostId(safePosts[0].id);
      const timer = setTimeout(() => setLastPostId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [safePosts.length]); 

  // --- FUNKCIJA ZA PRIDOBIVANJE KOMENTARJEV ---
  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setCommentsMap(prev => ({ ...prev, [postId]: data }));
    }
  };

  // --- FUNKCIJA ZA POŠILJANJE KOMENTARJA ---
  const submitComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;

    const { error } = await supabase.from('post_comments').insert([{
      post_id: postId,
      user_id: userData.id,
      author_alias: userData.alias,
      text: text.trim()
    }]);

    if (!error) {
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      fetchComments(postId); 
    }
  };

  const toggleComments = (postId: string) => {
    if (!openComments[postId]) {
      fetchComments(postId);
    }
    setOpenComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleUserClick = (e: React.MouseEvent, alias: string) => {
    e.preventDefault();
    e.stopPropagation(); // Ključno: prepreči, da bi klik zaznalo karkoli pod gumbom
    if (alias && onVisitProfile) {
      onVisitProfile(alias);
    }
  };

  const handleVoteClick = (postId: any, voteType: 'bull' | 'bear') => {
    handleVote(postId, voteType);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full overflow-x-hidden">
      
      {/* NETWORK STATUS DIVIDER */}
      <div className="flex items-center gap-4 px-2 md:px-6 mb-4">
        <div className={`h-[1px] flex-1 ${darkMode ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
        <div className="flex flex-col items-center">
            <h3 className={`text-[9px] font-black uppercase tracking-[0.4em] italic ${
            darkMode ? 'text-zinc-700' : 'text-zinc-400'
            }`}>
            Network Signals
            </h3>
            <span className="text-[6px] opacity-30 font-mono tracking-widest uppercase">Encrypted Stream</span>
        </div>
        <div className={`h-[1px] flex-1 ${darkMode ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
      </div>

      {safePosts.length === 0 ? (
        <div className={`text-center py-20 border border-dashed rounded-[3rem] ${
          darkMode ? 'border-zinc-900 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/50'
        }`}>
          <div className="flex flex-col items-center gap-3">
            <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${
                darkMode ? 'border-blue-500/20' : 'border-blue-500/10'
            }`} />
            <p className={`${darkMode ? 'text-zinc-800' : 'text-zinc-400'} text-[9px] uppercase font-black tracking-[0.3em]`}>
              Synchronizing Nodes...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 w-full">
          {safePosts.map((post, index) => {
            const isFollowing = (userData?.following || []).includes(post.authorAlias);
            const isMe = post.authorAlias === userData?.alias;
            const isMyPost = post.user_id === userData?.id;
            const isNew = post.id === lastPostId;

            // --- PREMIUM LOGIKA ---
            const showBlur = post.is_premium && !isMe && !post.is_unlocked;

            // --- LOGIKA ZA PAMETNO PIKO ---
            const postTime = post.created_at ? new Date(post.created_at).getTime() : 0;
            const isActive = Date.now() - postTime < 3600000; 

            return (
              <div 
                key={post.id || index} 
                className={`group relative p-4 md:p-5 border rounded-[2rem] transition-all duration-700 ${
                  isNew 
                    ? (darkMode ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'bg-blue-50 border-blue-200 shadow-lg scale-[1.01]')
                    : (darkMode ? 'bg-zinc-900/10 border-zinc-800/40 hover:border-blue-500/30' : 'bg-white border-zinc-100 shadow-sm hover:shadow-md')
                } backdrop-blur-md overflow-hidden`}
              >
                 {isMyPost && (
                   <button 
                     onClick={(e) => { 
                       e.stopPropagation(); 
                       handleDeletePost(post.id); 
                     }}
                     className="absolute top-4 right-4 z-20 text-zinc-500 hover:text-red-500 transition-colors p-2 bg-black/10 rounded-full"
                     title="Delete Signal"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                     </svg>
                   </button>
                 )}

                 <div className="flex flex-col md:flex-row gap-4 md:gap-5">
                   
                   {post.image && !showBlur && (
                     <div 
                       onClick={() => setZoomImage(post.image)}
                       className={`relative shrink-0 w-full md:w-36 h-48 md:h-36 rounded-[1.5rem] overflow-hidden border cursor-zoom-in group/img ${
                         darkMode ? 'border-zinc-800/50 bg-black/20' : 'border-zinc-100 bg-zinc-50'
                       }`}
                     >
                       <img 
                         src={post.image} 
                         alt="Market Intel" 
                         className="w-full h-full object-cover opacity-90 group-hover/img:opacity-100 transition-all duration-700" 
                       />
                       <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-[6px] text-white font-black uppercase tracking-tighter">Live Intel</span>
                       </div>
                     </div>
                   )}

                   {post.image && showBlur && (
                     <div className={`relative shrink-0 w-full md:w-36 h-48 md:h-36 rounded-[1.5rem] overflow-hidden border ${
                       darkMode ? 'border-zinc-800/50 bg-black/20' : 'border-zinc-100 bg-zinc-50'
                     }`}>
                       <img 
                         src={post.image} 
                         alt="Locked Intel" 
                         className="w-full h-full object-cover opacity-20 blur-xl pointer-events-none select-none" 
                       />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl opacity-50">🔒</span>
                       </div>
                     </div>
                   )}

                   <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            
                            <div 
                                onClick={(e) => handleUserClick(e, post.authorAlias)}
                                className="flex items-center gap-2 cursor-pointer group/alias relative z-30"
                            >
                              <div className={`w-6 h-6 rounded-lg overflow-hidden border ${darkMode ? 'border-zinc-700' : 'border-zinc-300'}`}>
                                {post.authorAvatar ? (
                                  <img src={post.authorAvatar} alt="Av" className="w-full h-full object-cover" />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center text-[10px] ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                                    👤
                                  </div>
                                )}
                              </div>

                              <span className="text-sm filter drop-shadow-sm">
                                {post.authorCountry || '🏳️'}
                              </span>
                              
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${
                                  darkMode ? 'text-blue-400 group-hover/alias:text-blue-300' : 'text-blue-600 group-hover/alias:text-blue-800'
                                } transition-colors`}>
                                  {post.authorAlias || "Anonymous"} 
                                </span>
                                
                                {isActive ? (
                                  <div className="relative flex h-1.5 w-1.5 items-center justify-center">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                  </div>
                                ) : (
                                  <div className={`h-1 w-1 rounded-full ${darkMode ? 'bg-zinc-800' : 'bg-zinc-300'}`}></div>
                                )}
                              </div>
                            </div>

                            {!isMe && (
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFollow(post.authorAlias);
                                }}
                                className={`text-[7px] px-2 py-1 rounded-full uppercase font-black tracking-tighter transition-all ${
                                  isFollowing 
                                    ? (darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400')
                                    : 'bg-blue-600 text-white'
                                }`}
                              >
                                {isFollowing ? 'Following' : '+ Follow'}
                              </button>
                            )}
                          </div>

                          <div className={`hidden sm:block text-[7px] font-mono px-2 py-0.5 rounded border ${
                            isNew ? 'border-blue-500 text-blue-500 animate-pulse' : (darkMode ? 'border-zinc-800 text-zinc-700' : 'border-zinc-200 text-zinc-300')
                          }`}>
                            {isNew ? 'NEW_SIGNAL' : `SIG_${post.id ? post.id.toString().slice(-4) : 'NULL'}`}
                          </div>
                        </div>
                        
                        {showBlur ? (
                          <div className={`relative mt-2 mb-4 p-6 rounded-2xl border flex flex-col items-center justify-center text-center overflow-hidden ${
                            darkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="absolute inset-0 backdrop-blur-md z-0"></div>
                            <div className="z-10 flex flex-col items-center">
                              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-yellow-500/40">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-black">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                              </div>
                              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Premium Intel Locked</p>
                              
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (handleUnlock) {
                                    handleUnlock(post.id, post.price_bulls); 
                                  } else {
                                    alert("Nakup bo kmalu na voljo!");
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
                            {/* PRIKAZ SIGNALA ZA GLOBAL FEED */}
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
                            <p className={`text-xs md:text-[13px] font-medium leading-relaxed tracking-tight mb-4 break-words ${
                              darkMode ? 'text-zinc-300' : 'text-zinc-700'
                            }`}>
                              {post.text}
                            </p>
                          </div>
                        )}
                      </div>

                      {!showBlur && (
                        <>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <button 
                              onClick={() => handleVoteClick(post.id, 'bull')}
                              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-4 py-3 md:py-1.5 rounded-xl border transition-all active:scale-90 ${
                                darkMode 
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-green-500' 
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:text-green-600'
                              }`}
                            >
                              <span className="text-[9px] font-black uppercase tracking-tighter">Bullish</span>
                              <span className="text-[10px] font-mono font-bold text-green-500">{post.bulls || 0}</span>
                            </button>
                            
                            <button 
                              onClick={() => handleVoteClick(post.id, 'bear')}
                              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-4 py-3 md:py-1.5 rounded-xl border transition-all active:scale-90 ${
                                darkMode 
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-red-500' 
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:text-green-600'
                              }`}
                            >
                              <span className="text-[9px] font-black uppercase tracking-tighter">Bearish</span>
                              <span className="text-[10px] font-mono font-bold text-red-500">{post.bears || 0}</span>
                            </button>

                            <button 
                              onClick={() => toggleComments(post.id)}
                              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-1.5 rounded-xl border transition-all ${
                                openComments[post.id] 
                                  ? (darkMode ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600')
                                  : (darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-blue-400' : 'bg-white border-zinc-200 text-zinc-600 hover:text-blue-600')
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48L4.32 20.587A.5.5 0 0 0 4.807 21h.023l2.87-.82A8.956 8.956 0 0 0 12 20.25Z" />
                              </svg>
                              <span className="text-[9px] font-black uppercase tracking-tighter">Intel Feed</span>
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const shareText = `Check out this signal by ${post.authorAlias} on GAIN WAVE! 📈`;
                                const shareUrl = window.location.href;
                                if (navigator.share) {
                                  navigator.share({ title: 'GAIN WAVE Signal', text: shareText, url: shareUrl });
                                } else {
                                  navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                                  alert("Link copied!");
                                }
                              }}
                              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-1.5 rounded-xl border transition-all active:scale-90 ${
                                darkMode 
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' 
                                    : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                              </svg>
                              <span className="text-[9px] font-black uppercase tracking-tighter">Share</span>
                            </button>
                          </div>

                          {/* SEZNAM KOMENTARJEV ZNOTRAJ KARTICE */}
                          {openComments[post.id] && (
                            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'} animate-in slide-in-from-top-2 duration-300`}>
                              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {commentsMap[post.id]?.length > 0 ? commentsMap[post.id].map((comm, idx) => (
                                  <div key={comm.id || idx} className={`p-3 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-zinc-50'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[9px] font-black uppercase text-blue-500">{comm.author_alias}</span>
                                      <span className="text-[7px] opacity-40">{new Date(comm.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className={`text-[11px] ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{comm.text}</p>
                                  </div>
                                )) : (
                                  <p className="text-[8px] uppercase text-center opacity-30 italic py-4">No node feedback yet...</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="Add intel update..."
                                  value={commentInputs[post.id] || ''}
                                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                                  className={`flex-1 px-4 py-2 rounded-full text-[10px] outline-none border ${
                                    darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-200'
                                  }`}
                                />
                                <button 
                                  onClick={() => submitComment(post.id)}
                                  className="px-4 py-2 bg-blue-600 text-white text-[9px] font-black uppercase rounded-full hover:bg-blue-500"
                                >
                                  Send
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                   </div>
                 </div>

                 <div className={`absolute top-0 right-0 w-8 h-8 border-t border-r rounded-tr-[2rem] transition-opacity duration-500 ${
                    isNew ? 'opacity-100 border-blue-500' : 'opacity-0 group-hover:opacity-100 border-blue-500/20'
                 }`} />
              </div>
            );
          })}
        </div>
      )}

      {zoomImage && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-6 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10" alt="Intel" />
        </div>
      )}
      <div className="h-10" />
    </div>
  );
}