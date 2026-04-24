<script setup>
import { ref, onMounted } from 'vue'

const balance = ref(0)
const stats = ref({
  total_earnings: 0,
  active_contents: 0
})

const fetchDashboardData = async () => {
  // In real app, we will use axios to call our Node.js API
  // For now, let's simulate
  balance.value = 150000
  stats.value = {
    total_earnings: 450000,
    active_contents: 12
  }
}

onMounted(fetchDashboardData)
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Balance Card -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-tg-button to-blue-600 p-6 shadow-xl shadow-tg-button/30">
      <div class="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div class="relative z-10">
        <p class="text-white/70 text-sm font-medium mb-1">Total Saldo</p>
        <h2 class="text-3xl font-bold text-white mb-6">Rp {{ balance.toLocaleString('id-ID') }}</h2>
        
        <div class="flex gap-4">
          <button class="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
            💸 Withdraw
          </button>
          <button class="flex-1 bg-white text-tg-button py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-black/10 transition-all active:scale-95">
            ➕ Topup
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-4">
      <div class="glass p-4 rounded-2xl">
        <p class="text-tg-hint text-xs mb-1">Pendapatan</p>
        <p class="text-lg font-bold">Rp {{ stats.total_earnings.toLocaleString('id-ID') }}</p>
      </div>
      <div class="glass p-4 rounded-2xl">
        <p class="text-tg-hint text-xs mb-1">Konten Aktif</p>
        <p class="text-lg font-bold">{{ stats.active_contents }} Media</p>
      </div>
    </div>

    <!-- Announcements -->
    <section>
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold">Info & Promo</h3>
        <button class="text-xs text-tg-button font-medium">Lihat Semua</button>
      </div>
      <div class="space-y-3">
        <div class="glass p-4 rounded-2xl flex gap-4 items-center border-l-4 border-tg-button">
          <div class="text-2xl">🎁</div>
          <div>
            <h4 class="text-sm font-bold">Bonus Topup 10%</h4>
            <p class="text-xs text-tg-hint">Khusus pengguna baru minggu ini!</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
