<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const balance = ref(0)
const stats = ref({
  total_earnings: 0,
  active_contents: 0,
  total_donations: 0
})

const fetchDashboardData = async () => {
  isLoading.value = true
  
  // Simulasi delay jaringan (1 detik)
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // DUMMY DATA
  balance.value = 258400
  stats.value = {
    total_earnings: 1250000,
    active_contents: 24,
    total_donations: 86
  }
  
  isLoading.value = false
}

onMounted(fetchDashboardData)
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    <!-- Skeleton Loading -->
    <div v-if="isLoading" class="space-y-6">
      <div class="h-44 w-full bg-tg-secondary/50 rounded-3xl animate-pulse"></div>
      <div class="grid grid-cols-2 gap-4">
        <div class="h-20 bg-tg-secondary/50 rounded-2xl animate-pulse"></div>
        <div class="h-20 bg-tg-secondary/50 rounded-2xl animate-pulse"></div>
      </div>
    </div>

    <!-- Real Content -->
    <template v-else>
      <!-- Balance Card -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-tg-button via-tg-button to-blue-700 p-6 shadow-2xl shadow-tg-button/20 border border-white/10">
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl"></div>
        
        <div class="relative z-10">
          <div class="flex justify-between items-start mb-2">
            <p class="text-white/70 text-xs font-bold uppercase tracking-widest">Main Wallet</p>
            <span class="bg-white/20 text-white text-[10px] px-2 py-1 rounded-md font-bold backdrop-blur-sm">ACTIVE</span>
          </div>
          <h2 class="text-4xl font-black text-white mb-8 tracking-tight">
            <span class="text-xl font-medium text-white/60 mr-1">Rp</span>{{ balance.toLocaleString('id-ID') }}
          </h2>
          
          <div class="flex gap-3">
            <button class="flex-1 bg-white/15 hover:bg-white/25 backdrop-blur-lg text-white py-3 rounded-2xl text-sm font-bold transition-all border border-white/10 active:scale-95">
              Withdraw
            </button>
            <button class="flex-1 bg-white text-tg-button py-3 rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95">
              Topup Saldo
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Stats Grid -->
      <div class="grid grid-cols-3 gap-3">
        <div class="glass p-3 rounded-2xl text-center border border-white/5">
          <p class="text-tg-hint text-[10px] font-bold uppercase mb-1">Earning</p>
          <p class="text-sm font-black">1.2M</p>
        </div>
        <div class="glass p-3 rounded-2xl text-center border border-white/5">
          <p class="text-tg-hint text-[10px] font-bold uppercase mb-1">Media</p>
          <p class="text-sm font-black">{{ stats.active_contents }}</p>
        </div>
        <div class="glass p-3 rounded-2xl text-center border border-white/5">
          <p class="text-tg-hint text-[10px] font-bold uppercase mb-1">Sawer</p>
          <p class="text-sm font-black">{{ stats.total_donations }}</p>
        </div>
      </div>

      <!-- Announcements Section -->
      <section>
        <div class="flex justify-between items-center mb-4 px-1">
          <h3 class="font-black text-sm uppercase tracking-wider text-tg-hint">🔥 News & Updates</h3>
          <div class="h-px flex-1 bg-white/5 mx-4"></div>
          <button class="text-[10px] text-tg-button font-black uppercase">All</button>
        </div>
        
        <div class="space-y-3">
          <div class="glass p-4 rounded-2xl flex gap-4 items-center group transition-all active:bg-white/5">
            <div class="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🚀
            </div>
            <div class="flex-1">
              <h4 class="text-sm font-bold">Vesper Node.js is LIVE!</h4>
              <p class="text-xs text-tg-hint">Migrasi sistem selesai, nikmati kecepatan maksimal.</p>
            </div>
            <span class="text-tg-hint">❯</span>
          </div>
        </div>
      </section>
    </template>

  </div>
</template>
