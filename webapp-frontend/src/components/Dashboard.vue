<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const props = defineProps({})

const emit = defineEmits(['navigate'])

// Feed State
const feedItems = ref([])
const isFeedLoading = ref(false)
const hasMoreFeed = ref(true)
const currentFeedOffset = ref(0)
const feedLimit = 10
const quickLinks = [
  { id: 'explore', label: 'Explore', icon: '🌍', color: 'bg-blue-500/10 text-blue-500' },
  { id: 'profile', label: 'Profile', icon: '👤', color: 'bg-purple-500/10 text-purple-500' },
  { id: 'wallet', label: 'Dompet', icon: '💰', color: 'bg-green-500/10 text-green-500' },
  { id: 'achievements', label: 'Awards', icon: '🏆', color: 'bg-yellow-500/10 text-yellow-500' },
  { id: 'library', label: 'Library', icon: '📚', color: 'bg-orange-500/10 text-orange-500' },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: 'bg-gray-500/10 text-gray-500' },
]
const isAdmin = ref(false)
const balance = ref(0)
const stats = ref({
  total_earnings: 0,
  active_contents: 0,
  total_donations: 0,
  donation_streak: 0
})

const fetchDashboardData = async () => {
  isLoading.value = true
  try {
    const tg = window.Telegram?.WebApp;
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
      isAdmin.value = result.data.is_admin;
    }
  } catch (e) {
    console.error("Dashboard Fetch Error:", e);
  } finally {
    isLoading.value = false
  }
}

const fetchFeed = async (reset = false) => {
  if (isFeedLoading.value || (!hasMoreFeed.value && !reset)) return;
  
  if (reset) {
    feedItems.value = [];
    currentFeedOffset.value = 0;
    hasMoreFeed.value = true;
  }

  isFeedLoading.value = true;
  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: tg?.initData,
            botId: botId,
            offset: currentFeedOffset.value,
            limit: feedLimit
        })
    });
    const result = await response.json();
    
    if (result.success) {
      const items = result.data.list;
      if (items.length < feedLimit) {
        hasMoreFeed.value = false;
      }
      
      // Attempt to fetch and insert a random ad
      try {
          const adResponse = await fetch('/vesper/api/ads/random');
          const adResult = await adResponse.json();
          if (adResult.success && adResult.data) {
              // Insert randomly inside the fetched chunk
              const insertIndex = Math.floor(Math.random() * (items.length + 1));
              items.splice(insertIndex, 0, adResult.data);
          }
      } catch (adError) {
          console.error("Failed to fetch Ad:", adError);
      }

      feedItems.value = [...feedItems.value, ...items];
      currentFeedOffset.value += items.filter(item => !item.is_sponsored).length;
    }
  } catch (e) {
    console.error("Feed Fetch Error:", e);
  } finally {
    isFeedLoading.value = false;
  }
}

// Infinite Scroll logic
const handleScroll = () => {
  const scrollBottom = document.documentElement.scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 200;
  if (scrollBottom) {
    fetchFeed();
  }
}

const toggleBookmark = async (item) => {
  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/bookmarks/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId: botId,
        content_id: item.id
      })
    });
    
    const result = await response.json();
    if (result.success) {
      item.is_bookmarked = result.is_bookmarked;
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
  } catch (e) {
    console.error("Toggle Bookmark Error:", e);
  }
}

// Donation Logic
const showDonationModal = ref(false)
const selectedPost = ref(null)
const donationAmount = ref(5000)
const isDonating = ref(false)
const donationError = ref('')
const donationMessage = ref('')

const donationPresets = [2000, 5000, 10000, 25000, 50000]

const openDonationModal = (item) => {
  if (item.is_sponsored) return;
  selectedPost.value = item;
  showDonationModal.value = true;
  donationError.value = '';
  donationAmount.value = 5000;
  donationMessage.value = '';
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
        contentId: selectedPost.value.id,
        message: donationMessage.value
      })
    });
    
    const result = await response.json();
    if (result.success) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      showDonationModal.value = false;
      // Refresh stats to show new donation count/balance if needed
      fetchDashboardData();
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

