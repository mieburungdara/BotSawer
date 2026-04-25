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
  try {
    const tg = window.Telegram?.WebApp;
    const response = await fetch('/api/dashboard.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            auth: tg?.initData,
            bot_id: tg?.initDataUnsafe?.query?.bot_id 
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
