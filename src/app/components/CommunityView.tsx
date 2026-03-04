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
  
  // DODANO: State za prisotnost (Online uporabniki)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  // State za urejanje sporočil
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState("");

  // NOVO: State za urejanje stila (Gradient Picker)
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [tempColorA, setTempColorA] = useState("#1a1a1a");
  const [tempColorB, setTempColorB] = useState("#000000");

  // State za ustvarjanje novih stvari
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showAddChan, setShowAddChan] = useState<string | null>(null); // Vsebuje ID kategorije
  const [newChanName, setNewChanName] = useState("");
  const [newChanIsPremium, setNewChanIsPremium] = useState(false);
  
  // DODANO: State za logotip kanala
  const [newChanLogo, setNewChanLogo] = useState<File | null>(null);
  const [newChanLogoPreview, setNewChanLogoPreview] = useState<string | null>(null);

  // State za preverjanje dostopa
  const [hasAccess, setHasAccess] = useState(true);
  
  // DODANO: State za datoteke v klepetu
  const [uploadingFile, setUploadingFile] = useState(false);

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
        const firstChan = combined[0].channels[0];
        setActiveChannel(firstChan);
        setTempColorA(firstChan.bg_color || "#1a1a1a");
        setTempColorB(firstChan.bg_image_url || "#000000");
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

  // DODANO: Brisanje kategorije
  const handleRemoveCategory = async (catId: string) => {
    if (!confirm("Delete entire category and all channels inside?")) return;
    const { error } = await supabase.from('community_categories').delete().eq('id', catId);
    if (!error) fetchHubData();
  };
  
  // DODANO: Kopiranje povezave za vabilo
  const copyInviteLink = () => {
    const link = `${window.location.origin}/profile/${userData.alias}`;
    navigator.clipboard.writeText(link);
    alert("Invite link copied to clipboard!");
  };
  
  // DODANO: Funkcija za izbiro in preverjanje slike logotipa
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      
      // Preverimo velikost datoteke (maksimalno 1 MB = 1048576 bajtov)
      if (file.size > 1048576) {
        alert("Slikica je prevelika! Prosim, izberi sliko, manjšo od 1 MB.");
        return;
      }
      
      // Preverimo tip datoteke (samo slike)
      if (!file.type.startsWith('image/')) {
        alert("Prosim, izberi veljavno sliko (PNG, JPG, ...).");
        return;
      }

      setNewChanLogo(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewChanLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. Ustvarjanje Kanala (posodobljeno z nalaganjem slike)
  const handleAddChannel = async (catId: string) => {
    if (!newChanName.trim()) return;
    
    try {
      let finalLogoUrl = null;
      
      // Če je slika izbrana, jo naložimo v Storage
      if (newChanLogo) {
        const fileExtension = newChanLogo.name.split('.').pop();
        const fileName = `${Date.now()}-${newChanName.toLowerCase().replace(/\s+/g, '-')}.${fileExtension}`;
        const filePath = `${userData.id}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('community-logos')
          .upload(filePath, newChanLogo);
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('community-logos')
          .getPublicUrl(filePath);
          
        finalLogoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('community_channels').insert([
        { 
          name: newChanName.toLowerCase().replace(/\s+/g, '-'), 
          category_id: catId, 
          owner_id: userData.id,
          is_premium: newChanIsPremium,
          logo_url: finalLogoUrl, // Shranimo URL slike
          bg_color: "#1a1a1a",
          bg_image_url: "#000000"
        }
      ]);
      
      if (error) throw error;
      
      setNewChanName("");
      setNewChanIsPremium(false);
      setNewChanLogo(null);
      setNewChanLogoPreview(null);
      setShowAddChan(null);
      fetchHubData();
      
    } catch (err: any) {
      console.error("Napaka pri ustvarjanju kanala:", err);
      alert("Prišlo je do napake pri nalaganju logotipa ali ustvarjanju kanala.");
    }
  };

  // DODANO: Brisanje kanala
  const handleRemoveChannel = async (chanId: string) => {
    if (!confirm("Delete this channel?")) return;
    const { error } = await supabase.from('community_channels').delete().eq('id', chanId);
    if (!error) {
      if (activeChannel?.id === chanId) setActiveChannel(null);
      fetchHubData();
    }
  };

  // Funkcija za nalaganje slik v klepetu
  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !activeChannel) return;
    const file = e.target.files[0];
    setUploadingFile(true);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `chat/${activeChannel.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await supabase.from('community_messages').insert([{
        channel_id: activeChannel.id,
        author_id: userData.id,
        author_alias: userData.alias,
        text: "", 
        file_url: urlData.publicUrl
      }]);

    } catch (err) {
      console.error(err);
      alert("Fail to upload file.");
    } finally {
      setUploadingFile(false);
    }
  };

  // FIKSIRANO: Funkcija za posodobitev stila kanala (Gradient)
  const handleUpdateStyle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeChannel || !isOwnProfile) return;
    
    const { data, error } = await supabase.from('community_channels')
      .update({ bg_color: tempColorA, bg_image_url: tempColorB })
      .eq('id', activeChannel.id)
      .select();
    
    if (!error && data) {
      alert("Style locked! 🎨");
      setActiveChannel(data[0]);
      setShowStylePicker(false);
      fetchHubData();
    } else {
      alert("Style update failed.");
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

  // 4. Klepet logika + PRESENCE (Online Status)
  useEffect(() => {
    if (!activeChannel || !hasAccess) return;

    // Fetch Messages
    const fetchMessages = async () => {
      const { data } = await supabase.from('community_messages').select('*').eq('channel_id', activeChannel.id).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    // Setup Realtime Channel s Presence
    const channelSub = supabase.channel(`chan-${activeChannel.id}`, {
      config: {
        presence: {
          key: userData.alias,
        },
      },
    });

    channelSub
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${activeChannel.id}` }, 
      (payload) => {
        if (payload.eventType === 'INSERT') setMessages(prev => [...prev, payload.new]);
        if (payload.eventType === 'DELETE') setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        if (payload.eventType === 'UPDATE') setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channelSub.presenceState();
        setOnlineUsers(Object.keys(newState));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channelSub.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channelSub); };
  }, [activeChannel, hasAccess, userData.alias]);

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

  // DODANO: Brisanje sporočila
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Delete this message?")) return;
    await supabase.from('community_messages').delete().eq('id', msgId).eq('author_id', userData.id);
  };

  // DODANO: Urejanje sporočila
  const handleUpdateMessage = async (msgId: string) => {
    if (!editingMsgText.trim()) return;
    const { error } = await supabase.from('community_messages').update({ text: editingMsgText }).eq('id', msgId).eq('author_id', userData.id);
    if (!error) {
      setEditingMsgId(null);
      setEditingMsgText("");
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className={`flex flex-col md:flex-row h-[75vh] min-h-[600px] w-full rounded-[2.5rem] border overflow-hidden shadow-2xl ${
      darkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      
      {/* LEVA STRAN: TVOJ HUB */}
      <div className={`w-full md:w-64 flex-shrink-0 flex flex-col border-r ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <div className="p-6 border-b border-zinc-800/30 flex justify-between items-start">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Channels Hub</h2>
            <div className="flex gap-2 mt-1">
              <button onClick={copyInviteLink} className="text-[7px] text-zinc-500 uppercase font-bold hover:text-white">🔗 Link</button>
              <button onClick={onBack} className="text-[7px] text-red-500 uppercase font-bold hover:text-red-400">← Exit</button>
            </div>
          </div>
          {isOwnProfile && (
            <button onClick={() => setShowAddCat(true)} className="text-blue-500 hover:scale-125 transition-transform text-lg">➕</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
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
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setShowAddChan(cat.id)} className="text-[14px] text-blue-500 hover:scale-125">+</button>
                    <button onClick={() => handleRemoveCategory(cat.id)} className="text-[14px] text-red-500 hover:scale-125">×</button>
                  </div>
                )}
              </div>

              {showAddChan === cat.id && (
                <div className="p-2 mb-2 bg-zinc-800/30 rounded-lg border border-zinc-700 space-y-2 animate-in slide-in-from-top-1">
                  <div className="flex items-center gap-2">
                    <label className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 cursor-pointer border border-zinc-700 bg-zinc-900`}>
                      {newChanLogoPreview ? (
                        <img src={newChanLogoPreview} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        '📷'
                      )}
                      <input type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} className="hidden" />
                    </label>
                    <input 
                      className="w-full bg-transparent text-[10px] outline-none" 
                      placeholder="Channel name..."
                      value={newChanName}
                      onChange={e => setNewChanName(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pl-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newChanIsPremium} onChange={e => setNewChanIsPremium(e.target.checked)} className="accent-blue-500" />
                      <span className="text-[8px] uppercase font-bold">VIP 🔒</span>
                    </label>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setShowAddChan(null); setNewChanLogo(null); setNewChanLogoPreview(null); }} className="text-[8px] uppercase font-bold text-zinc-500">X</button>
                      <button onClick={() => handleAddChannel(cat.id)} className="text-[8px] uppercase font-black text-blue-500">OK</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {cat.channels.map((chan: any) => (
                  <div key={chan.id} className="group/chan flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActiveChannel(chan);
                        setTempColorA(chan.bg_color || "#1a1a1a");
                        setTempColorB(chan.bg_image_url || "#000000");
                      }}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        activeChannel?.id === chan.id 
                          ? (darkMode ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'bg-blue-50 text-blue-600 border border-blue-200 shadow-md')
                          : 'text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {chan.logo_url ? (
                        <img src={chan.logo_url} className="w-8 h-8 rounded object-cover shadow-sm shrink-0" />
                      ) : (
                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-black uppercase ${activeChannel?.id === chan.id ? (darkMode ? 'bg-blue-600/30' : 'bg-blue-100') : (darkMode ? 'bg-zinc-800' : 'bg-zinc-100')}`}>
                          {chan.is_premium ? '🔒' : '#'}
                        </div>
                      )}
                      <span className="truncate">{chan.name}</span>
                    </button>
                    {isOwnProfile && (
                      <button onClick={() => handleRemoveChannel(chan.id)} className="text-zinc-600 hover:text-red-500 px-1 text-lg">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DESNA STRAN: CHAT AREA S PRELIVOM */}
      <div 
        className="flex-1 flex flex-col relative transition-all duration-700"
        style={{ 
          background: `linear-gradient(180deg, ${activeChannel?.bg_color || '#1a1a1a'} 0%, ${activeChannel?.bg_image_url || '#000000'} 100%)` 
        }}
      >
        {/* Overlay za boljšo berljivost */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        {activeChannel ? (
          <div className="relative z-10 flex flex-col h-full">
            <div className="p-6 border-b flex justify-between items-center backdrop-blur-md bg-black/20">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  {activeChannel.logo_url && (
                      <img src={activeChannel.logo_url} className="w-10 h-10 rounded-lg object-cover shadow-md" />
                  )}
                  <h2 className="text-sm font-black uppercase tracking-widest text-white shadow-sm">
                    {activeChannel.name}
                  </h2>
                </div>

                {/* PRIKAZ ONLINE UPORABNIKOV */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300 drop-shadow-md">
                    {onlineUsers.length} Online: {onlineUsers.join(', ')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {isOwnProfile && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowStylePicker(!showStylePicker)}
                      className="text-[9px] font-black uppercase border border-white/20 px-3 py-2 rounded-lg text-white bg-white/5 hover:bg-white/10 transition-all"
                    >
                      🎨 Gradient
                    </button>
                    {showStylePicker && (
                      <div className="absolute right-0 mt-2 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[100] w-48 animate-in zoom-in-95">
                        <p className="text-[8px] font-black uppercase text-zinc-500 mb-3 text-center">Customize Hub</p>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] uppercase font-bold text-white">Top</span>
                            <input type="color" value={tempColorA} onChange={(e) => setTempColorA(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] uppercase font-bold text-white">Bottom</span>
                            <input type="color" value={tempColorB} onChange={(e) => setTempColorB(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                          </div>
                          <button onClick={handleUpdateStyle} className="w-full py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase mt-2 hover:bg-blue-500 transition-all">Apply Gradient</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isOwnProfile && activeChannel.is_premium && (
                  <button onClick={handleInviteUser} className="text-[9px] font-black uppercase bg-blue-600 px-3 py-2 rounded-lg text-white hover:bg-blue-500 shadow-lg">
                    Invite Member
                  </button>
                )}
              </div>
            </div>

            {hasAccess ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {messages.map((m: any, i) => (
                    <div key={m.id || i} className={`flex flex-col group ${m.author_id === userData.id ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-3 mb-1 px-1">
                        {!isOwnProfile && <span className="text-[7px] font-black uppercase opacity-60 text-white drop-shadow-md">{m.author_alias}</span>}
                        {m.author_id === userData.id && (
                          <div className="flex gap-3 items-center">
                            <button onClick={() => { setEditingMsgId(m.id); setEditingMsgText(m.text); }} className="text-[12px] hover:scale-125 transition-transform">✏️</button>
                            <button onClick={() => handleDeleteMessage(m.id)} className="text-[12px] hover:scale-125 transition-transform">🗑️</button>
                            <span className="text-[7px] font-black uppercase opacity-60 text-white drop-shadow-md">{m.author_alias}</span>
                          </div>
                        )}
                      </div>
                      
                      {editingMsgId === m.id ? (
                        <div className="flex flex-col gap-2 bg-zinc-800/90 p-3 rounded-xl border border-zinc-700 min-w-[200px] shadow-2xl backdrop-blur-md">
                          <textarea 
                            className="bg-transparent text-[11px] outline-none resize-none h-16 text-white"
                            value={editingMsgText}
                            onChange={e => setEditingMsgText(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingMsgId(null)} className="text-[8px] uppercase font-bold text-zinc-400">Cancel</button>
                            <button onClick={() => handleUpdateMessage(m.id)} className="text-[8px] uppercase font-black text-blue-500">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-2xl text-[11px] shadow-lg flex flex-col gap-2 backdrop-blur-[2px] ${m.author_id === userData.id ? 'bg-blue-600/90 text-white rounded-tr-none' : (darkMode ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-tl-none' : 'bg-white/90 border border-zinc-200 text-zinc-900 rounded-tl-none')}`}>
                          {m.file_url && (
                            <a href={m.file_url} target="_blank" rel="noreferrer" className="max-w-xs overflow-hidden rounded-lg">
                               <img src={m.file_url} className="w-full h-auto hover:scale-105 transition-transform" alt="attached" />
                            </a>
                          )}
                          {m.text && <span>{m.text}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="p-6 border-t mt-auto backdrop-blur-md bg-black/10">
                  <div className="flex items-center gap-2 p-2 rounded-2xl border border-white/10 bg-black/20">
                    <label className={`p-2 rounded-xl cursor-pointer hover:bg-white/5 transition-all ${uploadingFile ? 'animate-pulse opacity-50' : ''}`}>
                       <span className="text-lg">📎</span>
                       <input type="file" className="hidden" onChange={handleChatFileUpload} disabled={uploadingFile} />
                    </label>
                    <input 
                      className="flex-1 bg-transparent outline-none px-1 text-[11px] text-white placeholder-zinc-400" 
                      placeholder={uploadingFile ? "Uploading..." : "Type message..."} 
                      value={newMessage} 
                      onChange={e => setNewMessage(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                    />
                    <button onClick={handleSendMessage} className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase text-white shadow-lg hover:bg-blue-500 transition-all">Send</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in backdrop-blur-xl bg-black/20">
                <span className="text-6xl mb-6 block shadow-sm">🔒</span>
                <h2 className="text-xl font-bold uppercase tracking-widest text-white drop-shadow-md">VIP Access Restricted</h2>
                <p className="text-zinc-300 text-[10px] uppercase mt-2 max-w-xs leading-relaxed drop-shadow-md">
                  This channel is reserved for VIP subscribers or members with a special invitation.
                </p>
                <button className="mt-8 px-8 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
                  Upgrade to VIP Access
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="m-auto text-center opacity-20 relative z-10">
            <p className="text-4xl">📡</p>
            <p className="text-[10px] font-black uppercase mt-4 text-white">Create or select a channel to start broadcasting</p>
          </div>
        )}
      </div>
    </div>
  );
}