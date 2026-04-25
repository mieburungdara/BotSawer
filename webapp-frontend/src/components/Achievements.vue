<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const error = ref(null)
const categories = ref([])
const special = ref([])

const fetchAchievements = async () => {
  isLoading.value = true
  error.value = null
  try {
    const tg = window.Telegram?.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const botId = urlParams.get('bot_id') || localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: tg?.initData,
            botId: botId
        })
    });
    const result = await response.json();
    if (result.success) {
      categories.value = result.data.categories;
      special.value = result.data.special;
    } else {
      error.value = result.message;
    }
  } catch (e) {
    error.value = "Gagal memuat data pencapaian.";
  } finally {
    isLoading.value = false
  }
}

const getProgress = (current, tiers) => {
    const max = tiers[tiers.length - 1].value;
    return Math.min(100, (current / max) * 100);
}

const getTierLabel = (current, tiers) => {
    let currentLabel = 'None';
    for (const tier of tiers) {
        if (current >= tier.value) currentLabel = tier.label;
    }
    return currentLabel;
}

const getNextTier = (current, tiers) => {
    return tiers.find(t => current < t.value);
}

const formatValue = (val) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val;
}

onMounted(fetchAchievements)
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
    <div class="flex items-center gap-3 pt-2">
        <div class="w-10 h-10 glass rounded-xl flex items-center justify-center text-xl">🏆</div>
        <div>
            <h2 class="text-xl font-black">ACHIEVEMENTS</h2>
            <p class="text-[10px] text-tg-hint font-bold uppercase tracking-widest">Kumpulkan Lencana & Milestone</p>
        </div>
    </div>

    <div v-if="isLoading" class="space-y-4 pt-10">
        <div v-for="i in 3" :key="i" class="h-32 w-full bg-white/5 rounded-3xl animate-pulse"></div>
    </div>

    <div v-else-if="error" class="glass p-8 rounded-3xl text-center space-y-4">
        <p class="text-sm text-red-400">{{ error }}</p>
        <button @click="fetchAchievements" class="bg-tg-button text-white px-6 py-2 rounded-xl text-xs font-bold">Coba Lagi</button>
    </div>

    <template v-else>
        <!-- Special Badges -->
        <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1">
            <div v-for="item in special" :key="item.id" 
                 :class="['flex-shrink-0 w-28 h-32 glass rounded-3xl border flex flex-col items-center justify-center p-3 text-center transition-all', 
                          item.unlocked ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 opacity-40 grayscale']">
                <div class="text-3xl mb-2">{{ item.icon === 'bird' ? '🐦' : '🎗️' }}</div>
                <p class="text-[9px] font-black uppercase leading-tight">{{ item.title }}</p>
                <div v-if="item.unlocked" class="mt-2 text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black">UNLOCKED</div>
            </div>
        </div>

        <!-- Achievement Categories -->
        <div class="space-y-4">
            <div v-for="cat in categories" :key="cat.id" class="glass p-5 rounded-3xl border border-white/5 space-y-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-tg-button/10 rounded-2xl flex items-center justify-center text-2xl">
                            {{ cat.icon === 'heart' ? '❤️' : cat.icon === 'coins' ? '💰' : cat.icon === 'image' ? '🖼️' : '⭐' }}
                        </div>
                        <div>
                            <h3 class="font-black text-sm">{{ cat.title }}</h3>
                            <p class="text-[10px] text-tg-hint font-medium">{{ cat.description }}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-black text-tg-button">{{ getTierLabel(cat.current, cat.tiers) }}</p>
                        <p class="text-[10px] text-tg-hint font-bold">{{ formatValue(cat.current) }}</p>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="space-y-2">
                    <div class="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-tg-button to-purple-500 rounded-full transition-all duration-1000" 
                             :style="{ width: getProgress(cat.current, cat.tiers) + '%' }"></div>
                    </div>
                    <div class="flex justify-between text-[8px] font-black uppercase tracking-widest text-tg-hint">
                        <span>Lvl {{ getTierLabel(cat.current, cat.tiers) }}</span>
                        <span v-if="getNextTier(cat.current, cat.tiers)">Next: {{ getNextTier(cat.current, cat.tiers).label }} ({{ formatValue(getNextTier(cat.current, cat.tiers).value) }})</span>
                        <span v-else>MAX LEVEL</span>
                    </div>
                </div>

                <!-- Tier Badges -->
                <div class="flex gap-2">
                    <div v-for="tier in cat.tiers" :key="tier.label" 
                         :class="['w-8 h-8 rounded-lg flex items-center justify-center text-[10px] border transition-all',
                                  tier.unlocked ? 'border-tg-button/50 bg-tg-button/20 text-white' : 'border-white/5 bg-white/5 text-white/20']">
                        {{ tier.label[0] }}
                    </div>
                </div>
            </div>
        </div>
    </template>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
