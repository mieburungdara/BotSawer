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
    <div v-if="isLoading" class="text-center py-20 animate-pulse">Memuat Profil...</div>
    
    <template v-else>
        <!-- Profile Header -->
        <div class="flex flex-col items-center pt-4">
        <div class="relative">
            <div class="w-28 h-28 rounded-[2rem] bg-gradient-to-tr from-tg-button to-purple-500 p-1 shadow-2xl shadow-tg-button/20">
            <img :src="'https://ui-avatars.com/api/?name=' + user.name + '&background=17212b&color=fff'" class="w-full h-full rounded-[1.8rem] object-cover border-4 border-tg-secondary" />
            </div>
            <div v-if="user.verified" class="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full border-4 border-tg-bg flex items-center justify-center text-white text-xs">
            ✔
            </div>
        </div>
        
        <div class="text-center mt-4">
            <h2 class="text-xl font-black">{{ user.name }}</h2>
            <p class="text-tg-button text-xs font-bold uppercase tracking-tighter">{{ user.username }}</p>
            <p class="text-tg-hint text-xs mt-3 px-6 leading-relaxed">{{ user.bio }}</p>
        </div>
        </div>

        <!-- Stats Bar -->
        <div class="flex justify-around items-center glass py-4 rounded-3xl border border-white/5">
        <div class="text-center">
            <p class="text-lg font-black">{{ user.followers }}</p>
            <p class="text-[9px] text-tg-hint font-bold uppercase">Followers</p>
        </div>
        <div class="w-px h-8 bg-white/10"></div>
        <div class="text-center">
            <p class="text-lg font-black">{{ user.contents }}</p>
            <p class="text-[9px] text-tg-hint font-bold uppercase">Posts</p>
        </div>
        <div class="w-px h-8 bg-white/10"></div>
        <div class="text-center">
            <p class="text-lg font-black">{{ user.donations }}</p>
            <p class="text-[9px] text-tg-hint font-bold uppercase">Donasi</p>
        </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
        <button class="flex-1 bg-tg-button text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-tg-button/20 active:scale-95 transition-all">
            EDIT PROFIL
        </button>
        <button class="w-12 h-12 glass flex items-center justify-center rounded-2xl border border-white/10 active:scale-95 transition-all">
            ⚙️
        </button>
        </div>

        <!-- Media Grid -->
        <div class="grid grid-cols-3 gap-1.5">
        <div v-for="item in gallery" :key="item.id" class="aspect-square relative group overflow-hidden rounded-xl bg-tg-secondary/30">
            <img :src="item.url" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span class="text-white text-[10px] font-bold">👁️ {{ item.views }}</span>
            </div>
            <div v-if="item.type === 'video'" class="absolute top-1 right-1 w-5 h-5 bg-black/40 backdrop-blur-md rounded-md flex items-center justify-center text-[10px]">
            📹
            </div>
        </div>
        </div>
        
        <div v-if="gallery.length === 0" class="text-center py-20 opacity-50 text-sm italic">
            Belum ada konten yang diunggah.
        </div>
    </template>
  </div>
</template>
