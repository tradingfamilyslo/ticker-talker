"use client";
import React from 'react';
import PriceTicker from './PriceTicker';

export default function ProfileSidebar({ 
  userData, 
  setUserData, 
  isEditing, 
  setIsEditing, 
  handleSaveProfile, 
  handleLogout, 
  setActiveTab,
  activeTab,
  darkMode,
  messages = [], 
  setActiveChat,
  
  followersCount = 0,
  followingCount = 0,
  onFollowersClick,
  onFollowingClick,
  hasNotification,
  isOwnProfile,
  
  setViewingAlias,

  activeSubTab,
  setActiveSubTab,

  onOpenRiskCalc,
  handleSubscribeMonthly 
}: any) {
  
  // Zagotovimo, da imamo varne objekte
  const safeUserData = userData || {};

  const countries = [
    { name: 'Slovenia', flag: '🇸🇮' },
    { name: 'USA', flag: '🇺🇸' },
    { name: 'UK', flag: '🇬🇧' },
    { name: 'Germany', flag: '🇩🇪' },
    { name: 'Austria', flag: '🇦🇹' },
    { name: 'Croatia', flag: '🇭🇷' },
    { name: 'Italy', flag: '🇮🇹' },
    { name: 'France', flag: '🇫🇷' },
    { name: 'Switzerland', flag: '🇨🇭' },
    { name: 'UAE', flag: '🇦🇪' }
  ];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserData((prev: any) => ({ 
          ...prev, 
          avatar: event.target?.result as string 
        }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const activeContacts = messages && messages.length > 0 
    ? Array.from(new Set(messages.map((m: any) => 
        m.from_alias === safeUserData.alias ? m.to_alias : m.from_alias
      ))) 
    : [];

  const getUnreadCount = (contact: string) => {
    if (!messages) return 0;
    return messages.filter((m: any) => 
      m.from_alias === contact && 
      m.to_alias === safeUserData.alias && 
      m.is_read === false
    ).length;
  };

  return (
    <div className="md:col-span-1 space-y-4 h-fit sticky top-6 transition-all duration-500">
      <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${
        darkMode 
          ? 'border-zinc-800 bg-zinc-900/40 shadow-2xl' 
          : 'border-zinc-200 bg-white shadow-xl shadow-zinc-200/50'
      }`}>
        
        {/* AVATAR */}
        {safeUserData.avatar ? (
          <img 
            src={safeUserData.avatar} 
            className={`w-24 h-24 rounded-2xl mb-6 object-cover border-2 shadow-lg transition-all ${
              darkMode ? 'border-blue-500 shadow-blue-500/20' : 'border-blue-600 shadow-blue-600/10'
            }`} 
            alt="Avatar" 
          />
        ) : (
          <div className={`w-20 h-20 rounded-2xl mb-6 flex items-center justify-center text-3xl shadow-lg transition-all ${
            darkMode ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'
          }`}>👤</div>
        )}
        
        {isEditing ? (
          <div className="space-y-4 animate-in fade-in duration-300 text-left">
            <div>
              <label className={`block text-[8px] uppercase font-black mb-2 ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Profile Photo
              </label>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-[10px] text-zinc-500 w-full" />
            </div>
            
            <input 
              type="text" 
              placeholder="Alias"
              value={safeUserData.alias || ""} 
              onChange={(e) => setUserData({...safeUserData, alias: e.target.value})} 
              className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors ${
                darkMode ? 'bg-black border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
              }`} 
            />

            <div className="grid grid-cols-2 gap-2">
              <select 
                value={safeUserData.market || "Crypto"} 
                onChange={(e) => setUserData({...safeUserData, market: e.target.value})}
                className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors ${
                  darkMode ? 'bg-black border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <option>Crypto</option>
                <option>Forex</option>
                <option>Gold (XAU)</option>
                <option>Indices</option>
              </select>

              <select 
                value={safeUserData.country || "🇸🇮"} 
                onChange={(e) => setUserData({...safeUserData, country: e.target.value})}
                className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors ${
                  darkMode ? 'bg-black border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                {countries.map(c => (
                  <option key={c.flag} value={c.flag}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            <textarea 
              placeholder="Short bio..."
              value={safeUserData.bio || ""} 
              onChange={(e) => setUserData({...safeUserData, bio: e.target.value})} 
              className={`w-full border rounded-lg px-3 py-2 text-xs outline-none h-20 resize-none transition-colors ${
                darkMode ? 'bg-black border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
              }`}
            />

            <div className="animate-in slide-in-from-top-2 duration-300 pt-1">
              <label className={`block text-[8px] uppercase font-black mb-1 ml-1 ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`}>Monthly Subscription Price (GAINS)</label>
              <input 
                type="number" 
                min="0"
                placeholder="0"
                value={safeUserData.subscription_price === 0 || safeUserData.subscription_price === undefined ? "" : safeUserData.subscription_price} 
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  if (val >= 0) setUserData({...safeUserData, subscription_price: val});
                }}
                onFocus={(e) => e.target.select()}
                className={`w-full border rounded-lg px-3 py-2 text-[10px] font-mono outline-none transition-colors ${
                  darkMode ? 'bg-yellow-500/5 border-yellow-500/30 text-yellow-400 focus:border-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-800 focus:border-yellow-600'
                }`} 
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 text-[10px] font-bold py-3 rounded-xl uppercase hover:bg-blue-500 text-white transition-colors shadow-lg">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className={`flex-1 text-[10px] font-bold py-3 rounded-xl uppercase transition-colors border ${
                darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200'
              }`}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{safeUserData.country || '🇸🇮'}</span>
                <h2 className={`text-xl font-black uppercase tracking-tight text-left transition-colors ${
                  darkMode ? 'text-white' : 'text-zinc-900'
                }`}>
                  {safeUserData.alias || "Trader"}
                </h2>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`border text-[8px] font-black uppercase px-2 py-0.5 rounded transition-all ${
                darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}>
                {safeUserData.style || "Trader"}
              </span>
              <span className={`border text-[8px] font-black uppercase px-2 py-0.5 rounded transition-all ${
                darkMode ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-600'
              }`}>
                {safeUserData.market || "Market"}
              </span>
            </div>

            <div className={`mt-5 p-4 rounded-2xl border ${darkMode ? 'bg-blue-950/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-1.5 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-3.5 h-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
                <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Terminal Verified
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                  <span className={`text-[7px] uppercase tracking-wider font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Total Gain</span>
                  <span className={`text-xs font-black font-mono ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    +{safeUserData.total_gain || '0.0'}%
                  </span>
                </div>
                <div className="flex flex-col border-l pl-2 border-dashed border-blue-500/20">
                  <span className={`text-[7px] uppercase tracking-wider font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Max DD</span>
                  <span className={`text-xs font-black font-mono ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                    -{safeUserData.max_drawdown || '0.0'}%
                  </span>
                </div>
                <div className="flex flex-col border-l pl-2 border-dashed border-blue-500/20">
                  <span className={`text-[7px] uppercase tracking-wider font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Win Rate</span>
                  <span className={`text-xs font-black font-mono ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                    {safeUserData.win_rate || '0'}%
                  </span>
                </div>
              </div>
            </div>

            <div className={`flex gap-6 mt-6 border-y py-4 transition-colors ${
              darkMode ? 'border-zinc-800/50' : 'border-zinc-100'
            }`}>
              <button onClick={onFollowingClick} className="text-left group cursor-pointer hover:opacity-80">
                <p className={`font-black text-lg leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{followingCount}</p>
                <p className={`text-[7px] uppercase tracking-[0.2em] font-bold mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Following</p>
              </button>

              <button onClick={onFollowersClick} className="text-left group cursor-pointer hover:opacity-80">
                <p className={`font-black text-lg leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{followersCount}</p>
                <p className={`text-[7px] uppercase tracking-[0.2em] font-bold mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Followers</p>
              </button>
            </div>

            <p className={`text-xs mt-4 italic text-left leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              "{safeUserData.bio || "No bio set."}"
            </p>

            {!isOwnProfile && safeUserData.subscription_price > 0 && (
              <button 
                onClick={() => handleSubscribeMonthly && handleSubscribeMonthly(safeUserData.id, safeUserData.subscription_price)}
                className="w-full mt-4 text-[10px] font-black py-4 rounded-xl uppercase transition-all bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/30 animate-pulse"
              >
                💎 Subscribe for {safeUserData.subscription_price} GAINS / mo
              </button>
            )}

            <div className="mt-6 space-y-2">
              <button 
                onClick={() => {
                   setActiveTab('feed');
                   if (setViewingAlias) setViewingAlias(null);
                }} 
                className={`w-full text-[10px] font-black py-3 rounded-xl uppercase border transition-all ${
                  activeTab === 'feed' 
                    ? 'bg-zinc-800 border-zinc-700 text-white shadow-lg' 
                    : (darkMode ? 'bg-zinc-800/20 border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100')
                }`}
              >
                📊 Home Feed
              </button>

              {isOwnProfile && (
                <button 
                  onClick={() => {
                    setActiveTab('profile');
                    setActiveSubTab('wallet');
                  }} 
                  className={`w-full text-[10px] font-black py-3 rounded-xl uppercase border transition-all ${
                    activeSubTab === 'wallet'
                      ? 'bg-yellow-500/20 border-yellow-400 text-yellow-500 shadow-lg shadow-yellow-500/20' 
                      : (darkMode ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20' : 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:bg-yellow-100')
                  }`}
                >
                  💳 My Wallet ({safeUserData.gains_balance || 0})
                </button>
              )}
              
              <button 
                onClick={() => {
                   setActiveTab('profile');
                   setActiveSubTab('info'); 
                   if (setViewingAlias) setViewingAlias(null);
                }} 
                className={`w-full text-[10px] font-black py-3 rounded-xl uppercase border transition-all ${
                  activeTab === 'profile' && activeSubTab === 'info' && isOwnProfile 
                    ? 'bg-zinc-800 border-zinc-700 text-white shadow-lg' 
                    : (darkMode ? 'bg-zinc-800/20 border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100')
                }`}
              >
                👤 My Profile
              </button>

              <button 
                onClick={() => {
                   setActiveTab('profile');
                   setActiveSubTab('journal'); 
                }} 
                className={`w-full text-[10px] font-black py-3 rounded-xl uppercase border transition-all ${
                  activeTab === 'profile' && activeSubTab === 'journal'
                    ? 'bg-orange-600 border-orange-500 text-white shadow-lg' 
                    : (darkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20' : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100')
                }`}
              >
                📈 Trading Journal
              </button>

              {/* DODANO: Gumb za Community Channels */}
              <button 
                onClick={() => {
                   setActiveTab('community');
                }} 
                className={`w-full text-[10px] font-black py-3 rounded-xl uppercase border transition-all ${
                  activeTab === 'community'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                    : (darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100')
                }`}
              >
                🌐 Community Channels
              </button>

              <button 
                onClick={onOpenRiskCalc} 
                className={`w-full text-[10px] font-black py-3 rounded-xl uppercase border transition-all ${
                  darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                }`}
              >
                🧮 Risk Calculator
              </button>

              {isOwnProfile && (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className={`w-full text-[10px] font-black py-3 rounded-xl uppercase transition-all pt-4 ${
                    darkMode ? 'text-zinc-600 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Edit Settings
                </button>
              )}
            </div>
            
            <button 
              onClick={() => {
                if (setViewingAlias) setViewingAlias(null);
                handleLogout();
              }} 
              className={`mt-8 w-full text-[9px] uppercase font-bold tracking-widest transition-colors ${
                darkMode ? 'text-zinc-700 hover:text-red-500' : 'text-red-400 hover:text-red-600'
              }`}
            >
              Disconnect Terminal
            </button>
          </>
        )}
      </div>

      {!isEditing && isOwnProfile && (
        <div className={`p-6 rounded-[2.5rem] border animate-in slide-in-from-top-4 duration-500 ${
          darkMode 
            ? 'border-zinc-800 bg-zinc-900/40 shadow-xl' 
            : 'border-zinc-200 bg-white shadow-lg'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs">✉️</span>
              <h3 className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>
                Terminal Messages
              </h3>
            </div>
            
            {hasNotification && (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            {activeContacts.length > 0 ? activeContacts.map((contact: any) => {
              const count = getUnreadCount(contact);
              return (
                <button 
                  key={contact}
                  type="button"
                  onClick={() => setActiveChat(contact)}
                  className={`w-full p-3 rounded-xl text-[10px] font-black uppercase text-left border transition-all hover:scale-[1.02] flex items-center justify-between ${
                    darkMode 
                      ? 'border-zinc-800 bg-black/20 hover:bg-zinc-800 text-zinc-300' 
                      : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="opacity-40 mr-2">👤</span> {contact}
                  </div>
                  
                  {count > 0 && (
                    <div className="flex items-center gap-2 animate-in zoom-in duration-300">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                        darkMode ? 'bg-green-500 text-black' : 'bg-green-500 text-white'
                      }`}>
                        {count}
                      </span>
                    </div>
                  )}
                </button>
              );
            }) : (
              <p className="text-[8px] opacity-40 uppercase italic text-center py-2">No transmissions</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}