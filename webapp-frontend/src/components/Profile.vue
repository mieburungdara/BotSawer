<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps(['targetId'])
const emit = defineEmits(['nav', 'open-dm'])
const { t } = useI18n()
const isLoading = ref(true)
const error = ref(null)
const user = ref({
  name: '',
  username: '',
  bio: '',
  verified: false,
  followers: 0,
  following: 0,
  contents: 0,
  donations: 0,
  photo_url: null,
  telegram_id: null,
  badges: [],
  is_own: true,
  is_following: false,
  instagram_url: null,
  tiktok_url: null,
  facebook_url: null,
  portfolio_url: null,
  is_blocked: false
})
const systemConfig = ref({
  bot_username: 'VesperBot',
  app_name: 'app'
})

const gallery = ref([])
const showFollowModal = ref(false)
const showShareModal = ref(false)
const showEditModal = ref(false)
const editData = ref({
    name: '',
    bio: '',
    instagram_url: '',
    tiktok_url: '',
    facebook_url: '',
    portfolio_url: ''
})
const followModalTitle = ref('')
const followList = ref([])
const followLoading = ref(false)

const fetchProfileData = async (targetId = null) => {
  isLoading.value = true
  error.value = null
  try {
    const tg = window.Telegram?.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const botId = urlParams.get('bot_id') || localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: tg?.initData,
            botId: botId,
            action: 'get',
            targetId: targetId
        })
    });
    const result = await response.json();
    if (result.success) {
      // Fetch Config for sharing
      const configRes = await fetch('/vesper/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId: botId })
      });
      const configResult = await configRes.json();
      if (configResult.success) {
          systemConfig.value.bot_username = configResult.data.bot_username;
          systemConfig.value.app_name = configResult.data.app_name.toLowerCase().replace(/\s/g, '');
      }

      const data = result.data;
      user.value = {
          telegram_id: data.telegram_id,
          name: data.display_name || data.first_name || 'User',
          username: '@' + (data.username || 'user'),
          bio: data.bio || 'Digital Content Creator',
          verified: data.is_verified === 1,
          followers: 0, // Will fetch from follow stats
          following: 0,
          contents: data.stats.total_media,
          donations: data.stats.total_donations,
          photo_url: data.photo_url,
          badges: data.stats.badges || [],
          is_own: data.is_own,
          is_following: data.is_following,
          instagram_url: data.instagram_url,
          tiktok_url: data.tiktok_url,
          facebook_url: data.facebook_url,
          portfolio_url: data.portfolio_url,
          is_blocked: data.is_blocked || false
      };
      
      // Fetch Follow Stats
      fetchFollowStats(data.telegram_id);

      if (data.contents) {
          gallery.value = data.contents.map(c => ({
              id: c.id,
              short_id: c.short_id,
              privacy: c.privacy || 'public',
              type: c.media && c.media[0] ? c.media[0].file_type : 'photo',
              url: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.value.name || 'C') + '&background=random',
              views: 'New'
          }));
      }
    } else {
        error.value = result.message || 'Gagal memuat profil.';
    }
  } catch (e) {
    console.error("Profile Fetch Error:", e);
    error.value = 'Terjadi kesalahan jaringan atau server.';
  } finally {
    isLoading.value = false
  }
}

const fetchFollowStats = async (targetId) => {
    try {
        const tg = window.Telegram?.WebApp;
        const response = await fetch('/vesper/api/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                action: 'get_stats',
                targetId: targetId
            })
        });
        const result = await response.json();
        if (result.success) {
            user.value.followers = result.data.followers;
            user.value.following = result.data.following;
        }
    } catch (e) {
        console.error("Follow Stats Error:", e);
    }
}

const openFollowList = async (type) => {
    followModalTitle.value = type === 'followers' ? t('profile.followersList') : t('profile.followingList');
    showFollowModal.value = true;
    followLoading.value = true;
    followList.value = [];
    
    try {
        const tg = window.Telegram?.WebApp;
        const response = await fetch('/vesper/api/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                action: type === 'followers' ? 'get_followers' : 'get_following',
                targetId: user.value.telegram_id
            })
        });
        const result = await response.json();
        if (result.success) {
            followList.value = result.data.list;
        }
    } catch (e) {
        console.error("Follow List Error:", e);
    } finally {
        followLoading.value = false;
    }
}

