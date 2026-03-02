"use client";
import React, { useState, useEffect, useRef } from 'react';
import UserCard from './UserCard';
import { supabase } from '@/lib/supabaseClient';

interface SearchBarProps {
  onSearch: (query: string) => void;
  posts: any[];
  onVisitProfile: (alias: string) => void;
  darkMode: boolean;
  allUsers?: any[]; 
}

export default function SearchBar({ onSearch, posts, onVisitProfile, darkMode, allUsers = [] }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dbUsers, setDbUsers] = useState<any[]>([]); 
  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- KLJUČNA FUNKCIJA: Pridobi vse profile direktno iz baze ---
  const refreshUsersDirectly = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('alias, country, avatar_url, style');
      
      if (!error && data) {
        setDbUsers(data.map(u => ({
          alias: u.alias,
          country: u.country,
          style: u.style,
          avatar: u.avatar_url
        })));
      }
    } catch (err) {
      console.error("Search fetch error:", err);
    }
  };

  // Osveži ob prvem nalaganju
  useEffect(() => {
    refreshUsersDirectly();
  }, []);

  // Iskalna logika
  useEffect(() => {
    if (query.trim().length > 0) {
      const usersMap = new Map();

      // 1. Dodaj uporabnike iz baze (dbUsers)
      dbUsers.forEach(u => {
        if (u.alias) usersMap.set(u.alias.toLowerCase(), u);
      });

      // 2. Dodaj uporabnike iz props (allUsers)
      allUsers.forEach(u => {
        if (u.alias) usersMap.set(u.alias.toLowerCase(), u);
      });

      // 3. Dodaj avtorje iz objav (fallback)
      posts.forEach(p => {
        if (p.authorAlias && !usersMap.has(p.authorAlias.toLowerCase())) {
          usersMap.set(p.authorAlias.toLowerCase(), {
            alias: p.authorAlias,
            country: p.authorCountry || '🏳️',
            style: 'Node',
            avatar: p.authorAvatar
          });
        }
      });
      
      const allUniqueUsers = Array.from(usersMap.values());
      const results = allUniqueUsers.filter((u: any) => 
        u.alias.toLowerCase().includes(query.toLowerCase())
      );
      
      setFilteredUsers(results);
      setShowDropdown(true);
    } else {
      setFilteredUsers([]);
      setShowDropdown(false);
    }
  }, [query, posts, allUsers, dbUsers]);

  // Zapri ob kliku izven
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- IZBIRA UPORABNIKA ---
  const handleSelect = (user: any) => {
    // Navigacija na profil
    if (onVisitProfile) {
      onVisitProfile(user.alias);
    }
    
    // Ponastavi iskalnik
    setQuery("");
    setShowDropdown(false);
    
    // Počisti filtre na feedu
    if (onSearch) {
      onSearch(""); 
    }
  };

  return (
    <div ref={wrapperRef} className={`w-full p-2 md:p-4 border-b backdrop-blur-md sticky top-0 z-[100] transition-colors ${
      darkMode ? 'border-zinc-800 bg-black/60' : 'border-zinc-200 bg-white/80'
    }`}>
      <div className="relative max-w-2xl mx-auto">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">🔍</span>
        
        <input 
          type="text" 
          value={query}
          placeholder="Search Network Nodes..." 
          // NUJNO: Osveži podatke vsakič, ko uporabnik klikne v iskalnik
          onFocus={() => { refreshUsersDirectly(); if(query) setShowDropdown(true); }}
          onChange={(e) => setQuery(e.target.value)}
          className={`w-full border rounded-full py-2.5 md:py-3 pl-10 pr-10 text-xs md:text-sm font-bold uppercase tracking-wide outline-none transition-all ${
            darkMode 
              ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500 placeholder:text-zinc-600' 
              : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:border-blue-400 placeholder:text-zinc-400'
          }`}
        />

        {query.length > 0 && (
          <button 
            onClick={() => { setQuery(""); if(onSearch) onSearch(""); }} 
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors active:scale-90 ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}
          >
            ✕
          </button>
        )}

        {showDropdown && filteredUsers.length > 0 && (
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-[1.5rem] border shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200 ${
            darkMode ? 'bg-zinc-950 border-zinc-800 shadow-black' : 'bg-white border-zinc-200 shadow-xl'
          }`}>
            <div className="p-2 max-h-[60vh] overflow-y-auto space-y-1 custom-scrollbar">
              {filteredUsers.map((user, idx) => (
                <UserCard 
                  key={idx}
                  alias={user.alias}
                  country={user.country}
                  style={user.style}
                  image={user.avatar} 
                  darkMode={darkMode}
                  onClick={() => handleSelect(user)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}