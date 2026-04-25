<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const emit = defineEmits(['navigate'])

const quickLinks = [
  { id: 'explore', label: 'Explore', icon: '🌍', color: 'bg-blue-500/10 text-blue-500' },
  { id: 'profile', label: 'Profile', icon: '👤', color: 'bg-purple-500/10 text-purple-500' },
  { id: 'wallet', label: 'Wallet', icon: '💰', color: 'bg-green-500/10 text-green-500' },
  { id: 'library', label: 'Library', icon: '📚', color: 'bg-orange-500/10 text-orange-500' },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: 'bg-gray-500/10 text-gray-500' },
]
const balance = ref(0)
const stats = ref({
  total_earnings: 0,
  active_contents: 0,
  total_donations: 0
})

const fetchDashboardData = async () => {
  isLoading.value = true
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const botId = urlParams.get('bot_id') || localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: tg?.initData,
            botId: botId
        })
    });
    const result = await response.json();
    if (result.success) {
      stats.value = result.data.stats;
    }
  } catch (e) {
    console.error("Dashboard Fetch Error:", e);
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchDashboardData)
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    <!-- Skeleton Loading -->
    <div v-if="isLoading" class="space-y-6">
      <div class="grid grid-cols-3 gap-3">
        <div class="h-20 bg-tg-secondary/50 rounded-2xl animate-pulse"></div>
        <div class="h-20 bg-tg-secondary/50 rounded-2xl animate-pulse"></div>
        <div class="h-20 bg-tg-secondary/50 rounded-2xl animate-pulse"></div>
      </div>
    </div>

    <!-- Real Content -->
    <template v-else>


      <!-- Quick Access Grid -->
      <section>
        <div class="flex items-center gap-2 mb-4 px-1">
          <h3 class="font-black text-sm uppercase tracking-wider text-tg-hint">⚡ Quick Access</h3>
        </div>
        <div class="grid grid-cols-5 gap-2">
          <button 
            v-for="link in quickLinks" 
            :key="link.id" 
            @click="$emit('navigate', link.id)"
            class="flex flex-col items-center gap-2 p-3 rounded-2xl glass border border-white/5 active:scale-90 transition-all"
          >
            <div :class="link.color" class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner">
              {{ link.icon }}
            </div>
            <span class="text-[9px] font-bold uppercase tracking-tighter">{{ link.label }}</span>
          </button>
        </div>
      </section>

      <!-- Quick Stats Grid -->
      <div class="grid grid-cols-3 gap-3">
        <div class="glass p-3 rounded-2xl text-center border border-white/5">
          <p class="text-tg-hint text-[10px] font-bold uppercase mb-1">Earning</p>
          <p class="text-sm font-black">Rp{{ stats.total_earnings.toLocaleString('id-ID') }}</p>
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
