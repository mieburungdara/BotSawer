<script setup>
import { ref } from 'vue'

const user = ref({
  name: 'Admin Vesper',
  username: '@vesper_admin',
  bio: 'Membangun ekosistem konten digital terbaik di Telegram. 🚀',
  verified: true,
  followers: 1250,
  contents: 24,
  donations: 86
})

const gallery = ref([
  { id: 1, type: 'photo', url: 'https://picsum.photos/400/400?random=1', views: '1.2K' },
  { id: 2, type: 'video', url: 'https://picsum.photos/400/400?random=2', views: '850' },
  { id: 3, type: 'photo', url: 'https://picsum.photos/400/400?random=3', views: '3.4K' },
  { id: 4, type: 'photo', url: 'https://picsum.photos/400/400?random=4', views: '12K' },
  { id: 5, type: 'video', url: 'https://picsum.photos/400/400?random=5', views: '900' },
  { id: 6, type: 'photo', url: 'https://picsum.photos/400/400?random=6', views: '1.1K' },
  { id: 7, type: 'photo', url: 'https://picsum.photos/400/400?random=7', views: '2.3K' },
  { id: 8, type: 'photo', url: 'https://picsum.photos/400/400?random=8', views: '400' },
  { id: 9, type: 'video', url: 'https://picsum.photos/400/400?random=9', views: '2.5K' },
])
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500 pb-10">
    <!-- Profile Header -->
    <div class="flex flex-col items-center pt-4">
      <div class="relative">
        <div class="w-28 h-28 rounded-[2rem] bg-gradient-to-tr from-tg-button to-purple-500 p-1 shadow-2xl shadow-tg-button/20">
          <img src="https://ui-avatars.com/api/?name=Admin&background=17212b&color=fff" class="w-full h-full rounded-[1.8rem] object-cover border-4 border-tg-secondary" />
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
  </div>
</template>