const toggleFollow = async (targetUserId = null) => {
    const targetId = targetUserId || user.value.telegram_id;
    const isTargetMainProfile = targetId === user.value.telegram_id;
    
    try {
        const tg = window.Telegram?.WebApp;
        const currentStatus = isTargetMainProfile ? user.value.is_following : false; // For list items we might need more state
        const action = currentStatus ? 'unfollow' : 'follow';
        
        const response = await fetch('/vesper/api/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                action: action,
                targetId: targetId
            })
        });
        const result = await response.json();
        if (result.success) {
            if (isTargetMainProfile) {
                user.value.is_following = !user.value.is_following;
                fetchFollowStats(user.value.telegram_id);
            } else {
                // If clicked from a list, we might want to refresh the list or just show success
                openFollowList(followModalTitle.value.includes(t('profile.followers')) ? 'followers' : 'following');
            }
        }
    } catch (e) {
        console.error("Toggle Follow Error:", e);
    }
}

const navigateToUser = (userId) => {
    showFollowModal.value = false;
    fetchProfileData(userId);
}

const getProfileLink = () => {
    return `https://t.me/${systemConfig.value.bot_username}/${systemConfig.value.app_name}?startapp=profile_${user.value.telegram_id}`;
}

const copyLink = () => {
    navigator.clipboard.writeText(getProfileLink());
    window.Telegram?.WebApp?.showAlert(t('profile.linkCopied'));
    showShareModal.value = false;
}

const shareTelegram = () => {
    const text = encodeURIComponent(`Check out ${user.value.name}'s profile on Vesper!`);
    const url = `https://t.me/share/url?url=${encodeURIComponent(getProfileLink())}&text=${text}`;
    window.Telegram?.WebApp?.openTelegramLink(url);
    showShareModal.value = false;
}

