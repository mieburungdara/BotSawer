<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const creators = ref([])
const trendingCreators = ref([])
const isLoading = ref(true)
const isTrendingLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('User')

// Pagination State
const currentPage = ref(1)
const totalItems = ref(0)
const itemsPerPage = 20
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))

// Search History
const searchHistory = ref([])
const showHistory = ref(false)

const loadHistory = () => {
  const saved = localStorage.getItem('vesper_search_history')
  if (saved) searchHistory.value = JSON.parse(saved)
}

const saveSearch = (query) => {
  if (!query || query.trim() === '') return
  const q = query.trim()
  const history = [q, ...searchHistory.value.filter(h => h !== q)].slice(0, 8)
  searchHistory.value = history
  localStorage.setItem('vesper_search_history', JSON.stringify(history))
}

const removeHistory = (query) => {
  searchHistory.value = searchHistory.value.filter(h => h !== query)
  localStorage.setItem('vesper_search_history', JSON.stringify(searchHistory.value))
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('vesper_search_history')
}

const repeatSearch = (query) => {
  searchQuery.value = query
  showHistory.value = false
  fetchCreators(query)
}

const categories = [
  'Content', 'User', 'Post', 'Menfess'
]

const fetchTrending = async () => {
  isTrendingLoading.value = true
  try {
    const tg = window.Telegram?.WebApp
    const botId = localStorage.getItem('vesper_bot_id')
    const response = await fetch('/vesper/api/explore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId,
        action: 'get_trending'
      })
    })
    const result = await response.json()
    if (result.success) {
      trendingCreators.value = result.data
    }
  } catch (e) {
    console.error("Trending Fetch Error:", e)
  } finally {
    isTrendingLoading.value = false
  }
}

const fetchCreators = async (query = '') => {
  isLoading.value = true
  if (query) saveSearch(query)
  
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
        query: query,
        offset: (currentPage.value - 1) * itemsPerPage
      })
    })
    
    const result = await response.json()
    if (result.success && result.data) {
      creators.value = result.data.list || [];
      totalItems.value = result.data.total || 0;
    } else {
      creators.value = [];
      totalItems.value = 0;
    }
  } catch (e) {
    console.error("Explore Fetch Error:", e)
    creators.value = []
  } finally {
    isLoading.value = false
  }
}

const changePage = (page) => {
    if (page < 1 || page > totalPages.value) return;
    currentPage.value = page;
    fetchCreators(searchQuery.value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Debounce search
let timeout = null
watch(searchQuery, (newVal) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    currentPage.value = 1; // Reset to page 1 on search
    fetchCreators(newVal)
  }, 500)
})

// Re-fetch when category changes
watch(selectedCategory, () => {
    searchQuery.value = '';
    currentPage.value = 1;
    fetchCreators();
})

