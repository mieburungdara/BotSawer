<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const user = ref({
  name: 'Loading...',
  username: '@...',
  bio: '',
  verified: false,
  followers: 0,
  contents: 0,
  donations: 0
})

const gallery = ref([])

const fetchProfileData = async () => {
  isLoading.value = true
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
            action: 'get'
        })
    });
    const result = await response.json();
    if (result.success) {
      const data = result.data;
      user.value = {
          name: data.display_name || data.first_name || 'User',
          username: '@' + (data.username || 'user'),
          bio: data.bio || 'Digital Content Creator',
          verified: data.is_verified === 1,
          followers: 0, // Logic for followers not yet implemented in DB
          contents: data.stats.total_media,
          donations: data.stats.total_donations
      };
      
      // Map contents to gallery items
      if (data.contents) {
          gallery.value = data.contents.map(c => ({
              id: c.id,
              type: c.media && c.media[0] ? c.media[0].file_type : 'photo',
              url: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.caption || 'C') + '&background=random',
              views: 'New'
          }));
      }
    }
  } catch (e) {
    console.error("Profile Fetch Error:", e);
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchProfileData)
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500 pb-10">
    <!-- Skeleton Loading State -->
    <div v-if="isLoading" class="space-y-8 animate-pulse">
        <div class="flex flex-col items-center pt-4">
            <div class="w-28 h-28 rounded-[2rem] bg-white/5"></div>
            <div class="h-6 w-32 bg-white/5 rounded-full mt-4"></div>
            <div class="h-4 w-24 bg-white/5 rounded-full mt-2"></div>
            <div class="h-10 w-64 bg-white/5 rounded-xl mt-4"></div>
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
                    <img :src="'https://ui-avatars.com/api/?name=' + user.name + '&background=17212b&color=fff&size=256'" class="w-full h-full rounded-[2.3rem] object-cover border-4 border-tg-secondary" />
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
        <div class="grid grid-cols-3 gap-3 px-2">
            <div class="glass py-4 rounded-3xl border border-white/5 text-center group hover:border-tg-button/30 transition-colors">
                <p class="text-xl font-black group-hover:text-tg-button transition-colors">{{ user.followers }}</p>
                <p class="text-[9px] text-tg-hint font-bold uppercase tracking-tighter">Followers</p>
            </div>
            <div class="glass py-4 rounded-3xl border border-white/5 text-center group hover:border-tg-button/30 transition-colors">
                <p class="text-xl font-black group-hover:text-tg-button transition-colors">{{ user.contents }}</p>
                <p class="text-[9px] text-tg-hint font-bold uppercase tracking-tighter">Contents</p>
            </div>
            <div class="glass py-4 rounded-3xl border border-white/5 text-center group hover:border-tg-button/30 transition-colors">
                <p class="text-xl font-black group-hover:text-tg-button transition-colors">
                    <span class="text-xs font-bold text-tg-hint">Rp</span>{{ user.donations }}
                </p>
                <p class="text-[9px] text-tg-hint font-bold uppercase tracking-tighter">Donations</p>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 px-2">
            <button class="flex-1 flex items-center justify-center gap-2 bg-tg-button text-white py-4 rounded-2xl text-xs font-black shadow-xl shadow-tg-button/20 active:scale-95 transition-all">
                <span>📝</span>
                EDIT PROFIL
            </button>
            <button class="w-14 h-14 glass flex items-center justify-center rounded-2xl border border-white/10 active:scale-95 transition-all">
                <span class="text-xl">⚙️</span>
            </button>
        </div>

        <!-- Content Section -->
        <div class="space-y-4 pt-4">
            <div class="flex items-center justify-between px-2">
                <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <span class="w-8 h-1 bg-tg-button rounded-full"></span>
                    Recent Media
                </h3>
                <span class="text-[10px] text-tg-hint font-bold uppercase">Grid View</span>
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
                <p class="text-xs font-medium italic">Belum ada konten yang diunggah.</p>
            </div>
        </div>
    </template>
  </div>
</template>