const shareTwitter = () => {
    const text = encodeURIComponent(`Check out ${user.value.name}'s profile on Vesper! #VesperApp`);
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(getProfileLink())}&text=${text}`;
    window.open(url, '_blank');
    showShareModal.value = false;
}

const openEditModal = () => {
    editData.value = {
        name: user.value.name,
        bio: user.value.bio,
        instagram_url: user.value.instagram_url || '',
        tiktok_url: user.value.tiktok_url || '',
        facebook_url: user.value.facebook_url || '',
        portfolio_url: user.value.portfolio_url || ''
    }
    showEditModal.value = true
}

const toggleBlock = async () => {
    try {
        const tg = window.Telegram?.WebApp;
        const botId = localStorage.getItem('vesper_bot_id');
        const action = user.value.is_blocked ? 'unblock' : 'block';
        
        // Confirm block
        if (!user.value.is_blocked) {
            const confirmed = await new Promise(resolve => {
                tg?.showConfirm(`Apakah Anda yakin ingin memblokir ${user.value.name}? Mereka tidak akan bisa mengirim pesan atau melihat profil Anda.`, (ok) => resolve(ok));
            });
            if (!confirmed) return;
        }

        const response = await fetch('/vesper/api/block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                action: action,
                targetId: user.value.telegram_id
            })
        });
        const result = await response.json();
        if (result.success) {
            user.value.is_blocked = !user.value.is_blocked;
            // Refresh follow stats as block causes auto-unfollow
            fetchFollowStats(user.value.telegram_id);
            tg?.showAlert(result.message);
            
            // If just blocked, we might want to refresh to hide contents
            if (user.value.is_blocked) {
                fetchProfileData(user.value.telegram_id);
            }
        } else {
            tg?.showAlert(result.message || 'Gagal mengubah status blokir');
        }
    } catch (e) {
        console.error("Toggle Block Error:", e);
    }
}

const saveProfile = async () => {
    try {
        const response = await fetch('/vesper/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: window.Telegram?.WebApp?.initData,
                botId: botId,
                action: 'update',
                profile_data: editData.value
            })
        });
        const result = await response.json();
        if (result.success) {
            showEditModal.value = false;
            fetchProfileData(user.value.telegram_id);
            window.Telegram?.WebApp?.showScanQrPopup({ text: t('profile.updated') }); // Using simple alert/toast would be better but this works as a quick feedback
            // Actually let's use HapticFeedback if available
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        } else {
            alert(result.message || 'Gagal memperbarui profil');
        }
    } catch (e) {
        console.error("Save Profile Error:", e);
    }
}

const togglePrivacy = async (item) => {
  if (!user.value.is_own) return;
  
  const newPrivacy = item.privacy === 'public' ? 'followers_only' : 'public';
  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId: botId,
        action: 'update_privacy',
        short_id: item.short_id,
        privacy: newPrivacy
      })
    });
    
    const result = await response.json();
    if (result.success) {
      item.privacy = newPrivacy;
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
  } catch (e) {
    console.error("Toggle Privacy Error:", e);
  }
}

onMounted(() => fetchProfileData(props.targetId))
watch(() => props.targetId, (newId) => fetchProfileData(newId))

const openExternalLink = (url, type) => {
    if (!url) return;
    
    // Clean input to get username/slug
    let cleanVal = url.replace(/https?:\/\/(www\.)?(instagram|tiktok|facebook|fb)\.com\//, '')
                      .replace(/\/$/, '')
                      .replace(/^@/, '');

    let deepLink = '';
    let webUrl = url.startsWith('http') ? url : `https://${url}`;

    if (type === 'instagram') {
        deepLink = `instagram://user?username=${cleanVal}`;
        if (!url.includes('instagram.com')) webUrl = `https://instagram.com/${cleanVal}`;
    } else if (type === 'tiktok') {
        deepLink = `tiktok://user/@${cleanVal}`;
        if (!url.includes('tiktok.com')) webUrl = `https://tiktok.com/@${cleanVal}`;
    } else if (type === 'facebook') {
        const fullFbUrl = url.includes('facebook.com') ? url : `https://facebook.com/${cleanVal}`;
        deepLink = `fb://facewebmodal/f?href=${encodeURIComponent(fullFbUrl)}`;
        webUrl = fullFbUrl;
    }

    if (deepLink) {
        // Trigger the native app only (no fallback to web)
        window.location.href = deepLink;
    } else {
        window.open(webUrl, '_blank');
    }
}
</script>