onMounted(() => {
  loadHistory()
  fetchTrending()
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
  if (!name) return colors[0];
  const index = name.length % colors.length
  return colors[index]
}

const emit = defineEmits(['view-profile'])

// Donation Logic
const showDonationModal = ref(false)
const selectedPost = ref(null)
const donationAmount = ref(5000)
const isDonating = ref(false)
const donationError = ref('')
const donationPresets = [2000, 5000, 10000, 25000, 50000]

const openDonationModal = (item) => {
  selectedPost.value = item;
  showDonationModal.value = true;
  donationError.value = '';
  donationAmount.value = 5000;
}

const processDonation = async () => {
  if (!selectedPost.value || donationAmount.value <= 0) return;
  
  isDonating.value = true;
  donationError.value = '';
  
  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId: botId,
        action: 'donate',
        receiverId: selectedPost.value.creator_id,
        amount: donationAmount.value,
        contentId: selectedPost.value.id || selectedPost.value.short_id
      })
    });
    
    const result = await response.json();
    if (result.success) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      showDonationModal.value = false;
    } else {
      donationError.value = result.message || 'Donasi gagal';
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    }
  } catch (e) {
    donationError.value = 'Terjadi kesalahan sistem';
    console.error(e);
  } finally {
    isDonating.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h2 class="text-3xl font-black text-gradient">{{ $t('explore.title') }}</h2>
      <p class="text-tg-hint text-xs font-medium uppercase tracking-wider">{{ $t('explore.subtitle') }}</p>
    </div>

    <!-- Trending Section -->
    <div v-if="isTrendingLoading || trendingCreators.length > 0" class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-sm font-black uppercase tracking-widest text-tg-button">{{ $t('explore.trending') }} 🔥</h3>
        <span class="w-1.5 h-1.5 rounded-full bg-tg-button animate-ping"></span>
      </div>
      
      <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
        <!-- Skeleton -->
        <template v-if="isTrendingLoading">
          <div v-for="i in 4" :key="i" class="min-w-[140px] glass p-4 rounded-[2rem] flex flex-col items-center gap-3 animate-pulse">
            <div class="w-16 h-16 rounded-full bg-white/5"></div>
            <div class="h-3 bg-white/5 rounded w-full"></div>
          </div>
        </template>

        <!-- Real Data -->
        <template v-else>
          <div 
            v-for="trend in trendingCreators" 
            :key="trend.telegram_id"
            @click="emit('view-profile', trend.telegram_id)"
            class="min-w-[140px] max-w-[140px] glass p-4 rounded-[2.5rem] flex flex-col items-center text-center gap-3 border border-white/5 bg-gradient-to-b from-white/5 to-transparent active:scale-95 transition-all cursor-pointer"
          >
            <div class="relative">
                <div 
                    :class="getAvatarColor(trend.display_name)"
                    class="w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-black/20 border-2 border-white/10 overflow-hidden"
                >
                    <img v-if="trend.photo_url" :src="trend.photo_url" class="w-full h-full object-cover" />
                    <span v-else>{{ getInitials(trend.display_name) }}</span>
                </div>
                <div v-if="trend.is_verified" class="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-tg-bg flex items-center justify-center text-[8px] text-white">
                    ✔
                </div>
            </div>
            <div class="w-full">
                <p class="text-xs font-black truncate w-full">{{ trend.display_name }}</p>
                <p class="text-[9px] text-tg-hint font-bold truncate opacity-60">@{{ trend.username || 'user' }}</p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="relative group">
      <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span class="text-xl group-focus-within:scale-110 transition-transform duration-300">🔍</span>
      </div>
      <input 
        v-model="searchQuery"
        @focus="showHistory = true"
        type="text" 
        :placeholder="$t('explore.searchPlaceholder')" 
        class="w-full bg-tg-secondary/40 backdrop-blur-md border border-white/5 h-14 rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:border-tg-button/50 focus:bg-tg-secondary/60 transition-all shadow-inner" 
      />

      <!-- Search History Dropdown -->
      <div 
        v-if="showHistory && searchHistory.length > 0" 
        class="absolute top-16 left-0 right-0 glass border border-white/10 rounded-[2rem] p-4 z-50 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div class="flex justify-between items-center mb-3 px-2">
            <span class="text-[10px] font-black text-tg-hint uppercase tracking-widest">{{ $t('explore.lastSearch') }}</span>
            <button @click="clearHistory" class="text-[10px] font-bold text-red-400 uppercase">{{ $t('explore.clearAll') }}</button>
        </div>
        <div class="space-y-1">
            <div 
                v-for="history in searchHistory" 
                :key="history"
                class="flex items-center justify-between group/item"
            >
                <div 
                    @click="repeatSearch(history)"
                    class="flex-1 flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                >
                    <span class="opacity-30 text-xs">🕒</span>
                    <span class="text-sm font-medium">{{ history }}</span>
                </div>
                <button 
                    @click="removeHistory(history)"
                    class="p-2 opacity-0 group-hover/item:opacity-100 hover:text-red-400 transition-all"
                >
                    ✕
                </button>
            </div>
        </div>
      </div>
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
        {{ $t(`explore.categories.${cat}`) }}
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
        <p class="text-tg-hint font-bold text-sm">{{ $t('explore.noResults') }}</p>
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
                {{ creator.bio || $t('explore.defaultBio') }}
              </p>
            </template>
            <template v-else-if="selectedCategory === 'Content' || selectedCategory === 'Post'">
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
          <div class="flex items-center gap-2">
            <button v-if="selectedCategory === 'Content' || selectedCategory === 'Post'" 
                    @click.stop="openDonationModal(creator)"
                    class="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-lg active:scale-90 transition-all">
              🎁
            </button>
            <button @click="emit('view-profile', creator.telegram_id)" class="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-lg hover:bg-tg-button hover:text-white transition-all shadow-lg active:scale-90">
              ➔
            </button>
          </div>
        </div>
      </template>

      <!-- Pagination UI -->
      <div v-if="totalPages > 1" class="flex flex-col items-center gap-4 py-8">
        <div class="flex items-center gap-2">
            <!-- Prev -->
            <button 
                @click="changePage(currentPage - 1)"
                :disabled="currentPage === 1"
                :class="currentPage === 1 ? 'opacity-30 pointer-events-none' : 'active:scale-90'"
                class="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center transition-all"
            >
                ‹
            </button>

            <!-- Numbers -->
            <div class="flex items-center gap-1.5">
                <button 
                    v-for="p in totalPages" 
                    :key="p"
                    @click="changePage(p)"
                    :class="p === currentPage ? 'bg-tg-button text-white shadow-lg shadow-tg-button/30' : 'glass text-tg-hint border-white/5'"
                    class="w-10 h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center"
                >
                    {{ p }}
                </button>
            </div>

            <!-- Next -->
            <button 
                @click="changePage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                :class="currentPage === totalPages ? 'opacity-30 pointer-events-none' : 'active:scale-90'"
                class="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center transition-all"
            >
                ›
            </button>
        </div>
        <p class="text-[10px] text-tg-hint font-bold uppercase tracking-widest">
            Halaman {{ currentPage }} dari {{ totalPages }}
        </p>
      </div>
    </div>

    <!-- Donation Modal -->
    <div v-if="showDonationModal" class="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="w-full max-w-md glass rounded-[2.5rem] border border-white/10 p-6 space-y-6 animate-in slide-in-from-bottom-full duration-500 text-white">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-xl font-black text-white">Kirim Saweran 🎁</h3>
            <p class="text-xs text-tg-hint font-bold uppercase tracking-wider">Dukung kreator favorit Anda!</p>
          </div>
          <button @click="showDonationModal = false" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">✕</button>
        </div>

        <div v-if="selectedPost" class="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
          <div :class="getAvatarColor(selectedPost.display_name)" class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden">
            <img v-if="selectedPost.photo_url" :src="selectedPost.photo_url" class="w-full h-full object-cover">
            <span v-else>{{ getInitials(selectedPost.display_name) }}</span>
          </div>
          <div>
            <p class="text-sm font-bold text-white">{{ selectedPost.display_name }}</p>
            <p class="text-[10px] text-tg-hint">@{{ selectedPost.username }}</p>
          </div>
        </div>

        <div class="space-y-3 text-left">
          <label class="text-[10px] font-black uppercase tracking-widest text-tg-hint px-1">Pilih Nominal</label>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="amount in donationPresets" :key="amount"
                    @click="donationAmount = amount"
                    :class="donationAmount === amount ? 'bg-tg-button border-tg-button text-white shadow-lg shadow-tg-button/30' : 'bg-white/5 border-white/5 text-tg-hint'"
                    class="py-3 rounded-xl border text-xs font-black transition-all active:scale-90">
              {{ (amount/1000).toFixed(0) }}K
            </button>
            <div class="relative group">
              <input type="number" v-model="donationAmount" placeholder="Lainnya"
                     class="w-full py-3 px-3 bg-white/10 border border-white/10 rounded-xl text-xs font-black text-center text-white focus:outline-none focus:border-tg-button transition-all">
            </div>
          </div>
        </div>

        <div v-if="donationError" class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <p class="text-[10px] text-red-400 font-bold uppercase tracking-tight">{{ donationError }}</p>
        </div>

        <button @click="processDonation" 
                :disabled="isDonating || donationAmount <= 0"
                class="w-full py-4 bg-tg-button text-white rounded-2xl font-black text-sm shadow-xl shadow-tg-button/30 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2">
          <span v-if="isDonating" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          {{ isDonating ? 'MEMPROSES...' : `KIRIM Rp ${donationAmount.toLocaleString('id-ID')}` }}
        </button>
      </div>
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
