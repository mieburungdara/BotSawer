<script setup>
import { ref } from 'vue'

const fontSize = ref(localStorage.getItem('vesper_font_size') || 'medium')

const updateFontSize = (size) => {
  fontSize.value = size
  localStorage.setItem('vesper_font_size', size)
  
  // Update document class
  const html = document.documentElement
  html.classList.remove('font-size-small', 'font-size-medium', 'font-size-large')
  html.classList.add(`font-size-${size}`)
}

const settings = ref([
  { title: 'Notifikasi', icon: '🔔', desc: 'Kelola pemberitahuan donasi', toggle: true, value: true, aria: 'Aktifkan notifikasi donasi' },
  { title: 'Mode Privat', icon: '🔒', desc: 'Sembunyikan profil dari Explore', toggle: true, value: false, aria: 'Aktifkan mode privat' },
  { title: 'Bahasa', icon: '🌐', desc: 'Indonesia', toggle: false, aria: 'Ubah bahasa aplikasi' },
  { title: 'Metode Pembayaran', icon: '💳', desc: 'Kelola rekening bank & e-wallet', toggle: false, aria: 'Pengaturan dompet dan pembayaran' },
  { title: 'Hubungi Admin', icon: '🎧', desc: 'Bantuan & Pertanyaan', toggle: false, aria: 'Hubungi layanan bantuan' },
])
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500 pb-10" role="main">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">Settings</h2>
      <p class="text-tg-hint text-xs">Atur preferensi aplikasi Anda</p>
    </div>

    <!-- User Account Quick Card -->
    <div class="glass p-4 rounded-3xl flex items-center gap-4 border border-white/10" role="region" aria-label="Informasi Akun">
      <div class="w-12 h-12 rounded-full bg-tg-button/20 flex items-center justify-center text-xl" aria-hidden="true">
        👤
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-bold">Admin Vesper</h3>
        <p class="text-[10px] text-tg-hint">Terverifikasi sejak 2024</p>
      </div>
      <button class="text-tg-button text-xs font-bold" aria-label="Ubah informasi profil">Ubah</button>
    </div>

    <!-- Accessibility: Font Size -->
    <div class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-[10px] font-black text-tg-hint uppercase tracking-widest">Aksesibilitas: Ukuran Font</h3>
      </div>
      <div class="glass p-1.5 rounded-2xl flex gap-1 border border-white/5" role="radiogroup" aria-label="Pilih ukuran font">
        <button 
          v-for="size in ['small', 'medium', 'large']" 
          :key="size"
          @click="updateFontSize(size)"
          :class="fontSize === size ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint hover:bg-white/5'"
          :aria-checked="fontSize === size"
          role="radio"
          class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
        >
          {{ size }}
        </button>
      </div>
    </div>

    <!-- Settings List -->
    <div class="space-y-2" role="list">
      <div 
        v-for="(item, index) in settings" 
        :key="index" 
        @click="item.toggle ? item.value = !item.value : null"
        :aria-label="item.aria"
        role="listitem"
        class="glass p-4 rounded-2xl flex items-center gap-4 border border-white/5 active:bg-white/5 transition-all cursor-pointer"
      >
        <div class="w-10 h-10 rounded-xl bg-tg-secondary flex items-center justify-center text-lg" aria-hidden="true">
          {{ item.icon }}
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-bold">{{ item.title }}</h4>
          <p class="text-[10px] text-tg-hint">{{ item.desc }}</p>
        </div>
        <div v-if="item.toggle" role="switch" :aria-checked="item.value">
           <div :class="item.value ? 'bg-tg-button' : 'bg-tg-hint/30'" class="w-10 h-5 rounded-full relative transition-colors p-1">
              <div :class="item.value ? 'translate-x-5' : 'translate-x-0'" class="w-3 h-3 bg-white rounded-full transition-transform"></div>
           </div>
        </div>
        <span v-else class="text-tg-hint text-xs" aria-hidden="true">❯</span>
      </div>
    </div>

    <!-- Footer Links -->
    <div class="pt-4 space-y-4 text-center">
       <p class="text-[10px] text-tg-hint font-medium">Kebijakan Privasi • Syarat & Ketentuan</p>
       <button 
         @click="window.Telegram?.WebApp?.close()"
         class="text-red-500 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
         aria-label="Tutup aplikasi Vesper"
       >
         Tutup Vesper
       </button>
    </div>
  </div>
</template>
