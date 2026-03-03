"use client";
import React, { useState, useEffect, useRef } from 'react';

// UVOZI KOMPONENT
import PriceTicker from './components/PriceTicker';
import SearchBar from './components/SearchBar';
import AuthView from './components/AuthView';
import ProfileSidebar from './components/ProfileSidebar';
import FeedView from './components/FeedView';
import GlobalFeed from './components/GlobalFeed';
import AnalogClock from './components/AnalogClock'; 
import TradingJournal from './components/TradingJournal';
import WalletView from './components/WalletView'; // DODAN UVOZ
import AdBanner from './components/AdBanner'; // DODANO ZA OGLASE
import AdCreatorModal from './components/AdCreatorModal'; // DODANO ZA ODRPEANJE MODALA

// TUKAJ UVOZI SVOJ SUPABASE CLIENT
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'profile'>('feed');
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'journal' | 'wallet'>('info'); // DODAN 'wallet'
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const [showRiskCalc, setShowRiskCalc] = useState(false);
  const [riskData, setRiskData] = useState({
    balance: "1000",
    riskPct: "1",
    pips: "20"
  });
  const [calcResult, setCalcResult] = useState<number | null>(null);

  // --- POPRAVLJENO: 4 ZAČETNE VREDNOSTI ---
  const [prices, setPrices] = useState({ btc: 0, eur: 0, xau: 0, eth: 0 });
  const [priceFlash, setPriceFlash] = useState({ btc: '', eur: '', xau: '', eth: '' });
  const prevPrices = useRef({ btc: 0, eur: 0, xau: 0, eth: 0 });

  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // --- DODANO: State za Premium objavo in Oglase ---
  const [isPremium, setIsPremium] = useState(false);
  const [priceBulls, setPriceBulls] = useState(5);
  const [activeAds, setActiveAds] = useState<any[]>([]); // DODANO ZA OGLASE
  const [isAdModalOpen, setIsAdModalOpen] = useState(false); // DODANO ZA MODAL OGLASOV

  const [messages, setMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const [economicNews, setEconomicNews] = useState<any[]>([]);
  const [marketRisk, setMarketRisk] = useState<'low' | 'medium' | 'high'>('low');

  const [viewingAlias, setViewingAlias] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowingViewingUser, setIsFollowingViewingUser] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState("");
  const [followList, setFollowList] = useState<any[]>([]);

  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  const [userData, setUserData] = useState<any>({
    id: '', 
    alias: '', 
    email: '', 
    style: 'Day Trader', 
    market: 'Crypto', 
    bio: '',
    avatar: null,
    password: '', 
    confirmPassword: '',
    country: '🇸🇮', 
    followers: 0, 
    following: [] as string[],
    agreedToTerms: false,
    myfxbook_url: '',
    total_gain: 0,
    max_drawdown: 0,
    win_rate: 0,
    verify_source: 'manual', // DODANO: vir verifikacije
    ftmo_username: '',       // DODANO: FTMO uporabnik
    binance_key: '',         // DODANO: Binance Key
    mql5_url: '',            // DODANO: MQL5 URL
    gains_balance: 0,        // DODANO: Stanje denarnice
    earned_balance: 0        // DODANO: Zaslužek
  });

  const [loginAlias, setLoginAlias] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // --- REF ZA REALTIME SINHRONIZACIJO ---
  const activeChatRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // --- DODANO: STRIPE PROCES NAKUPA ---
  const handleStripePurchase = async (amount: number) => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          userAlias: userData?.alias || "User",
          userId: userData?.id
        }),
      });

      const session = await response.json();

      if (session.url) {
        window.location.href = session.url; 
      } else {
        alert("Server failed to create Stripe session.");
      }
    } catch (err) {
      console.error("Critical Purchase Error:", err);
      alert("Terminal connection to Stripe failed.");
    }
  };

  // --- DODANO: Funkcija za avtomatsko dodajanje/odvzemanje kovancev v denarnici ---
  const updateUserBalance = async (userId: string, amount: number) => {
    try {
      const { data: wallet } = await supabase
        .from('user_balances')
        .select('bulls_balance')
        .eq('user_id', userId)
        .maybeSingle(); 
      
      const currentBalance = wallet ? wallet.bulls_balance : 0;
      const newBalance = currentBalance + amount;

      const { error } = await supabase
        .from('user_balances')
        .upsert({ user_id: userId, bulls_balance: newBalance, updated_at: new Date() });

      if (error) throw error;

      setUserData((prev: any) => ({ ...prev, gains_balance: newBalance }));
      return true;
    } catch (err) {
      console.error("Balance update failed:", err);
      return false;
    }
  };

  // --- DODANO: Pridobivanje oglasov ---
  const fetchAds = async () => {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .gt('expires_at', new Date().toISOString());
    if (!error && data) {
      setActiveAds(data);
    }
  };

  // --- DODANO: Funkcija za nakup in objavo oglasa ---
  const handleLaunchAd = async (adData: any, cost: number) => {
    if (userData.gains_balance < cost) {
      alert("Insufficient GAINS balance!");
      return;
    }

    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + adData.duration);

    try {
      const { error: walletErr } = await supabase
        .from('user_balances')
        .update({ bulls_balance: userData.gains_balance - cost })
        .eq('user_id', userData.id);

      if (walletErr) throw walletErr;

      const { error: adErr } = await supabase.from('ads').insert([{
        user_id: userData.id,
        text: adData.text,
        image_url: adData.image_url,
        target_url: adData.target_url,
        author_alias: userData.alias,
        expires_at: expires_at.toISOString()
      }]);

      if (adErr) throw adErr;

      alert("Campaign Launched Successfully! 🚀");
      setIsAdModalOpen(false);
      fetchAds(); 
      setUserData((prev: any) => ({ ...prev, gains_balance: prev.gains_balance - cost }));
    } catch (err) {
      console.error(err);
      alert("Error launching campaign.");
    }
  };

  const fetchPostsFromDB = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase.from('posts_with_profiles').select('*').order('created_at', { ascending: false });
      
      let unlockedIds = new Set();
      if (userData?.id) {
         const { data: unlocksData } = await supabase.from('post_unlocks').select('post_id').eq('user_id', userData.id);
         unlockedIds = new Set(unlocksData?.map(u => u.post_id) || []);
      }

      if (!postsError && postsData) {
        const formatted = postsData.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          authorAlias: p.author_alias_db || p.author_alias, 
          authorCountry: p.author_country,
          authorAvatar: p.author_avatar, 
          text: p.text,
          image: p.image_url,
          bulls: p.bulls || 0,
          bears: p.bears || 0,
          time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          created_at: p.created_at,
          is_premium: p.is_premium || false,
          price_bulls: p.price_bulls || 0,
          is_unlocked: unlockedIds.has(p.id), 
          pair: p.pair,
          direction: p.direction,
          entry: p.entry_price,
          sl: p.sl_price,
          tp: p.tp_price,
          signal_status: p.signal_status
        }));
        setPosts(formatted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- DODANO: FUNKCIJA ZA MANUALNO ZAPIRANJE IN BE ---
  const handleSignalAction = async (postId: string, actionType: 'manual_close' | 'set_be') => {
    if (!userData.id) return;
    
    // Samo preprečimo napačne klike, trejder sam oceni kdaj klikniti.
    if (!confirm(`Are you sure you want to set this signal to: ${actionType === 'manual_close' ? 'CLOSE NOW' : 'BREAK EVEN'}?`)) return;

    const newStatus = actionType === 'manual_close' ? 'manual_exit' : 'be_void';

    try {
        const { error } = await supabase
            .from('posts')
            .update({ signal_status: newStatus })
            .eq('id', postId)
            .eq('user_id', userData.id); // Varnost, da lahko samo avtor to stori

        if (error) throw error;
        
        alert(`Signal status updated to ${newStatus.toUpperCase()}`);
        fetchPostsFromDB(); // Osveži feed, da dobi status in barve
        fetchAllProfiles(); // Osveži profilno statistiko z novimi izidi
    } catch (err) {
        console.error("Error updating signal status:", err);
        alert("Failed to update signal status.");
    }
  };

  // --- DODANA FUNKCIJA ZA ODKLEPANJE SIGNALOV ---
  const handleUnlockPost = async (postId: string, price: number) => {
    if (!userData.id) return;

    try {
      const TERMINAL_FEE = 0.20; 
      const authorShare = Math.floor(price * (1 - TERMINAL_FEE)); 
      const platformFee = price - authorShare;

      const postToUnlock = posts.find(p => p.id === postId);
      const authorId = postToUnlock?.user_id;
      
      if (!authorId) {
          alert("Error: Cannot find signal author.");
          return;
      }

      const { data: buyerWallet, error: walletErr } = await supabase
        .from('user_balances')
        .select('bulls_balance')
        .eq('user_id', userData.id)
        .maybeSingle();

      if (walletErr || !buyerWallet || buyerWallet.bulls_balance < price) {
        alert("Insufficient GAINS! Please top up your wallet.");
        return;
      }

      const { error: subError } = await supabase
        .from('user_balances')
        .update({ bulls_balance: buyerWallet.bulls_balance - price })
        .eq('user_id', userData.id);

      if (subError) throw subError;

      const { data: authorWallet } = await supabase
        .from('user_balances')
        .select('earned_balance')
        .eq('user_id', authorId)
        .maybeSingle();

      await supabase
        .from('user_balances')
        .update({ earned_balance: (authorWallet?.earned_balance || 0) + authorShare })
        .eq('user_id', authorId);

      const { error: unlockError } = await supabase
        .from('post_unlocks')
        .insert([{ 
            user_id: userData.id, 
            post_id: postId,
            fee_taken: platformFee 
        }]);

      if (unlockError) throw unlockError;

      alert(`Signal Unlocked! Author received ${authorShare} GAINS.`);
      fetchPostsFromDB();
      setUserData((prev: any) => ({ ...prev, gains_balance: buyerWallet.bulls_balance - price }));

    } catch (err) {
      console.error("Unlock error:", err);
      alert("Transaction failed. System error.");
    }
  };

  const handleFollow = async (targetAlias: string) => {
    if (targetAlias === userData.alias) return;

    const { data: prof } = await supabase.from('profiles').select('id').eq('alias', targetAlias).single();
    if (!prof) return; 

    const { data: existing } = await supabase.from('follows').select('*').eq('follower_id', userData.id).eq('following_id', prof.id).maybeSingle();

    if (existing) {
      await supabase.from('follows').delete().eq('follower_id', userData.id).eq('following_id', prof.id);
    } else {
      await supabase.from('follows').insert([{ follower_id: userData.id, following_id: prof.id }]);
    }
    fetchFollowData();
  };

  const handleVisitProfile = (alias: string) => {
    console.log("Navigating to node:", alias); 
    setSearchTerm("");
    setViewingAlias(alias);
    setActiveTab('profile');
    setActiveSubTab('info');
    fetchAllProfiles(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- POPRAVLJENO: IZRAČUN STATISTIKE IZ SIGNALOV (NE GLASOV) ---
  const fetchAllProfiles = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, alias, country, avatar_url, style, verify_source, earned_balance');
        
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return;
      } 
      
      // Beremo samo tiste objave, ki SO signali (imajo signal_status)
      const { data: postsData, error: postsError } = await supabase
        .from('posts_with_profiles')
        .select('user_id, signal_status')
        .not('signal_status', 'is', null); // Pridobi samo prave signale
        
      if (postsError) {
         console.error("Error fetching posts for stats:", postsError);
      }

      if (profilesData) {
        const formattedProfiles = profilesData.map((p: any) => {
          
          const userSignals = postsData ? postsData.filter((post: any) => post.user_id === p.id) : [];
          
          let totalWins = 0;
          let totalLosses = 0;
          let winRate = 0;
          
          userSignals.forEach((signal: any) => {
             // Win so zadeti TP-ji IN ročni profiti
             if (signal.signal_status === 'win' || signal.signal_status === 'manual_exit') {
                 totalWins += 1;
             } 
             else if (signal.signal_status === 'loss') {
                 totalLosses += 1;
             }
             // 'be_void' in 'open' se preskočita in ne vplivata na Win Rate!
          });
          
          const totalValidTrades = totalWins + totalLosses;
          
          if (totalValidTrades > 0) {
             winRate = Math.round((totalWins / totalValidTrades) * 100);
          }
          
          return {
            ...p,
            avatar: p.avatar_url,
            total_gain: totalWins,       // Sedaj kaže število pravih ZMAG
            max_drawdown: totalLosses,   // Sedaj kaže število pravih PORAZOV
            win_rate: winRate,           // % izračunan na podlagi pravih trejdov
            myfxbook_url: '' 
          };
        });
        
        setAllProfiles(formattedProfiles);
      }
    } catch (err) {
      console.error("System error fetching profiles:", err);
    }
  };

  const calculatePositionSize = () => {
    const bal = parseFloat(riskData.balance) || 0;
    const risk = parseFloat(riskData.riskPct) || 0;
    const pips = parseFloat(riskData.pips) || 0;

    if (pips === 0) return;

    const riskAmount = (bal * risk) / 100;
    const lotSize = riskAmount / (pips * 10);
    setCalcResult(Number(lotSize.toFixed(2)));
  };

  const sendPrivateMessage = async () => {
    if (!chatInput.trim() || !activeChat) return;
    
    const newMessagePayload = {
      from_alias: userData.alias,
      to_alias: activeChat,
      text: chatInput,
      is_read: false,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('messages').insert([newMessagePayload]);
    
    if (!error) {
      setChatInput("");
    } else {
      console.error("Error sending message:", error);
    }
  };

  const fetchEconomicCalendar = async () => {
    try {
      const API_KEY = 'd6cr7fpr01qgk7mjg2egd6cr7fpr01qgk7mjg2f0'; 
      const res = await fetch(`https://finnhub.io/api/v1/calendar/economic?token=${API_KEY}`);
      
      if (!res.ok) {
         throw new Error(`API returned status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data && data.economicCalendar) {
        const highImpact = data.economicCalendar.filter((n: any) => 
          n.impact === 'high' || n.impact === 'very high'
        ).slice(0, 3);
        
        setEconomicNews(highImpact);
        setMarketRisk(highImpact.length > 0 ? 'high' : 'low');
      }
    } catch (e) {
      console.log("News API unavailable (Free Tier).");
    }
  };

  // --- POPRAVLJENO: LEADERBOARD BERE PRAVE ZMAGE IN NE VEČ GLASOV ---
  const getDailyTopTraders = () => {
    const scores: { [key: string]: { alias: string, bulls: number, country: string } } = {};
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    if (!Array.isArray(posts)) return [];

    posts.forEach(p => {
      // Gledamo samo signale v zadnjih 24h, ki so označeni kot 'win' ali 'manual_exit'
      if (p.created_at && new Date(p.created_at).getTime() > twentyFourHoursAgo) {
        if (!scores[p.authorAlias]) {
          scores[p.authorAlias] = { alias: p.authorAlias, bulls: 0, country: p.authorCountry || '🏳️' };
        }
        // Štejemo ZMAGE (1 zmaga = 1 točka na leaderboardu) namesto bull glasov
        if (p.signal_status === 'win' || p.signal_status === 'manual_exit') {
            scores[p.authorAlias].bulls += 1; 
        }
      }
    });

    return Object.values(scores)
      // Filtriramo tiste, ki nimajo nobenih zmag, da ne zasedajo prostora s "0"
      .filter(trader => trader.bulls > 0)
      .sort((a, b) => b.bulls - a.bulls)
      .slice(0, 3);
  };

  const dailyTop3 = getDailyTopTraders();

  const fetchFollowData = async () => {
    let targetId = userData.id;

    if (viewingAlias && viewingAlias !== userData.alias) {
      const { data: prof } = await supabase.from('profiles').select('id').eq('alias', viewingAlias).maybeSingle();
      if (prof) targetId = prof.id;
      else { setFollowersCount(0); setFollowingCount(0); return; }
    }

    if (!targetId) return;

    const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId);
    const { count: following = 0 } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);

    if (viewingAlias && viewingAlias !== userData.alias) {
      const { data } = await supabase.from('follows').select('*').eq('follower_id', userData.id).eq('following_id', targetId).maybeSingle();
      setIsFollowingViewingUser(!!data);
    }
  };

  useEffect(() => {
    if (userData.id) {
      fetchFollowData();
    }
  }, [userData.id, viewingAlias]);

  const handleOpenFollowList = async (type: 'followers' | 'following') => {
    let targetId = userData.id;
    if (viewingAlias && viewingAlias !== userData.alias) {
      const { data: prof } = await supabase.from('profiles').select('id').eq('alias', viewingAlias).maybeSingle();
      if (prof) targetId = prof.id;
      else return;
    }

    setFollowModalTitle(type === 'followers' ? 'Network Nodes (Followers)' : 'Connected Nodes (Following)');
    setFollowList([]); 
    setFollowModalOpen(true);

    const field = type === 'followers' ? 'follower_id' : 'following_id';
    const matchField = type === 'followers' ? 'following_id' : 'follower_id';

    const { data: followData } = await supabase.from('follows').select(field).eq(matchField, targetId);

    if (followData && followData.length > 0) {
      const ids = followData.map((d: any) => d[field]);
      const { data: profiles } = await supabase.from('profiles').select('alias, country').in('id', ids);
      if (profiles) setFollowList(profiles);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {
        id: user.id,
        alias: userData.alias,
        bio: userData.bio,
        avatar_url: (userData as any).avatar || null,
        country: userData.country,
        style: userData.style,
        market: userData.market,
        verify_source: 'manual', 
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error("Profile save error:", error.message);
        alert("Error: " + error.message);
      } else {
        setIsEditing(false);
        setUserData((prev: any) => ({ 
            ...prev, 
            ...updates,
            avatar: updates.avatar_url 
        }));
        
        fetchAllProfiles(); 
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleVote = async (postId: any, type: 'bull' | 'bear') => {
    if (!userData.id) return;
    
    try {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', userData.id)
        .eq('post_id', postId)
        .maybeSingle();

      const postToUpdate = posts.find(p => p.id === postId);
      if (!postToUpdate) return;

      let updates: any = {};

      if (existingVote) {
        if (existingVote.vote_type === type) return; 

        if (existingVote.vote_type === 'bull' && type === 'bear') {
          updates = { bulls: Math.max(0, postToUpdate.bulls - 1), bears: postToUpdate.bears + 1 };
        } else if (existingVote.vote_type === 'bear' && type === 'bull') {
          updates = { bears: Math.max(0, postToUpdate.bears - 1), bulls: postToUpdate.bulls + 1 };
        }
        
        await supabase.from('votes').update({ vote_type: type }).eq('id', existingVote.id);
      } else {
        updates = type === 'bull' ? { bulls: postToUpdate.bulls + 1 } : { bears: postToUpdate.bears + 1 };
        await supabase.from('votes').insert([{ user_id: userData.id, post_id: postId, vote_type: type }]);
      }

      await supabase.from('posts').update(updates).eq('id', postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
      
      fetchAllProfiles(); 
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this signal?")) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      
      if (error) {
        alert("Error deleting: " + error.message);
      } else {
        fetchPostsFromDB();
        fetchAllProfiles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPost = async (signalData?: any) => {
    if (!newPost.trim() && !selectedImage && !signalData) {
        alert("Write something, upload intel, or fill out the signal details.");
        return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
          alert("Connection lost. Please re-login.");
          return;
      }

      let finalImageUrl = null;
      if (selectedImage) {
        const fileName = `${Date.now()}.jpg`;
        const base64Data = selectedImage.split(',')[1];
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
        await supabase.storage.from('post-images').upload(`public/${fileName}`, blob);
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(`public/${fileName}`);
        finalImageUrl = urlData.publicUrl;
      }

      const newPostData = {
        text: newPost,
        image_url: finalImageUrl,
        author_alias: userData.alias || user.user_metadata.alias || "Anonymous",
        author_country: userData.country || "🇸🇮",
        user_id: user.id,
        is_premium: isPremium,
        price_bulls: isPremium ? priceBulls : 0,
        pair: signalData?.pair || null,
        direction: signalData?.direction || null,
        entry_price: signalData?.entry || null,
        sl_price: signalData?.sl || null,
        tp_price: signalData?.tp || null,
        signal_status: signalData ? 'open' : null 
      };

      const { error } = await supabase.from('posts').insert([newPostData]).select();
      
      if (error) {
          console.error("Post error:", error);
          alert("Database Error: " + error.message);
      } else {
          setNewPost("");
          setSelectedImage(null);
          setIsPremium(false);
          setPriceBulls(5);
          fetchPostsFromDB();
          fetchAllProfiles();
      }
    } catch (err: any) {
      console.error(err);
      alert("System Error: " + err.message);
    }
  };

  const handleRegister = async () => {
    setLoginError("");

    if (!userData.agreedToTerms) {
      setLoginError("YOU MUST AGREE TO THE RISK DISCLAIMER.");
      return;
    }

    if (!userData.alias || !userData.password) {
      setLoginError("ALIAS AND KEY REQUIRED.");
      return;
    }
    if (userData.password !== userData.confirmPassword) {
      setLoginError("KEYS DO NOT MATCH.");
      return;
    }

    const cleanAlias = userData.alias.trim().replace(/\s+/g, '');
    const generatedEmail = `${cleanAlias.toLowerCase()}@terminal.com`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: generatedEmail,
        password: userData.password,
        options: {
          data: {
            alias: userData.alias.trim(),
            country: userData.country,
            style: userData.style,
            market: userData.market,
            bio: userData.bio,
            avatar: null,
            following: []
          }
        }
      });

      if (error) {
        if (error.message.toLowerCase().includes("user already registered") || error.message.toLowerCase().includes("already exists")) {
          setLoginError("ALIAS ALREADY TAKEN. CHOOSE ANOTHER.");
        } else {
          setLoginError(error.message.toUpperCase());
        }
        return;
      }

      if (data?.user) {
        setLoginAlias(userData.alias.trim()); 
        setIsRegistering(false); 
        setLoginError("REGISTRATION SUCCESSFUL. PLEASE LOGIN."); 
      }
    } catch (err: any) {
      setLoginError("DATABASE ERROR: ALIAS MIGHT BE TAKEN.");
    }
  };

  const handleLogin = async () => {
    if (isLocked) return;
    setLoginError("");
    if (!loginAlias || !loginPassword) {
      setLoginError("ALIAS AND KEY REQUIRED.");
      return;
    }

    const cleanAlias = loginAlias.toLowerCase().trim().replace(/\s+/g, '');
    const generatedEmail = `${cleanAlias}@terminal.com`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: generatedEmail, 
        password: loginPassword,
      });

      if (error) throw error;
      if (data?.user) {
        setUserData((prev: any) => ({ 
          ...prev, 
          ...data.user?.user_metadata,
          id: data.user!.id,
          email: data.user?.email || '' 
        }));
        setIsLoggedIn(true);
        window.location.reload();
      }
    } catch (err: any) {
      setLoginError("ACCESS DENIED: INVALID ALIAS OR KEY.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setActiveTab('feed');
  };

  useEffect(() => {
    if (!userData.alias) return;

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages')
        .select('*')
        .or(`from_alias.eq.${userData.alias},to_alias.eq.${userData.alias}`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase
      .channel('ticker_talker_live') 
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'messages'
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new;
          if (newMessage.to_alias === userData.alias || newMessage.from_alias === userData.alias) {
              setMessages(prev => {
                  if (prev.some(m => m.id === newMessage.id)) return prev;
                  return [...prev, newMessage];
              });

              if (newMessage.to_alias === userData.alias && activeChatRef.current !== newMessage.from_alias) {
                  setHasNewMessage(true); 
              }
          }
        } 
        
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new;
          if (updated.from_alias === activeChatRef.current && updated.to_alias === userData.alias && !updated.is_read) {
              return;
          }
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'posts' 
      }, () => {
        fetchPostsFromDB();
        fetchAllProfiles(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userData.alias]); 

  useEffect(() => {
    const markAsRead = async () => {
      if (activeChat && userData.alias) {
        setHasNewMessage(false);

        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('from_alias', activeChat)
          .eq('to_alias', userData.alias)
          .eq('is_read', false);

        setMessages(currentMessages => 
          currentMessages.map(m => 
            (m.from_alias === activeChat && m.to_alias === userData.alias) 
              ? { ...m, is_read: true } 
              : m
          )
        );

        fetchAllProfiles();
      }
    };
    markAsRead();
  }, [activeChat, userData.alias]);

  useEffect(() => {
    setMounted(true);
    fetchPostsFromDB(); 
    fetchEconomicCalendar();
    fetchAllProfiles(); 
    fetchAds(); 

    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data || !data.session) return;
        const session = data.session;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle(); 

        if (profileData) {
          const { data: balanceData } = await supabase.from('user_balances').select('bulls_balance').eq('user_id', session.user.id).maybeSingle();

          setUserData((prev: any) => ({
            ...prev,
            id: session.user.id,
            email: session.user.email || '',
            alias: profileData.alias || session.user.user_metadata.alias,
            bio: profileData.bio || session.user.user_metadata.bio,
            avatar: profileData.avatar_url || session.user.user_metadata.avatar,
            country: profileData.country || session.user.user_metadata.country,
            style: profileData.style || session.user.user_metadata.style,
            market: profileData.market || session.user.user_metadata.market,
            following: session.user.user_metadata.following || [],
            total_gain: profileData.total_gain || 0,
            max_drawdown: profileData.max_drawdown || 0,
            win_rate: profileData.win_rate || 0,
            verify_source: profileData.verify_source || 'manual',
            gains_balance: balanceData?.bulls_balance || 0,
            earned_balance: profileData.earned_balance || 0 
          }));
        } else {
          setUserData((prev: any) => ({
            ...prev,
            ...session.user.user_metadata,
            id: session.user.id,
            email: session.user.email || '',
            following: session.user.user_metadata.following || []
          }));
        }
        setIsLoggedIn(true);
      } catch (err) {
        console.error("Session check error:", err);
      }
    };
    checkUser();

    const fetchTwelveDataPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        
        if (data.error) {
          console.error("Server API Error:", data.error);
          return;
        }

        if (data['BTC/USD'] && data['ETH/USD'] && data['EUR/USD'] && data['XAU/USD']) {
          const newBtc = parseFloat(data['BTC/USD'].price);
          const newEur = parseFloat(data['EUR/USD'].price);
          const newXau = parseFloat(data['XAU/USD'].price);
          const newEth = parseFloat(data['ETH/USD'].price);

          const newPricesObject = { btc: newBtc, eur: newEur, xau: newXau, eth: newEth };

          setPriceFlash({
            btc: newBtc > prevPrices.current.btc ? 'text-green-500' : (newBtc < prevPrices.current.btc ? 'text-red-500' : ''),
            eur: newEur > prevPrices.current.eur ? 'text-green-500' : (newEur < prevPrices.current.eur ? 'text-red-500' : ''),
            xau: newXau > prevPrices.current.xau ? 'text-green-500' : (newXau < prevPrices.current.xau ? 'text-red-500' : ''),
            eth: newEth > prevPrices.current.eth ? 'text-green-500' : (newEth < prevPrices.current.eth ? 'text-red-500' : '')
          });

          setPrices(newPricesObject);
          prevPrices.current = newPricesObject;
          setTimeout(() => setPriceFlash({ btc: '', eur: '', xau: '', eth: '' }), 1000);
        }
      } catch (e) { 
        console.error("Fetch Error:", e); 
      }
    };

    fetchTwelveDataPrices();
    const priceInterval = setInterval(fetchTwelveDataPrices, 600000); 
    const newsInterval = setInterval(fetchEconomicCalendar, 3600000);

    return () => {
        clearInterval(priceInterval);
        clearInterval(newsInterval);
    };
  }, []);

  if (!mounted) return null;

  return (
    <main className={`flex min-h-screen flex-col items-center p-4 md:p-6 font-sans transition-colors duration-500 overflow-x-hidden ${
      darkMode ? 'bg-black text-white' : 'bg-white text-zinc-900'
    }`}>
        
      <style jsx global>{`
        /* CUSTOM TERMINAL SCROLLBAR */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
        /* Za Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.5) transparent;
        }
      `}</style>

      <button 
        type="button"
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-6 right-6 z-[250] px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
          darkMode ? 'bg-zinc-900 border-zinc-800 text-yellow-400' : 'bg-zinc-100 border-zinc-200 text-indigo-600 shadow-xl'
        }`}
      >
        {darkMode ? "☀️ Light UI" : "🌙 Dark UI"}
      </button>

      {followModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className={`w-full max-sm rounded-3xl border p-6 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl'}`}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500">{followModalTitle}</h3>
               <button type="button" onClick={() => setFollowModalOpen(false)} className="text-xl opacity-50 hover:opacity-100 transition-transform hover:rotate-90">✕</button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
               {followList.length > 0 ? followList.map((u, i) => (
                 <div key={i} onClick={() => { handleVisitProfile(u.alias); setFollowModalOpen(false); }} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:scale-[1.02] transition-all ${darkMode ? 'border-zinc-800 bg-zinc-800/20 hover:bg-zinc-800 text-white' : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100 text-zinc-900'}`}>
                    <span className="text-xl">{u.country || '🏳️'}</span>
                    <span className={`text-[11px] font-black uppercase`}>{u.alias}</span>
                 </div>
               )) : (
                 <p className="text-center text-[9px] opacity-40 uppercase py-10 font-bold italic">No connections found in current node</p>
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- LOGO --- */}
      <div className="flex flex-col items-center space-y-4 mb-10 text-center pt-10 px-4">
        <img 
          src="/Logo.png" 
          alt="Gain Wave Logo" 
          className={`h-24 md:h-32 object-contain transition-all duration-500 ${
            darkMode 
              ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' 
              : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-90'
          }`} 
        />
        <p className={`text-base md:text-xl font-light italic uppercase tracking-widest ${
          darkMode ? 'text-blue-300' : 'text-blue-600'
        }`}>
          "Where the word becomes profit."
        </p>
      </div>

      {!isLoggedIn ? (
        <AuthView 
          isRegistering={isRegistering} setIsRegistering={setIsRegistering}
          userData={userData} setUserData={setUserData}
          handleRegister={handleRegister} 
          handleLogin={handleLogin} prices={prices}
          loginAlias={loginAlias} setLoginAlias={setLoginAlias}
          loginPassword={loginPassword} setLoginPassword={setLoginPassword}
          loginError={loginError} darkMode={darkMode}
        />
      ) : (
        <div className="w-full max-w-7xl animate-in fade-in duration-700 overflow-visible">
          
          {showRiskCalc && (
            <div className="fixed inset-0 z-[500] flex items-start md:items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
              <div className={`my-auto w-full max-w-md p-6 md:p-8 rounded-[2.5rem] border animate-in zoom-in-95 duration-300 ${darkMode ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-white border-zinc-200 shadow-2xl'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-black uppercase tracking-widest text-blue-500">Risk Management</h2>
                  <button type="button" onClick={() => { setShowRiskCalc(false); setCalcResult(null); }} className="text-xs opacity-50 hover:opacity-100">CLOSE</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black uppercase opacity-50 mb-1 block">Account Balance ($)</label>
                    <input 
                        type="number" 
                        value={riskData.balance} 
                        onChange={(e) => setRiskData({...riskData, balance: e.target.value})} 
                        className={`w-full p-3 rounded-xl border text-sm font-mono ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black uppercase opacity-50 mb-1 block">Risk %</label>
                      <input 
                        type="number" 
                        value={riskData.riskPct} 
                        onChange={(e) => setRiskData({...riskData, riskPct: e.target.value})}
                        className={`w-full p-3 rounded-xl border text-sm font-mono ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase opacity-50 mb-1 block">Stop Loss (Pips)</label>
                      <input 
                        type="number" 
                        value={riskData.pips} 
                        onChange={(e) => setRiskData({...riskData, pips: e.target.value})} 
                        className={`w-full p-3 rounded-xl border text-sm font-mono ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} 
                      />
                    </div>
                  </div>
                  <button type="button" onClick={calculatePositionSize} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg">
                    Calculate Position
                  </button>
                  {calcResult !== null && (
                    <div className={`mt-6 p-6 rounded-2xl border text-center animate-in fade-in slide-in-from-top-2 ${darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                      <span className="text-[9px] font-black uppercase text-blue-500 block mb-1">Recommended Lot Size</span>
                      <span className="text-3xl font-black font-mono tracking-tighter">{calcResult} Lots</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* OSREDNJI ISKALNIK */}
          <div className="max-w-2xl mx-auto mb-10 w-full px-4">
            <SearchBar 
              onSearch={setSearchTerm} 
              posts={posts}
              allUsers={allProfiles} 
              onVisitProfile={handleVisitProfile}
              darkMode={darkMode} 
            />
          </div>

          <div className={`grid gap-8 mt-6 ${activeTab === 'profile' ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1'}`}>
            
            {activeTab === 'profile' && (
              <div className="md:col-span-1 space-y-4">
                <ProfileSidebar 
                  userData={viewingAlias 
                    ? { 
                        id: posts.find(p => p.authorAlias === viewingAlias)?.user_id || allProfiles.find(p => p.alias === viewingAlias)?.id || '', 
                        alias: viewingAlias, 
                        bio: "Terminal Node", 
                        avatar: posts.find(p => p.authorAlias === viewingAlias)?.authorAvatar || allProfiles.find(p => p.alias === viewingAlias)?.avatar || null,
                        country: posts.find(p => p.authorAlias === viewingAlias)?.authorCountry || allProfiles.find(p => p.alias === viewingAlias)?.country || '🏳️',
                        style: allProfiles.find(p => p.alias === viewingAlias)?.style || 'Trader', 
                        market: 'Global',
                        myfxbook: allProfiles.find(p => p.alias === viewingAlias)?.myfxbook_url || '',
                        total_gain: allProfiles.find(p => p.alias === viewingAlias)?.total_gain || 0,
                        max_drawdown: allProfiles.find(p => p.alias === viewingAlias)?.max_drawdown || 0,
                        win_rate: allProfiles.find(p => p.alias === viewingAlias)?.win_rate || 0,
                        verify_source: allProfiles.find(p => p.alias === viewingAlias)?.verify_source || 'manual'
                      } 
                    : userData
                  } 
                  setUserData={setUserData}
                  isEditing={isEditing} 
                  setIsEditing={setIsEditing}
                  handleLogout={handleLogout} 
                  setActiveTab={setActiveTab} 
                  activeTab={activeTab}
                  handleSaveProfile={handleSaveProfile} 
                  darkMode={darkMode}
                  messages={messages}
                  setActiveChat={setActiveChat}
                  followersCount={followersCount}
                  followingCount={followingCount}
                  onFollowersClick={() => handleOpenFollowList('followers')}
                  onFollowingClick={() => handleOpenFollowList('following')}
                  setViewingAlias={setViewingAlias}
                  hasNotification={hasNewMessage} 
                  isOwnProfile={!viewingAlias || viewingAlias === userData.alias}
                  activeSubTab={activeSubTab}
                  setActiveSubTab={setActiveSubTab}
                  onOpenRiskCalc={() => setShowRiskCalc(true)}
                  onVisitProfile={handleVisitProfile} 
                />

                {viewingAlias && viewingAlias !== userData.alias && (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-500 px-2">
                    <button 
                      type="button"
                      onClick={() => handleFollow(viewingAlias)}
                      className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                        isFollowingViewingUser
                          ? (darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-400')
                          : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-lg'
                      }`}
                    >
                      {isFollowingViewingUser ? '✓ Following' : '➕ Follow Node'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveChat(viewingAlias)}
                      className="w-full py-3 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all border border-blue-500 shadow-lg"
                    >
                      ✉️ Send Message
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className={(activeTab === 'profile') ? 'md:col-span-3 w-full' : 'w-full'}>
              {activeTab === 'feed' ? (
                <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
                  <div className="w-full md:w-64 space-y-4">
                    <div className={`p-6 rounded-[2.5rem] border transition-all duration-500 ${
                      darkMode ? 'bg-zinc-900/40 border-zinc-800 shadow-2xl backdrop-blur-md' : 'bg-zinc-50 border-zinc-200 shadow-inner'
                    }`}>
                      <div className="flex items-center justify-center gap-2 mb-6">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <h3 className={`text-[9px] font-black uppercase tracking-[0.3em] ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>Live Terminal</h3>
                      </div>
                      <div className="space-y-5">
                        <div className="flex justify-between items-center group">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-500 font-mono tracking-tighter uppercase">BTC/USD</span>
                          </div>
                          <div className={`text-[10px] font-mono ${darkMode ? 'text-zinc-200' : 'text-zinc-900'} ${priceFlash.btc}`}>
                            ${prices?.btc?.toLocaleString(undefined, { minimumFractionDigits: 1 }) || '0.0'}
                          </div>
                        </div>

                        <div className="flex justify-between items-center group pt-3 border-t border-zinc-800/10">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-500 font-mono tracking-tighter uppercase">EUR/USD</span>
                          </div>
                          <div className={`text-[10px] font-mono ${darkMode ? 'text-zinc-200' : 'text-zinc-900'} ${priceFlash.eur}`}>
                            {prices?.eur?.toFixed(4) || '1.0820'}
                          </div>
                        </div>

                        <div className="flex justify-between items-center group pt-3 border-t border-zinc-800/10">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-yellow-500 font-mono tracking-tighter uppercase">XAU/USD</span>
                          </div>
                          <div className={`text-[10px] font-mono ${darkMode ? 'text-zinc-200' : 'text-zinc-900'} ${priceFlash.xau}`}>
                            ${prices?.xau?.toFixed(1) || '0.0'}
                          </div>
                        </div>

                        <div className="flex justify-between items-center group pt-3 border-t border-zinc-800/10">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-purple-500 font-mono tracking-tighter uppercase">ETH/USD</span>
                          </div>
                          <div className={`text-[10px] font-mono ${darkMode ? 'text-zinc-200' : 'text-zinc-900'} ${priceFlash.eth}`}>
                            ${prices?.eth?.toLocaleString() || '0.0'}
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className={`flex items-center justify-around px-2 py-4 rounded-[2.5rem] border transition-all duration-500 ${
                      darkMode ? 'bg-zinc-900/30 border-zinc-800 shadow-xl backdrop-blur-md' : 'bg-zinc-50 border-zinc-200 shadow-sm'
                    }`}>
                      <AnalogClock label="TKY" timezone="Asia/Tokyo" darkMode={darkMode} />
                      <AnalogClock label="LON" timezone="Europe/London" darkMode={darkMode} />
                      <AnalogClock label="NYC" timezone="America/New_York" darkMode={darkMode} />
                    </div>

                    <div className={`p-5 rounded-[2.5rem] border transition-all duration-700 ${
                        marketRisk === 'high' 
                            ? (darkMode ? 'bg-red-950/20 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-red-50 border-red-200 shadow-lg')
                            : (darkMode ? 'bg-zinc-900/40 border-zinc-800 shadow-md' : 'bg-zinc-50 border-zinc-200 shadow-sm')
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${marketRisk === 'high' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                <h3 className={`text-[9px] font-black uppercase tracking-widest ${marketRisk === 'high' ? 'text-red-500' : (darkMode ? 'text-blue-500' : 'text-blue-600')}`}>
                                    {marketRisk === 'high' ? 'High Impact' : 'Low Risk Day'}
                                </h3>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {economicNews.length > 0 ? economicNews.map((news, idx) => (
                                <div key={idx} className={`flex flex-col gap-1 p-2 rounded-xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                    <span className={`text-[8px] font-bold uppercase ${news.impact === 'high' ? 'text-red-500' : 'opacity-50'}`}>
                                        {news.time || 'Today'} {news.country}
                                    </span>
                                    <p className="text-[10px] font-black uppercase leading-tight tracking-tight">{news.event}</p>
                                </div>
                            )) : (
                                <p className="text-[8px] opacity-40 uppercase text-center py-4 font-bold italic">No major releases</p>
                            )}
                        </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 px-2">
                      <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>
                        Global Terminal Stream
                      </h3>
                      <button type="button" onClick={() => handleVisitProfile(userData.alias)}
                        className={`w-full md:w-auto px-4 py-2 border rounded-full text-[9px] font-black uppercase tracking-tighter ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 shadow-lg'
                        }`}> Access Personal Terminal </button>
                    </div>

                    <AdBanner 
                      ads={activeAds} 
                      darkMode={darkMode} 
                      onPromote={() => setIsAdModalOpen(true)} 
                    />

                    <div className={`p-2 rounded-[1.5rem] border transition-all flex flex-col md:flex-row items-center gap-2 pr-2 mb-6 ${
                      darkMode ? 'bg-zinc-900/60 border-zinc-800 shadow-xl' : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                      <div className="flex items-center w-full gap-2">
                        <div className="w-10 h-10 ml-1 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-black uppercase text-xs border border-blue-500/30 shrink-0">
                          {userData?.alias?.charAt(0) || 'G'}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Broadcast a fast signal (e.g. BTC LONG @ 51k)..." 
                          value={newPost} 
                          onChange={(e) => setNewPost(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPost()}
                          className={`flex-1 bg-transparent text-[10px] md:text-[11px] font-mono outline-none px-2 ${
                            darkMode ? 'text-white placeholder-zinc-600' : 'text-zinc-900 placeholder-zinc-400'
                          }`}
                        />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end px-2 pb-2 md:pb-0">
                        <button 
                          type="button"
                          onClick={() => setIsPremium(!isPremium)}
                          className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                            isPremium 
                              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' 
                              : (darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:bg-zinc-200')
                          }`}
                          title="Premium ali Free objava"
                        >
                          {isPremium ? '🔒 Prem' : '🔓 Free'}
                        </button>

                        {isPremium && (
                          <div className="flex items-center gap-1 shrink-0 px-1">
                            <input 
                              type="number" 
                              min="0"
                              value={priceBulls === 0 ? "" : priceBulls} 
                              placeholder="0"
                              onChange={(e) => setPriceBulls(Math.max(0, parseInt(e.target.value) || 0))}
                              onFocus={(e) => e.target.select()}
                              className={`w-10 py-2 text-center rounded-lg text-[10px] font-mono border ${darkMode ? 'bg-black border-yellow-500/50 text-yellow-500' : 'bg-white border-yellow-400 text-yellow-600'} outline-none`}
                            />
                            <span className="text-[8px] font-black uppercase text-yellow-500 tracking-tighter hidden sm:inline">GAINS</span>
                          </div>
                        )}

                        <button 
                          type="button"
                          onClick={() => handleAddPost()} 
                          disabled={!newPost.trim() && !selectedImage}
                          className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
                            (newPost.trim() || selectedImage) 
                              ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg' 
                              : (darkMode ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed')
                          }`}
                        >
                          Send
                        </button>
                      </div>
                    </div>

                    <div className="lg:hidden mb-6 overflow-x-auto no-scrollbar -mx-4 px-4">
                      <div className="flex gap-3 pb-2">
                        {dailyTop3 && dailyTop3.length > 0 ? dailyTop3.map((trader: any, idx: number) => (
                          <div 
                            key={trader.alias} 
                            onClick={() => handleVisitProfile(trader.alias)}
                            className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-2xl border min-w-[140px] transition-all active:scale-95 ${
                              idx === 0 
                                ? (darkMode ? 'bg-orange-500/10 border-orange-500/40' : 'bg-orange-50 border-orange-200 shadow-sm') 
                                : (darkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm')
                            }`}
                          >
                            <span className="text-lg">{idx === 0 ? '👑' : idx === 1 ? '🥈' : '🥉'}</span>
                            <div className="flex flex-col min-w-0">
                              <span className={`text-[9px] font-black uppercase truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                                {trader.alias}
                              </span>
                              <span className={`text-[10px] font-mono font-black ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                +{trader.bulls} WINS
                              </span>
                            </div>
                          </div>
                        )) : null}
                      </div>
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mt-1 px-1 italic">🔥 Top Daily Nodes</p>
                    </div>

                    <GlobalFeed 
                      posts={posts} 
                      userData={userData} 
                      handleVote={handleVote} 
                      handleFollow={handleFollow} 
                      darkMode={darkMode} 
                      onVisitProfile={handleVisitProfile}
                      handleDeletePost={handleDeletePost}
                      handleUnlock={handleUnlockPost} 
                      handleSignalAction={handleSignalAction}
                    />
                  </div>

                  <div className="hidden lg:block w-64">
                    <div className={`p-6 rounded-[2.5rem] border sticky top-6 ${
                      darkMode ? 'bg-zinc-900/40 border-zinc-800 shadow-2xl backdrop-blur-md' : 'bg-zinc-50 border-zinc-200 shadow-inner'
                    }`}>
                      <h3 className={`text-[9px] font-black uppercase tracking-[0.3em] mb-6 ${darkMode ? 'text-orange-500' : 'text-orange-600'}`}>🔥 Daily Leaders</h3>
                      <div className="space-y-4">
                        {dailyTop3 && dailyTop3.length > 0 ? dailyTop3.map((trader: any, idx: number) => (
                          <div key={trader.alias} onClick={() => handleVisitProfile(trader.alias)}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer hover:scale-105 ${
                              idx === 0 ? (darkMode ? 'bg-orange-500/10 border-orange-500/40' : 'bg-orange-50 border-orange-200') : (darkMode ? 'bg-zinc-800/20 border-transparent' : 'bg-white border-zinc-100')
                            }`}>
                            <div className="flex items-center gap-3">
                              <span className="text-sm">{idx === 0 ? '👑' : idx === 1 ? '🥈' : '🥉'}</span>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase truncate w-24">{trader.alias}</span>
                                <span className="text-[8px] opacity-60 uppercase">{trader.country}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-mono font-black ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>+{trader.bulls}</span>
                          </div>
                        )) : <p className="text-[9px] uppercase opacity-30 text-center py-10">No signals</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-500 space-y-6 w-full">
                  <div className="w-full overflow-visible pb-32">
                    {activeSubTab === 'info' ? (
                      <FeedView 
                        userData={viewingAlias 
                          ? { 
                              alias: viewingAlias, 
                              bio: 'Terminal Node', 
                              avatar: posts.find(p => p.authorAlias === viewingAlias)?.authorAvatar || allProfiles.find(p => p.alias === viewingAlias)?.avatar || null,
                              country: posts.find(p => p.authorAlias === viewingAlias)?.authorCountry || allProfiles.find(p => p.alias === viewingAlias)?.country || '🏳️' 
                            } 
                          : userData
                        }
                        posts={posts.filter(p => p.authorAlias === (viewingAlias || userData.alias))} 
                        onBack={() => { setViewingAlias(null); setActiveTab('feed'); }}
                        handleAddPost={handleAddPost} 
                        newPost={newPost} 
                        setNewPost={setNewPost}
                        handleImageChange={(e) => {
                          if (e.target.files?.[0]) {
                            const reader = new FileReader();
                            reader.onload = (event) => setSelectedImage(event.target?.result as string);
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                        selectedImage={selectedImage} 
                        darkMode={darkMode} 
                        handleVote={handleVote} 
                        isOwnProfile={!viewingAlias || viewingAlias === userData.alias}
                        handleDeletePost={handleDeletePost}
                        isPremium={isPremium}
                        setIsPremium={setIsPremium}
                        priceBulls={priceBulls}
                        setPriceBulls={setPriceBulls}
                        handleSignalAction={handleSignalAction}
                      />
                    ) : activeSubTab === 'journal' ? ( 
                      <TradingJournal 
                        userId={viewingAlias ? (posts.find(p => p.authorAlias === viewingAlias)?.user_id || allProfiles.find(p => p.alias === viewingAlias)?.id) : userData.id}
                        isOwnProfile={!viewingAlias || viewingAlias === userData.alias}
                        darkMode={darkMode}
                      />
                    ) : ( 
                      <WalletView 
                        userData={userData} 
                        darkMode={darkMode} 
                        onPromote={() => setIsAdModalOpen(true)}
                        setActiveChat={setActiveChat} 
                        updateUserBalance={updateUserBalance} 
                        handleStripePurchase={handleStripePurchase}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeChat && (
        <div className={`fixed bottom-4 right-4 left-4 md:left-auto md:w-80 z-[300] shadow-2xl rounded-3xl border animate-in slide-in-from-bottom-5 duration-300 overflow-hidden ${
          darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl'
        }`}>
          <div className="p-4 bg-blue-600 flex justify-between items-center text-white">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Terminal Chat</span>
              <span className="text-[8px] opacity-80 uppercase font-bold">Line to {activeChat}</span>
            </div>
            <button type="button" onClick={() => setActiveChat(null)} className="text-sm hover:rotate-90 transition-transform">✕</button>
          </div>
          <div className="h-64 md:h-72 overflow-y-auto p-4 space-y-3 flex flex-col">
            {messages.filter(m => (m.from_alias === userData.alias && m.to_alias === activeChat) || (m.from_alias === activeChat && m.to_alias === userData.alias))
              .map(m => (
                <div key={m.id} className={`max-w-[85%] p-3 rounded-2xl text-[10px] font-medium ${
                  m.from_alias === userData.alias 
                    ? 'bg-blue-600 text-white self-end rounded-br-none shadow-md' 
                    : (darkMode ? 'bg-zinc-900 text-zinc-200 self-start rounded-bl-none border border-zinc-700' : 'bg-zinc-100 text-zinc-900 self-start rounded-bl-none')
                }`}>
                  <p>{m.text}</p>
                  <span className="text-[7px] opacity-40 mt-1 block text-right">
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                  </span>
                </div>
              ))}
          </div>
          <div className={`p-4 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'} flex gap-2`}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendPrivateMessage()}
              placeholder="Type message..." className={`flex-1 bg-transparent text-[10px] outline-none font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`} />
            <button type="button" onClick={sendPrivateMessage} className="text-blue-500 font-black text-[10px] uppercase tracking-widest">Send</button>
          </div>
        </div>
      )}

      <AdCreatorModal 
        isOpen={isAdModalOpen} 
        onClose={() => setIsAdModalOpen(false)} 
        onLaunch={handleLaunchAd}
        darkMode={darkMode}
        balance={userData.gains_balance}
      />

      <footer className={`w-full max-w-7xl mx-auto mt-12 mb-6 p-6 rounded-3xl border text-center transition-all ${
        darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`}>
        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          ⚠️ High Risk Warning & Disclaimer
        </h4>
        <p className={`text-[8px] uppercase tracking-wider leading-relaxed text-justify md:text-center opacity-60 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Trading in financial markets (Forex, Crypto, Stocks) carries a high level of risk and may not be suitable for all investors. You could lose some or all of your initial capital. The information, signals, and node data provided on <strong className={darkMode ? 'text-white' : 'text-black'}>GAIN WAVE</strong> are for educational and informational purposes only and do <strong className="text-red-500">NOT</strong> constitute financial or investment advice. GAIN WAVE and its creators are not liable for any financial losses incurred from using this platform. Past performance of any Node is not indicative of future results. All trading decisions are strictly your own responsibility.
        </p>
        <div className="mt-4 pt-4 border-t border-zinc-500/20 text-[7px] font-bold uppercase tracking-widest opacity-40">
          © {new Date().getFullYear()} GAIN WAVE Network. All rights reserved.
        </div>
      </footer>
    </main>
  );
}