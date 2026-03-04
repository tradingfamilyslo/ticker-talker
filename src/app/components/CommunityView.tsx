"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CommunityView({ userData, darkMode, onBack, isOwnProfile, viewingId }: any) {
  // Če gledamo tuj profil, uporabimo viewingId, drugače userData.id
  const targetOwnerId = viewingId || userData?.id;

  const [categories, setCategories] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // State za ustvarjanje novih stvari
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showAddChan, setShowAddChan] = useState<string | null>(null); // Vsebuje ID kategorije
  const [newChanName, setNewChanName] = useState("");
  const [newChanIsPremium, setNewChanIsPremium] = useState(false);

  // State za preverjanje dostopa
  const [hasAccess, setHasAccess] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Nalaganje kategorij in kanalov za SPECIFIČNEGA TRADERJA
  const fetchHubData = async () => {
    if (!targetOwnerId) return;

    const { data: cats } = await supabase
      .from('community_categories')
      .select('*')
      .eq('owner_id', targetOwnerId)
      .order('sort_order', { ascending: true });

    const { data: chans } = await supabase
      .from('community_channels')
      .select('*')
      .eq('owner_id', targetOwnerId);

    if (cats) {
      const combined = cats.map(cat => ({
        ...cat,
        channels: chans ? chans.filter(c => c.category_id === cat.id) : []
      }));
      setCategories(combined);
      if (!activeChannel && combined[0]?.channels[0]) {
        setActiveChannel(combined[0].channels[0]);
      }
    }
  };

  useEffect(() => {
    fetchHubData();
  }, [targetOwnerId]);

  // 2. Ustvarjanje Kategorije
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from('community_categories').insert([
      { name: newCatName, owner_id: userData.id, sort_order: categories.length + 1 }
    ]);
    if (!error) {
      setNewCatName("");
      setShowAddCat(false);
      fetchHubData();
    }
  };

  // 3. Ustvarjanje Kanala
  const handleAddChannel = async (catId: string) => {
    if (!newChanName.trim()) return;
    const { error } = await supabase.from('community_channels').insert([
      { 
        name: newChanName.toLowerCase().replace(/\s+/g, '-'), 
        category_id: catId, 
        owner_id: userData.id,
        is_premium: newChanIsPremium 
      }
    ]);
    if (!error) {
      setNewChanName("");
      setNewChanIsPremium(false);
      setShowAddChan(null);
      fetchHubData();
    }
  };

  // FUNKCIJA ZA VABLJENJE (Samo za lastnika)
  const handleInviteUser = async () => {
    if (!activeChannel) return;
    const userAlias = prompt("Enter the Alias of the user you want to invite to this VIP channel:");
    if (!userAlias) return;

    const { data: profile } = await supabase.from('profiles').select('id').eq('alias', userAlias).single();

    if (!profile) {
      alert("User not found!");
      return;
    }

    const { error } = await supabase.from('community_invites').insert([
      { channel_id: activeChannel.id, user_id: profile.id, invited_by: userData.id }
    ]);

    if (error) alert("User already has access or an error occurred.");
    else alert(`Access granted to ${userAlias}!`);
  };

  // PREVERJANJE DOSTOPA (VIP ali Invite ali Naročnina)
  useEffect(() => {
    const checkChannelAccess = async () => {
      if (!activeChannel) return;
      if (!activeChannel.is_premium || isOwnProfile) {
        setHasAccess(true);
        return;
      }

      // A) Preveri ROČNO POVABILO v bazi
      const { data: invite } = await supabase
        .from('community_invites')
        .select('*')
        .eq('channel_id', activeChannel.id)
        .eq('user_id', userData.id)
        .maybeSingle();

      if (invite) {
        setHasAccess(true);
        return;
      }

      // B) Preveri AKTIVNO NAROČNINO pri tem traderju
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userData.id)
        .eq('trader_id', targetOwnerId)
        .eq('status', 'active')
        .maybeSingle();

      setHasAccess(!!sub);
    };

    checkChannelAccess();
  }, [activeChannel, userData.id, isOwnProfile, targetOwnerId]);

  // 4. Klepet logika (ostane ista kot prej)
  useEffect(() => {
    if (!activeChannel || !hasAccess) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('community_messages').select('*').eq('channel_id', activeChannel.id).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    const channelSub = supabase.channel(`chan-${activeChannel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${activeChannel.id}` }, 
      (payload) => setMessages(prev => [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channelSub); };
  }, [activeChannel, hasAccess]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChannel || !userData?.id) return;
    await supabase.from('community_messages').insert([{
      channel_id: activeChannel.id,
      author_id: userData.id,
      author_alias: userData.alias,
      text: newMessage
    }]);
    setNewMessage("");
  };

  return (
    <div className={`flex flex-col md:flex-row h-[75vh] min-h-[600px] w-full rounded-[2.5rem] border overflow-hidden shadow-2xl ${
      darkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      
      {/* LEVA STRAN: TVOJ HUB */}
      <div className={`w-full md:w-64 flex-shrink-0 flex flex-col border-r ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <div className="p-6 border-b border-zinc-800/30 flex justify-between items-center">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Channels Hub</h2>
          {isOwnProfile && (
            <button onClick={() => setShowAddCat(true)} className="text-blue-500 hover:scale-110 transition-all">➕</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* VNOS ZA NOVO KATEGORIJO */}
          {showAddCat && (
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/30 mb-4 animate-in slide-in-from-top-2">
              <input 
                autoFocus
                className="w-full bg-transparent text-[10px] font-bold outline-none mb-2"
                placeholder="Category Name..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddCat(false)} className="text-[8px] uppercase font-bold">Cancel</button>
                <button onClick={handleAddCategory} className="text-[8px] uppercase font-black text-blue-500">Add</button>
              </div>
            </div>
          )}

          {categories.map((cat) => (
            <div key={cat.id} className="group/cat">
              <div className="flex justify-between items-center px-2 mb-2">
                <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">{cat.name}</h3>
                {isOwnProfile && (
                  <button onClick={() => setShowAddChan(cat.id)} className="opacity-0 group-hover/cat:opacity-100 text-[10px]">+</button>
                )}
              </div>

              {/* VNOS ZA NOV KANAL */}
              {showAddChan === cat.id && (
                <div className="p-2 mb-2 bg-zinc-800/30 rounded-lg border border-zinc-700">
                  <input 
                    className="w-full bg-transparent text-[10px] outline-none mb-1" 
                    placeholder="Channel name..."
                    value={newChanName}
                    onChange={e => setNewChanName(e.target.value)}
                  />
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={newChanIsPremium} onChange={e => setNewChanIsPremium(target => e.target.checked)} />
                    <span className="text-[8px] uppercase font-bold">VIP Access 🔒</span>
                  </label>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddChan(null)} className="text-[8px]">X</button>
                    <button onClick={() => handleAddChannel(cat.id)} className="text-[8px] font-black text-blue-500">OK</button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {cat.channels.map((chan: any) => (
                  <button
                    key={chan.id}
                    onClick={() => setActiveChannel(chan)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                      activeChannel?.id === chan.id 
                        ? (darkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{chan.is_premium ? '🔒' : '#'}</span>
                    <span className="truncate">{chan.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DESNA STRAN: CHAT */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            <div className="p-6 border-b flex justify-between items-center backdrop-blur-md">
              <h2 className="text-sm font-black uppercase tracking-widest">
                {activeChannel.is_premium ? '🔒 ' : '# '}{activeChannel.name}
              </h2>
              {isOwnProfile && activeChannel.is_premium && (
                <button onClick={handleInviteUser} className="text-[9px] font-black uppercase bg-blue-600 px-3 py-2 rounded-lg text-white hover:bg-blue-500">
                  Invite Member
                </button>
              )}
            </div>

            {hasAccess ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((m: any, i) => (
                    <div key={i} className={`flex flex-col ${m.author_id === userData.id ? 'items-end' : 'items-start'}`}>
                      <span className="text-[7px] font-black uppercase opacity-40 mb-1">{m.author_alias}</span>
                      <div className={`p-3 rounded-2xl text-[11px] ${m.author_id === userData.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-6 border-t">
                  <div className="flex gap-2 p-2 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                    <input 
                      className="flex-1 bg-transparent outline-none px-3 text-[11px]" 
                      placeholder="Type message..." 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button onClick={handleSendMessage} className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase">Send</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in">
                <span className="text-6xl mb-6">🔒</span>
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">VIP Access Restricted</h2>
                <p className="text-zinc-500 text-[10px] uppercase mt-2 max-w-xs leading-relaxed">
                  This channel is reserved for VIP subscribers or members with a special invitation.
                </p>
                <button className="mt-8 px-8 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">
                  Upgrade to VIP Access
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="m-auto text-center opacity-20">
            <p className="text-4xl">📡</p>
            <p className="text-[10px] font-black uppercase mt-4">Create or select a channel to start broadcasting</p>
          </div>
        )}
      </div>
    </div>
  );
}