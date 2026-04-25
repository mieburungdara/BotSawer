<script setup>
import { ref } from 'vue'

const settings = ref([
  { title: 'Notifikasi', icon: '🔔', desc: 'Kelola pemberitahuan donasi', toggle: true, value: true },
  { title: 'Mode Privat', icon: '🔒', desc: 'Sembunyikan profil dari Explore', toggle: true, value: false },
  { title: 'Bahasa', icon: '🌐', desc: 'Indonesia', toggle: false },
  { title: 'Metode Pembayaran', icon: '💳', desc: 'Kelola rekening bank & e-wallet', toggle: false },
  { title: 'Hubungi Admin', icon: '🎧', desc: 'Bantuan & Pertanyaan', toggle: false },
])
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500 pb-10">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">Settings</h2>
      <p class="text-tg-hint text-xs">Atur preferensi aplikasi Anda</p>
    </div>

    <!-- User Account Quick Card -->
    <div class="glass p-4 rounded-3xl flex items-center gap-4 border border-white/10">
      <div class="w-12 h-12 rounded-full bg-tg-button/20 flex items-center justify-center text-xl">
        👤
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-bold">Admin Vesper</h3>
        <p class="text-[10px] text-tg-hint">Terverifikasi sejak 2024</p>
      </div>
      <button class="text-tg-button text-xs font-bold">Ubah</button>
    </div>

    <!-- Settings List -->
    <div class="space-y-2">
      <div 
        v-for="(item, index) in settings" 
        :key="index" 
        @click="item.toggle ? item.value = !item.value : null"
        class="glass p-4 rounded-2xl flex items-center gap-4 border border-white/5 active:bg-white/5 transition-all cursor-pointer"
      >
        <div class="w-10 h-10 rounded-xl bg-tg-secondary flex items-center justify-center text-lg">
          {{ item.icon }}
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-bold">{{ item.title }}</h4>
          <p class="text-[10px] text-tg-hint">{{ item.desc }}</p>
        </div>
        <div v-if="item.toggle">
           <div :class="item.value ? 'bg-tg-button' : 'bg-tg-hint/30'" class="w-10 h-5 rounded-full relative transition-colors p-1">
              <div :class="item.value ? 'translate-x-5' : 'translate-x-0'" class="w-3 h-3 bg-white rounded-full transition-transform"></div>
           </div>
        </div>
        <span v-else class="text-tg-hint text-xs">❯</span>
      </div>
    </div>

    <!-- Footer Links -->
    <div class="pt-4 space-y-4 text-center">
       <p class="text-[10px] text-tg-hint font-medium">Kebijakan Privasi • Syarat & Ketentuan</p>
       <button 
         @click="window.Telegram?.WebApp?.close()"
         class="text-red-500 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
       >
         Tutup Vesper
       </button>
    </div>
  </div>
</template>