onMounted(() => {
  fetchDashboardData();
  fetchFeed(true);
  window.addEventListener('scroll', handleScroll);
})

import { onUnmounted } from 'vue'
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
})
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
      
      <!-- Admin Quick Access Block -->
      <div v-if="isAdmin" 
           @click="$emit('navigate', 'admin')"
           class="glass p-5 rounded-[2rem] border-2 border-tg-button/30 bg-tg-button/5 flex items-center justify-between group active:scale-95 transition-all cursor-pointer">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-tg-button flex items-center justify-center text-2xl shadow-lg shadow-tg-button/30">
            🛡️
          </div>
          <div>
            <h3 class="font-black text-sm uppercase tracking-wider text-tg-button">Admin Panel</h3>
            <p class="text-[10px] text-tg-hint font-bold">Kelola sistem, bot, dan pembayaran</p>
          </div>
        </div>
        <div class="w-10 h-10 rounded-full bg-tg-button/10 flex items-center justify-center text-tg-button group-hover:translate-x-1 transition-transform">
          →
        </div>
      </div>


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
        <div class="glass p-3 rounded-2xl text-center border border-white/5 relative overflow-hidden">
          <p class="text-tg-hint text-[10px] font-bold uppercase mb-1">Sawer</p>
          <p class="text-sm font-black">{{ stats.total_donations }}</p>
          <div v-if="stats.donation_streak > 0" class="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-tl-lg shadow-lg">
            🔥 {{ stats.donation_streak }}
          </div>
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

      <!-- Personalized Feed Section -->
      <section class="mt-8">
        <div class="flex justify-between items-center mb-4 px-1">
          <h3 class="font-black text-sm uppercase tracking-wider text-tg-hint">🌟 Timeline</h3>
          <div class="h-px flex-1 bg-white/5 mx-4"></div>
        </div>

        <div class="space-y-4">
          <div v-if="feedItems.length === 0 && !isFeedLoading" class="glass p-8 rounded-3xl text-center border border-white/5">
            <div class="text-4xl mb-3 opacity-50">👀</div>
            <p class="text-sm font-bold text-tg-hint">Belum ada post terbaru</p>
            <p class="text-[10px] mt-1 text-tg-hint opacity-70">Ikuti lebih banyak kreator untuk melihat timeline yang seru!</p>
            <button @click="$emit('navigate', 'explore')" class="mt-4 px-4 py-2 bg-tg-button text-white rounded-xl text-xs font-black uppercase tracking-wider">Cari Kreator</button>
          </div>

          <!-- Feed Items -->
          <div v-for="item in feedItems" :key="item.short_id" 
               class="glass p-4 rounded-3xl border space-y-3 relative overflow-hidden"
               :class="item.is_sponsored ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5'">
            
            <!-- Sponsored Label -->
            <div v-if="item.is_sponsored" class="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black uppercase px-2 py-1 rounded-bl-xl z-10">
              Sponsored
            </div>

            <div class="flex items-center gap-3 relative z-10">
              <img :src="item.photo_url || `https://ui-avatars.com/api/?name=${item.display_name}&background=random`" class="w-10 h-10 rounded-full border" :class="item.is_sponsored ? 'border-yellow-500/50' : 'border-white/10'">
              <div class="flex-1">
                <div class="flex items-center gap-1">
                  <h4 class="text-sm font-bold">{{ item.display_name }}</h4>
                  <span v-if="item.is_verified" class="text-blue-400 text-xs">✓</span>
                  <!-- Donation Streak Badge -->
                  <span v-if="item.donation_streak > 0" class="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20 text-[8px] font-black uppercase tracking-tighter shadow-sm">
                    🔥 {{ item.donation_streak }}
                  </span>
                </div>
                <p v-if="!item.is_sponsored" class="text-[10px] text-tg-hint">@{{ item.username }} • {{ new Date(item.created_at).toLocaleDateString('id-ID') }}</p>
                <p v-else class="text-[10px] text-yellow-500/70 font-bold uppercase tracking-wider">Promoted</p>
                <!-- Privacy Indicator -->
                <div v-if="!item.is_sponsored && item.privacy === 'followers_only'" class="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20">
                  <span class="text-[8px]">🔒</span>
                  <span class="text-[8px] font-black uppercase tracking-widest">Followers Only</span>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <!-- Privacy Toggle for Owner -->
                <button v-if="item.is_owner" 
                        @click.stop="togglePrivacy(item)"
                        class="p-2 active:scale-125 transition-transform"
                        :title="item.privacy === 'public' ? 'Set to Followers Only' : 'Set to Public'">
                  <span class="text-lg opacity-60 hover:opacity-100 transition-opacity">
                    {{ item.privacy === 'public' ? '🔓' : '🔒' }}
                  </span>
                </button>
                <!-- Tip Button -->
                <button v-if="!item.is_sponsored" 
                        @click.stop="openDonationModal(item)"
                        class="p-2 active:scale-125 transition-transform">
                  <span class="text-lg opacity-60 hover:opacity-100 transition-opacity">🎁</span>
                </button>

                <!-- Bookmark Button -->
                <button v-if="!item.is_sponsored" 
                        @click.stop="toggleBookmark(item)"
                        class="p-2 active:scale-125 transition-transform">
                  <span :class="item.is_bookmarked ? 'text-yellow-500' : 'text-tg-hint'" class="text-lg">
                    🔖
                  </span>
                </button>
              </div>
            </div>
            
            <p class="text-sm relative z-10">{{ item.caption }}</p>
            
            <!-- Latest Donation Message -->
            <div v-if="item.latest_donation_message" class="mt-3 p-3 bg-white/5 rounded-2xl border border-white/5 relative z-10 animate-in fade-in slide-in-from-top-2 duration-500">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-black uppercase tracking-widest text-tg-button">Latest Shoutout 💬</span>
              </div>
              <p class="text-xs italic text-tg-hint">"{{ item.latest_donation_message }}"</p>
            </div>
            
            <a v-if="item.is_sponsored && item.action_url" :href="item.action_url" target="_blank" class="block w-full py-2 bg-yellow-500 text-black text-center rounded-xl text-xs font-black uppercase tracking-wider transition-transform active:scale-95 relative z-10">
              Kunjungi Sponsor
            </a>
            <button v-else-if="!item.is_sponsored" class="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-tg-button transition-colors relative z-10">Lihat Post</button>
          </div>

          <!-- Loading Indicator -->
          <div v-if="isFeedLoading" class="py-4 text-center">
            <div class="inline-block w-6 h-6 border-2 border-tg-hint border-t-tg-button rounded-full animate-spin"></div>
          </div>
        </div>
      </section>

    </template>

    <!-- Donation Modal -->
    <div v-if="showDonationModal" class="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="w-full max-w-md glass rounded-[2.5rem] border border-white/10 p-6 space-y-6 animate-in slide-in-from-bottom-full duration-500">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-xl font-black">Kirim Saweran 🎁</h3>
            <p class="text-xs text-tg-hint font-bold">Dukung kreator favorit Anda!</p>
          </div>
          <button @click="showDonationModal = false" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">✕</button>
        </div>

        <div v-if="selectedPost" class="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
          <img :src="selectedPost.photo_url || `https://ui-avatars.com/api/?name=${selectedPost.display_name}&background=random`" class="w-10 h-10 rounded-full">
          <div>
            <p class="text-sm font-bold">{{ selectedPost.display_name }}</p>
            <p class="text-[10px] text-tg-hint">@{{ selectedPost.username }}</p>
          </div>
        </div>

        <div class="space-y-3">
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
                     class="w-full py-3 px-3 bg-white/5 border border-white/5 rounded-xl text-xs font-black text-center focus:outline-none focus:border-tg-button transition-all">
            </div>
          </div>

          <!-- Custom Message -->
          <div class="space-y-2">
            <label class="text-xs font-black uppercase tracking-widest text-tg-hint">Pesan Personal (Opsional)</label>
            <textarea 
              v-model="donationMessage"
              placeholder="Berikan pesan penyemangat..."
              class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-tg-button outline-none transition-all resize-none"
              rows="3"
              maxlength="255"
            ></textarea>
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