<template>
  <div class="relative min-h-screen">
    <div class="space-y-6 animate-in fade-in duration-500 pb-24 px-1">
        <!-- Error State -->
        <div v-if="error" class="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
            <div class="text-5xl">⚠️</div>
            <h2 class="text-lg font-black uppercase text-red-500">{{ $t('profile.noContent') }}</h2>
            <p class="text-xs text-tg-hint leading-relaxed">{{ error }}</p>
            <button @click="fetchProfileData()" class="bg-tg-button text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-tg-button/20 active:scale-95 transition-all">
                COBA LAGI
            </button>
        </div>

        <!-- Skeleton Loading State -->
        <div v-else-if="isLoading" class="space-y-8 animate-pulse pt-4">
            <div class="flex flex-col items-center">
                <div class="w-28 h-28 rounded-[2rem] bg-white/5"></div>
                <div class="h-6 w-32 bg-white/5 rounded-full mt-4"></div>
                <div class="h-4 w-24 bg-white/5 rounded-full mt-2"></div>
            </div>
            <div class="h-16 w-full bg-white/5 rounded-3xl"></div>
            <div class="grid grid-cols-3 gap-2">
                <div v-for="i in 9" :key="i" class="aspect-square bg-white/5 rounded-xl"></div>
            </div>
        </div>
        
        <template v-else>
            <!-- Profile Header -->
            <div class="flex flex-col items-center pt-4">
                <div class="relative group">
                    <div class="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-tg-button via-purple-500 to-pink-500 p-1 shadow-2xl shadow-tg-button/30 transition-transform duration-500 group-hover:scale-105">
                        <img :src="user.photo_url || 'https://ui-avatars.com/api/?name=' + user.name + '&background=17212b&color=fff&size=256'" class="w-full h-full rounded-[2.3rem] object-cover border-4 border-tg-secondary" />
                    </div>
                    <div v-if="user.verified" class="absolute -bottom-1 -right-1 w-9 h-9 bg-blue-500 rounded-full border-4 border-tg-bg flex items-center justify-center text-white text-[10px] shadow-lg">
                        ✔
                    </div>
                    
                    <!-- Share Button -->
                    <button @click="showShareModal = true" class="absolute -top-1 -right-1 w-10 h-10 bg-tg-secondary/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center text-lg shadow-xl active:scale-90 transition-all">
                        📤
                    </button>
                </div>
                
                <div class="text-center mt-5">
                    <h2 class="text-2xl font-black tracking-tight">{{ user.name }}</h2>
                    <div class="flex items-center justify-center gap-1.5 mt-1">
                        <span class="text-tg-button text-[11px] font-black uppercase tracking-widest">{{ user.username }}</span>
                        <span class="w-1 h-1 bg-tg-hint/30 rounded-full"></span>
                        <span class="text-tg-hint text-[10px] font-bold uppercase tracking-widest">Creator</span>
                    </div>
                    <p class="text-tg-hint text-xs mt-4 px-8 leading-relaxed font-medium italic opacity-80">
                        "{{ user.bio }}"
                    </p>

                    <!-- Social Links -->
                    <div v-if="user.instagram_url || user.tiktok_url || user.facebook_url || user.portfolio_url" class="flex justify-center gap-3 mt-4">
                        <button v-if="user.instagram_url" @click="openExternalLink(user.instagram_url, 'instagram')" class="w-10 h-10 glass rounded-xl border border-white/5 flex items-center justify-center grayscale hover:grayscale-0 hover:border-pink-500/30 transition-all">
                            <span class="text-lg">📸</span>
                        </button>
                        <button v-if="user.tiktok_url" @click="openExternalLink(user.tiktok_url, 'tiktok')" class="w-10 h-10 glass rounded-xl border border-white/5 flex items-center justify-center grayscale hover:grayscale-0 hover:border-white/30 transition-all">
                            <span class="text-lg">🎵</span>
                        </button>
                        <button v-if="user.facebook_url" @click="openExternalLink(user.facebook_url, 'facebook')" class="w-10 h-10 glass rounded-xl border border-white/5 flex items-center justify-center grayscale hover:grayscale-0 hover:border-blue-600/30 transition-all">
                            <span class="text-lg">👥</span>
                        </button>
                        <button v-if="user.portfolio_url" @click="openExternalLink(user.portfolio_url, 'portfolio')" class="w-10 h-10 glass rounded-xl border border-white/5 flex items-center justify-center grayscale hover:grayscale-0 hover:border-blue-500/30 transition-all">
                            <span class="text-lg">🌐</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Blocked Placeholder -->
            <div v-if="user.is_blocked" class="mx-1 p-8 glass rounded-[2.5rem] border border-red-500/20 bg-red-500/5 text-center space-y-4">
                <div class="text-4xl opacity-50">🚫</div>
                <div class="space-y-1">
                    <h3 class="text-sm font-black uppercase text-red-500">PENGGUNA DIBLOKIR</h3>
                    <p class="text-[10px] text-tg-hint leading-relaxed">
                        Anda telah memblokir pengguna ini. Buka blokir untuk melihat konten dan berinteraksi kembali.
                    </p>
                </div>
                <button @click="toggleBlock" class="w-full bg-white/5 hover:bg-white/10 text-tg-text py-3 rounded-2xl text-[10px] font-black border border-white/5 transition-all">
                    BUKA BLOKIR
                </button>
            </div>

            <!-- Stats Grid -->
            <div v-if="!user.is_blocked" class="grid grid-cols-4 gap-2 px-1">
                <div @click="openFollowList('followers')" class="glass py-4 rounded-3xl border border-white/5 text-center group hover:border-tg-button/30 transition-colors cursor-pointer">
                    <p class="text-lg font-black group-hover:text-tg-button transition-colors">{{ user.followers }}</p>
                    <p class="text-[8px] text-tg-hint font-bold uppercase tracking-tighter">{{ $t('profile.followers') }}</p>
                </div>
                <div @click="openFollowList('following')" class="glass py-4 rounded-3xl border border-white/5 text-center group hover:border-tg-button/30 transition-colors cursor-pointer">
                    <p class="text-lg font-black group-hover:text-tg-button transition-colors">{{ user.following }}</p>
                    <p class="text-[8px] text-tg-hint font-bold uppercase tracking-tighter">{{ $t('profile.following') }}</p>
                </div>
                <div class="glass py-4 rounded-3xl border border-white/5 text-center group hover:border-tg-button/30 transition-colors">
                    <p class="text-lg font-black group-hover:text-tg-button transition-colors">{{ user.contents }}</p>
                    <p class="text-[8px] text-tg-hint font-bold uppercase tracking-tighter">{{ $t('profile.contents') }}</p>
                </div>
                <div class="glass py-4 rounded-3xl border border-white/5 text-center group hover:border-tg-button/30 transition-colors">
                    <p class="text-lg font-black group-hover:text-tg-button transition-colors">
                        {{ user.donations }}
                    </p>
                    <p class="text-[8px] text-tg-hint font-bold uppercase tracking-tighter">{{ $t('profile.donations') }}</p>
                </div>
            </div>

            <!-- Badges Section -->
            <div v-if="!user.is_blocked && user.badges && user.badges.length > 0" class="px-1">
                <div class="glass p-4 rounded-[2.5rem] border border-white/5 bg-gradient-to-r from-tg-button/10 to-transparent">
                    <div class="flex items-center justify-between mb-4 px-2">
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-tg-button">{{ $t('profile.badges.title') }}</h3>
                        <span class="text-[10px] text-tg-hint font-bold opacity-50">{{ user.badges.length }} EARNED</span>
                    </div>
                    <div class="flex flex-wrap gap-3">
                        <div 
                            v-for="badge in user.badges" 
                            :key="badge.id"
                            class="flex flex-col items-center gap-1.5 group"
                        >
                            <div :class="badge.color" class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg transition-transform group-hover:scale-110 duration-300">
                                {{ badge.icon }}
                            </div>
                            <span class="text-[8px] font-black uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
                                {{ $t(`profile.badges.${badge.id}`) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 px-1">
                <template v-if="user.is_own">
                    <button @click="openEditModal" class="w-full flex items-center justify-center gap-2 bg-tg-button text-white py-4 rounded-2xl text-xs font-black shadow-xl shadow-tg-button/20 active:scale-95 transition-all">
                        <span>📝</span>
                        {{ $t('profile.editProfile') }}
                    </button>
                </template>
                <template v-else>
                    <button 
                        @click="toggleFollow()" 
                        :class="user.is_following ? 'bg-tg-secondary text-tg-text' : 'bg-tg-button text-white shadow-tg-button/20'"
                        class="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all"
                    >
                        <span>{{ user.is_following ? '👤' : '➕' }}</span>
                        {{ user.is_following ? $t('profile.unfollow') : $t('profile.follow') }}
                    </button>
                    <button @click="emit('open-dm', user.telegram_id)" class="flex-1 flex items-center justify-center gap-2 bg-tg-secondary/50 text-tg-text py-4 rounded-2xl text-xs font-black border border-white/5 active:scale-95 transition-all hover:border-tg-button/20">
                        <span>💬</span>
                        {{ $t('profile.message') }}
                    </button>
                    <!-- Block Button -->
                    <button v-if="!user.is_blocked" @click="toggleBlock" class="w-14 h-14 flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 active:scale-95 transition-all">
                        <span class="text-lg">🚫</span>
                    </button>
                </template>
            </div>

            <!-- Content Section -->
            <div class="space-y-4 pt-4">
                <div class="flex items-center justify-between px-2">
                    <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <span class="w-8 h-1 bg-tg-button rounded-full"></span>
                        {{ $t('profile.recentMedia') }}
                    </h3>
                </div>

                <!-- Media Grid -->
                <div v-if="gallery.length > 0" class="grid grid-cols-3 gap-1 px-1">
                    <div v-for="item in gallery" :key="item.id" class="aspect-square relative group overflow-hidden rounded-xl bg-tg-secondary/30">
                        <img :src="item.url" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
                            <span class="text-white text-[9px] font-black tracking-widest uppercase">👁️ {{ item.views }}</span>
                        </div>
                        <div v-if="item.type === 'video'" class="absolute top-2 right-2 w-6 h-6 bg-black/40 backdrop-blur-md rounded-lg flex items-center justify-center text-[10px]">
                            📹
                        </div>

                        <!-- Privacy Toggle for Owner -->
                        <button v-if="user.is_own" 
                                @click.stop="togglePrivacy(item)"
                                class="absolute top-2 left-2 w-8 h-8 glass rounded-lg flex items-center justify-center text-xs shadow-lg active:scale-110 transition-all z-10">
                            {{ item.privacy === 'public' ? '🔓' : '🔒' }}
                        </button>
                        <div v-else-if="item.privacy === 'followers_only'" class="absolute top-2 left-2 w-6 h-6 bg-purple-500/80 backdrop-blur-md rounded-lg flex items-center justify-center text-[10px] z-10">
                            🔒
                        </div>
                    </div>
                </div>
                
                <div v-else class="flex flex-col items-center justify-center py-20 opacity-30 text-center space-y-4">
                    <div class="text-4xl">🎬</div>
                    <p class="text-xs font-medium italic">{{ $t('profile.noContent') }}</p>
                </div>
            </div>
        </template>
    </div>

    <!-- Follow List Modal -->
    <div v-if="showFollowModal" class="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" @click.self="showFollowModal = false">
        <div class="w-full max-w-lg bg-tg-bg rounded-t-[2.5rem] p-6 space-y-6 shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom duration-500 max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-black uppercase tracking-wider">{{ followModalTitle }}</h3>
                <button @click="showFollowModal = false" class="w-10 h-10 glass rounded-full flex items-center justify-center text-xl">✕</button>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div v-if="followLoading" class="flex flex-col items-center py-10 space-y-4">
                    <div class="w-10 h-10 border-4 border-tg-button border-t-transparent rounded-full animate-spin"></div>
                    <p class="text-[10px] font-bold text-tg-hint uppercase animate-pulse">Memuat daftar...</p>
                </div>
                <div v-else-if="followList.length === 0" class="flex flex-col items-center py-20 opacity-40 space-y-3">
                    <div class="text-4xl">👥</div>
                    <p class="text-xs italic">{{ followModalTitle.includes(t('profile.followers')) ? $t('profile.noFollowers') : $t('profile.noFollowing') }}</p>
                </div>
                <div v-else class="space-y-3">
                    <div v-for="person in followList" :key="person.telegram_id" @click="navigateToUser(person.telegram_id)" class="glass p-3 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer">
                        <div class="w-12 h-12 rounded-2xl bg-tg-secondary p-0.5 overflow-hidden">
                            <img :src="person.photo_url || 'https://ui-avatars.com/api/?name=' + person.display_name + '&background=random'" class="w-full h-full object-cover rounded-[0.9rem]" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5">
                                <h4 class="text-sm font-bold truncate">{{ person.display_name }}</h4>
                                <span v-if="person.is_verified" class="text-blue-400 text-[10px]">✔</span>
                            </div>
                            <p class="text-[10px] text-tg-hint truncate font-medium">@{{ person.username }}</p>
                        </div>
                        <!-- We don't show follow toggle here for now to keep it simple, clicking will go to their profile -->
                        <div class="text-[10px] text-tg-button font-black uppercase opacity-50">VIEW</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal" class="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" @click.self="showShareModal = false">
        <div class="w-full max-w-lg bg-tg-bg rounded-t-[2.5rem] p-6 space-y-6 shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom duration-500">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-black uppercase tracking-wider">{{ $t('profile.shareProfile') }}</h3>
                <button @click="showShareModal = false" class="w-10 h-10 glass rounded-full flex items-center justify-center text-xl">✕</button>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <button @click="shareTelegram" class="flex flex-col items-center gap-3 p-4 glass rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all">
                    <div class="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20">✈️</div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-tg-hint">Telegram</span>
                </button>
                <button @click="shareTwitter" class="flex flex-col items-center gap-3 p-4 glass rounded-3xl border border-white/5 hover:border-sky-400/30 transition-all">
                    <div class="w-12 h-12 bg-sky-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-sky-400/20">🐦</div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-tg-hint">Twitter</span>
                </button>
                <button @click="copyLink" class="flex flex-col items-center gap-3 p-4 glass rounded-3xl border border-white/5 hover:border-tg-button/30 transition-all">
                    <div class="w-12 h-12 bg-tg-button rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-tg-button/20">🔗</div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-tg-hint">Link</span>
                </button>
            </div>
            
            <div class="p-4 bg-tg-secondary/30 rounded-2xl border border-white/5">
                <p class="text-[10px] text-tg-hint font-medium truncate opacity-60">{{ getProfileLink() }}</p>
            </div>
        </div>
    </div>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" @click.self="showEditModal = false">
        <div class="w-full max-w-lg bg-tg-bg rounded-t-[2.5rem] p-6 space-y-6 shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom duration-500 max-h-[90vh] flex flex-col overflow-hidden">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-black uppercase tracking-wider">{{ $t('profile.editProfile') }}</h3>
                <button @click="showEditModal = false" class="w-10 h-10 glass rounded-full flex items-center justify-center text-xl">✕</button>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-5">
                <!-- Name -->
                <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase tracking-widest text-tg-hint ml-2">Name</label>
                    <input v-model="editData.name" type="text" class="w-full bg-tg-secondary/50 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:border-tg-button/50 outline-none transition-all" :placeholder="$t('profile.placeholders.name')" />
                </div>

                <!-- Bio -->
                <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase tracking-widest text-tg-hint ml-2">Bio</label>
                    <textarea v-model="editData.bio" rows="3" class="w-full bg-tg-secondary/50 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:border-tg-button/50 outline-none transition-all resize-none" :placeholder="$t('profile.placeholders.bio')"></textarea>
                </div>

                <div class="pt-2 border-t border-white/5">
                    <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-tg-button mb-4">Social Links</h4>
                    
                    <div class="space-y-4">
                        <!-- Instagram -->
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 glass rounded-xl flex items-center justify-center text-xl shrink-0">📸</div>
                            <input v-model="editData.instagram_url" type="text" class="flex-1 bg-tg-secondary/50 border border-white/5 rounded-xl p-3 text-xs font-bold focus:border-pink-500/30 outline-none transition-all" :placeholder="$t('profile.placeholders.instagram')" />
                        </div>

                        <!-- TikTok -->
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 glass rounded-xl flex items-center justify-center text-xl shrink-0">🎵</div>
                            <input v-model="editData.tiktok_url" type="text" class="flex-1 bg-tg-secondary/50 border border-white/5 rounded-xl p-3 text-xs font-bold focus:border-white/30 outline-none transition-all" :placeholder="$t('profile.placeholders.tiktok')" />
                        </div>

                        <!-- Facebook -->
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 glass rounded-xl flex items-center justify-center text-xl shrink-0">👥</div>
                            <input v-model="editData.facebook_url" type="text" class="flex-1 bg-tg-secondary/50 border border-white/5 rounded-xl p-3 text-xs font-bold focus:border-blue-600/30 outline-none transition-all" :placeholder="$t('profile.placeholders.facebook')" />
                        </div>

                        <!-- Portfolio -->
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 glass rounded-xl flex items-center justify-center text-xl shrink-0">🌐</div>
                            <input v-model="editData.portfolio_url" type="text" class="flex-1 bg-tg-secondary/50 border border-white/5 rounded-xl p-3 text-xs font-bold focus:border-blue-500/30 outline-none transition-all" :placeholder="$t('profile.placeholders.portfolio')" />
                        </div>
                    </div>
                </div>
            </div>

            <button @click="saveProfile" class="w-full bg-tg-button text-white py-5 rounded-[2rem] text-sm font-black shadow-xl shadow-tg-button/20 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
                <span>💾</span>
                {{ $t('profile.saveChanges') }}
            </button>
        </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
</style>
