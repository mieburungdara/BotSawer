<script setup>
import { ref, onMounted, watch } from 'vue'

const creators = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('User')

const categories = [
  'Content', 'User', 'Post', 'Menfess'
]

const fetchCreators = async (query = '') => {
  isLoading.value = true
  try {
    const tg = window.Telegram?.WebApp
    const botId = localStorage.getItem('vesper_bot_id')
    
    // Map category to action
    let action = 'get_creators';
    if (selectedCategory.value === 'Content') action = 'get_contents';
    if (selectedCategory.value === 'Post') action = 'get_posts';
    if (selectedCategory.value === 'Menfess') action = 'get_menfess';
    if (selectedCategory.value === 'User') action = 'get_creators';

    // If there is a query, use search action
    if (query) {
        if (selectedCategory.value === 'User') action = 'search_creators';
        else if (selectedCategory.value === 'Content' || selectedCategory.value === 'Post') action = 'search_contents';
        else if (selectedCategory.value === 'Menfess') action = 'search_menfess';
    }
    
    const response = await fetch('/vesper/api/explore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId,
        action,
        query: query
      })
    })
    
    const result = await response.json()
    if (result.success) {
      creators.value = result.data
    }
  } catch (e) {
    console.error("Explore Fetch Error:", e)
  } finally {
    isLoading.value = false
  }
}

// Debounce search
let timeout = null
watch(searchQuery, (newVal) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    fetchCreators(newVal)
  }, 500)
})

// Re-fetch when category changes
watch(selectedCategory, () => {
    searchQuery.value = '';
    fetchCreators();
})

onMounted(() => {
  fetchCreators()
})

const getAvatarColor = (name) => {
  const colors = [
    'from-pink-500 to-rose-500',
    'from-blue-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-purple-500 to-violet-500',
    'from-cyan-500 to-sky-500'
  ]
  const index = name.length % colors.length
  return colors[index]
}

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h2 class="text-3xl font-black text-gradient">Explore</h2>
      <p class="text-tg-hint text-xs font-medium uppercase tracking-wider">Temukan kreator berbakat</p>
    </div>

    <!-- Search Bar -->
    <div class="relative group">
      <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span class="text-xl group-focus-within:scale-110 transition-transform duration-300">🔍</span>
      </div>
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="Cari nama atau username..." 
        class="w-full bg-tg-secondary/40 backdrop-blur-md border border-white/5 h-14 rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:border-tg-button/50 focus:bg-tg-secondary/60 transition-all shadow-inner" 
      />
    </div>

    <!-- Categories -->
    <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      <button 
        v-for="cat in categories" 
        :key="cat"
        @click="selectedCategory = cat"
        :class="selectedCategory === cat ? 'bg-tg-button text-white shadow-lg shadow-tg-button/30 border-tg-button' : 'bg-white/5 text-tg-hint border-white/5'"
        class="px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap border transition-all active:scale-95"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Creator List -->
    <div class="space-y-4">
      <!-- Skeleton Loading -->
      <template v-if="isLoading">
        <div v-for="i in 3" :key="i" class="glass p-4 rounded-[2rem] flex items-center gap-4 border border-white/5 animate-pulse">
          <div class="w-16 h-16 rounded-2xl bg-white/5"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-white/5 rounded w-1/2"></div>
            <div class="h-3 bg-white/5 rounded w-1/3"></div>
            <div class="h-3 bg-white/5 rounded w-1/4"></div>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else-if="creators.length === 0" class="py-12 text-center space-y-4">
        <div class="text-6xl opacity-20">🔎</div>
        <p class="text-tg-hint font-bold text-sm">Tidak ada kreator ditemukan</p>
      </div>

      <!-- Real Data -->
      <template v-else>
        <div 
          v-for="creator in creators" 
          :key="creator.telegram_id" 
          class="glass p-4 rounded-[2rem] flex items-center gap-4 group active:scale-[0.98] transition-all border border-white/5 hover:border-tg-button/20"
        >
          <!-- Avatar -->
          <div class="relative">
            <div 
              :class="getAvatarColor(creator.display_name)"
              class="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-black/20 border border-white/10 overflow-hidden"
            >
              <img v-if="creator.photo_url" :src="creator.photo_url" class="w-full h-full object-cover" />
              <span v-else>{{ getInitials(creator.display_name) }}</span>
            </div>
            <div v-if="creator.is_verified" class="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-4 border-tg-bg flex items-center justify-center text-[10px] text-white">
              ✔
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <template v-if="selectedCategory === 'User'">
              <h4 class="text-sm font-black truncate">{{ creator.display_name }}</h4>
              <p class="text-[10px] text-tg-hint font-bold uppercase tracking-wider truncate">@{{ creator.username }}</p>
              <p class="text-[11px] text-white/60 line-clamp-1 mt-1 italic font-medium">
                {{ creator.bio || 'Bangga menjadi kreator di Vesper!' }}
              </p>
            </template>
            <template v-else-if="selectedCategory === 'Content' || selectedCategory === 'Post'">
              <h4 class="text-sm font-black line-clamp-1">{{ creator.caption || 'Tanpa caption' }}</h4>
              <p class="text-[10px] text-tg-hint font-bold uppercase tracking-wider truncate">Oleh {{ creator.display_name }}</p>
              <p class="text-[9px] text-tg-button font-bold mt-1 uppercase tracking-tighter">
                {{ new Date(creator.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }}
              </p>
            </template>
            <template v-else>
              <h4 class="text-sm font-black truncate">Menfess Anonim</h4>
              <p class="text-[11px] text-white/60 line-clamp-2 mt-1 italic font-medium">
                Belum ada menfess yang tersedia.
              </p>
            </template>
          </div>

          <!-- Action -->
          <button class="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-lg hover:bg-tg-button hover:text-white transition-all shadow-lg active:scale-90">
            ➔
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.text-gradient {
  background: linear-gradient(to right, #fff, #999);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}
</style>
