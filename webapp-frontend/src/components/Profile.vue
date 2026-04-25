<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps(['targetId'])
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
  telegram_id: null
})

const gallery = ref([])
const showFollowModal = ref(false)
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
          photo_url: data.photo_url
      };
      
      // Fetch Follow Stats
      fetchFollowStats(data.telegram_id);

      if (data.contents) {
          gallery.value = data.contents.map(c => ({
              id: c.id,
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

onMounted(() => fetchProfileData(props.targetId))
watch(() => props.targetId, (newId) => fetchProfileData(newId))
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
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-4 gap-2 px-1">
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

            <!-- Action Buttons -->
            <div class="flex gap-3 px-1">
                <button class="flex-1 flex items-center justify-center gap-2 bg-tg-button text-white py-4 rounded-2xl text-xs font-black shadow-xl shadow-tg-button/20 active:scale-95 transition-all">
                    <span>📝</span>
                    {{ $t('profile.editProfile') }}
                </button>
                <button @click="$emit('nav', 'settings')" class="w-14 h-14 glass flex items-center justify-center rounded-2xl border border-white/10 active:scale-95 transition-all">
                    <span class="text-xl">⚙️</span>
                </button>
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
                    <div v-for="person in followList" :key="person.telegram_id" class="glass p-3 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-white/5 transition-all">
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
                        <button class="bg-tg-button/10 text-tg-button px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-tg-button hover:text-white transition-all">
                            {{ $t('profile.follow') }}
                        </button>
                    </div>
                </div>
            </div>
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
