<script setup>
import { ref } from 'vue'

const creators = ref([
  { id: 1, name: 'Siska Aura', username: '@siska_art', avatar: 'SA', verified: true, followers: '12.5K' },
  { id: 2, name: 'Budi Motovlog', username: '@budimoto', avatar: 'BM', verified: false, followers: '5.2K' },
  { id: 3, name: 'Chef Renatta', username: '@renatta_cook', avatar: 'RC', verified: true, followers: '45K' },
  { id: 4, name: 'Tech Reviewer', username: '@gadget_id', avatar: 'GI', verified: true, followers: '102K' },
  { id: 5, name: 'Wibu Developer', username: '@wibu_dev', avatar: 'WD', verified: false, followers: '1.2K' },
])
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">Explore</h2>
      <p class="text-tg-hint text-xs">Temukan kreator berbakat di sekitar Anda</p>
    </div>

    <!-- Search Bar -->
    <div class="glass flex items-center px-4 h-14 rounded-2xl border border-white/5 shadow-inner">
      <span class="text-xl mr-3 opacity-50">🔍</span>
      <input type="text" placeholder="Cari username atau kategori..." class="bg-transparent border-none outline-none text-sm w-full placeholder:text-tg-hint/50" />
    </div>

    <!-- Creator List -->
    <div class="space-y-4">
      <div v-for="creator in creators" :key="creator.id" class="glass p-4 rounded-3xl flex items-center gap-4 group active:scale-95 transition-all border border-white/5">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-tg-button/20 to-purple-500/20 flex items-center justify-center font-black text-xl text-tg-button border border-tg-button/10">
          {{ creator.avatar }}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-1.5">
            <h4 class="text-sm font-bold">{{ creator.name }}</h4>
            <span v-if="creator.verified" class="text-blue-400 text-xs">✔</span>
          </div>
          <p class="text-[10px] text-tg-hint font-medium uppercase tracking-wider">{{ creator.username }}</p>
          <p class="text-[10px] text-tg-button font-bold mt-1">{{ creator.followers }} Penggemar</p>
        </div>
        <button class="bg-tg-button text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-tg-button/20">
          Ikuti
        </button>
      </div>
    </div>
  </div>
</template>
