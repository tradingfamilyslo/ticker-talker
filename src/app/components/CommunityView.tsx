"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CommunityView({ userData, darkMode, onBack }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Pridobivanje kategorij in kanalov
  useEffect(() => {
    const fetchChannels = async () => {
      const { data: cats } = await supabase.from('community_categories').select('*').order('sort_order', { ascending: true });
      const { data: chans } = await supabase.from('community_channels').select('*');

      if (cats && chans) {
        const combined = cats.map(cat => ({
          ...cat,
          channels: chans.filter(c => c.category_id === cat.id)
        }));
        setCategories(combined);
        
        // Avtomatsko izberi prvi kanal, če še noben ni izbran
        if (!activeChannel && combined[0]?.channels[0]) {
          setActiveChannel(combined[0].channels[0]);
        }
      }
    };
    fetchChannels();
  }, []);

  // 2. Pridobivanje sporočil za izbran kanal in Realtime poslušanje
  useEffect(() => {
    if (!activeChannel) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('community_messages')
        .select('*')
        .eq('channel_id', activeChannel.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    
    fetchMessages();

    // Naročnina na nova sporočila v živo
    const channelSub = supabase
      .channel('community_live')
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'community_messages',
          filter: `channel_id=eq.${activeChannel.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channelSub); };
  }, [activeChannel]);

  // Avtomatski scroll na dno ob novem sporočilu
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Pošiljanje sporočila
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChannel || !userData?.id) return;

    const payload = {
      channel_id: activeChannel.id,
      author_id: userData.id,
      author_alias: userData.alias || "Trader",
      text: newMessage
    };

    const { error } = await supabase.from('community_messages').insert([payload]);
    if (!error) setNewMessage("");
    else console.error("Error sending message:", error);
  };

  return (
    <div className={`flex flex-col md:flex-row h-[75vh] min-h-[600px] w-full rounded-[2.5rem] border overflow-hidden animate-in fade-in duration-500 shadow-2xl ${
      darkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      
      {/* LEVA STRAN: DISCORD MENI */}
      <div className={`w-full md:w-64 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r transition-colors ${
        darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`}>
        <div className="p-6 border-b border-zinc-800/30 flex justify-between items-center">
          <h2 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>
            Gain Wave Hub
          </h2>
          <button onClick={onBack} className="text-xl opacity-50 hover:opacity-100 transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {categories.map((cat: any) => (
            <div key={cat.id} className="space-y-2">
              <h3 className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {cat.name}
              </h3>
              <div className="space-y-1">
                {cat.channels.map((chan: any) => (
                  <button
                    key={chan.id}
                    onClick={() => setActiveChannel(chan)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[10px] font-bold uppercase transition-all ${
                      activeChannel?.id === chan.id 
                        ? (darkMode ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200')
                        : (darkMode ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent' : 'text-zinc-600 hover:bg-zinc-200/50 border border-transparent')
                    }`}
                  >
                    <span className="opacity-50 text-[11px]">{chan.is_premium ? '🔒' : '#'}</span>
                    <span className="truncate">{chan.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className={`p-4 border-t flex items-center gap-3 ${darkMode ? 'border-zinc-800/50 bg-zinc-900' : 'border-zinc-200 bg-zinc-100'}`}>
           <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-500/50">
              {userData.avatar ? <img src={userData.avatar} className="w-full h-full object-cover" alt="User" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs">👤</div>}
           </div>
           <div className="flex flex-col truncate">
              <span className={`text-[10px] font-black uppercase ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{userData.alias || 'Trader'}</span>
              <span className="text-[8px] uppercase text-green-500 font-bold">● Online</span>
           </div>
        </div>
      </div>

      {/* DESNA STRAN: CHAT OKNO */}
      <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
        
        <div className={`p-4 md:p-6 border-b flex items-center gap-3 backdrop-blur-md z-10 ${
          darkMode ? 'border-zinc-800/50 bg-zinc-950/80' : 'border-zinc-200 bg-white/80'
        }`}>
          <span className="text-xl opacity-50">{activeChannel?.is_premium ? '🔒' : '#'}</span>
          <h2 className={`text-sm font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            {activeChannel?.name || 'Select a channel'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar flex flex-col">
          {messages.length === 0 ? (
             <div className="m-auto text-center flex flex-col items-center opacity-30">
                <span className="text-4xl mb-3">📭</span>
                <p className="text-[10px] uppercase font-black tracking-widest">This channel is empty.</p>
                <p className="text-[8px] uppercase mt-1">Be the first to broadcast.</p>
             </div>
          ) : (
            messages.map((m: any, idx: number) => {
              const isMe = m.author_id === userData?.id;
              return (
                <div key={m.id || idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 px-1">
                      {m.author_alias}
                    </span>
                    <div className={`p-3 md:p-4 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : (darkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none' : 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-tl-none')
                    }`}>
                      {m.text}
                    </div>
                    <span className="text-[7px] font-mono opacity-30 mt-1 px-1">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={`p-4 md:p-6 border-t backdrop-blur-md z-10 ${
          darkMode ? 'border-zinc-800/50 bg-zinc-950/80' : 'border-zinc-200 bg-white/80'
        }`}>
          <div className={`flex items-center gap-2 p-2 rounded-2xl border transition-all focus-within:border-blue-500 ${
            darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
          }`}>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Message ${activeChannel?.is_premium ? '🔒' : '#'}${activeChannel?.name || 'channel'}...`}
              className="flex-1 bg-transparent border-none outline-none px-3 text-[11px] font-bold h-10"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                newMessage.trim() 
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg' 
                  : (darkMode ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed')
              }`}
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}