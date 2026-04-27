<script setup>
import { ref, onMounted } from 'vue'
import Dashboard from './components/Dashboard.vue'
import Profile from './components/Profile.vue'
import Explore from './components/Explore.vue'
import Wallet from './components/Wallet.vue'
import Settings from './components/Settings.vue'
import Mutasi from './components/Mutasi.vue'
import Library from './components/Library.vue'
import Achievements from './components/Achievements.vue'
import Messages from './components/Messages.vue'
import ContentDetail from './components/ContentDetail.vue'
import Help from './components/Help.vue'
import Admin from './components/Admin.vue'

const activeTab = ref('dashboard')
const isSidebarOpen = ref(false)
const isNotifOpen = ref(false)
const tg = window.Telegram?.WebApp
const balance = ref(0)
const isLoadingBalance = ref(true)
const touchStartX = ref(0)
const touchStartY = ref(0)
const targetProfileId = ref(null)
const targetContentId = ref(null)
const targetDmUserId = ref(null)
const unreadMessagesCount = ref(0)
let unreadPollInterval = null
const isAdmin = ref(false)

const notifications = ref([
  { id: 1, type: 'donation', text: '💸 Anda menerima donasi Rp 50.000!', time: '5m ago', unread: true },
  { id: 2, type: 'system', text: '✅ Akun Kreator Anda sudah aktif.', time: '1h ago', unread: false },
  { id: 3, type: 'promo', text: '🎁 Bonus Topup 10% hari ini!', time: '3h ago', unread: false },
])

const menuItems = ref([
  { id: 'dashboard', label: 'Dashboard', icon: '⚡', color: 'bg-yellow-500' },
  { id: 'explore', label: 'Explore', icon: '🌍', color: 'bg-blue-500' },
  { id: 'profile', label: 'My Profile', icon: '👤', color: 'bg-purple-500' },
  { id: 'messages', label: 'Messages', icon: '💬', color: 'bg-teal-500' },
  { id: 'wallet', label: 'Dompet', icon: '💰', color: 'bg-green-500' },
  { id: 'achievements', label: 'Awards', icon: '🏆', color: 'bg-yellow-500' },
  { id: 'library', label: 'Library', icon: '📚', color: 'bg-orange-500' },
  { id: 'help', label: 'Bantuan', icon: '❓', color: 'bg-indigo-500' },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: 'bg-gray-500' },
])

onMounted(() => {
  if (tg) {
    tg.ready()
    tg.expand()
    document.body.className = tg.colorScheme
    
    // Apply saved font size & family
    const savedFontSize = localStorage.getItem('vesper_font_size') || 'medium'
    document.documentElement.classList.add(`font-size-${savedFontSize}`)
    
    const savedFontFamily = localStorage.getItem('vesper_font_family') || 'inter'
    document.documentElement.classList.add(`font-family-${savedFontFamily}`)

    const savedTheme = localStorage.getItem('vesper_theme') || 'auto'
    if (savedTheme === 'auto') {
        document.documentElement.classList.add(tg.colorScheme === 'dark' ? 'theme-dark' : 'theme-light')
    } else {
        document.documentElement.classList.add(`theme-${savedTheme}`)
    }

    const savedAccent = localStorage.getItem('vesper_accent') || 'blue'
    document.documentElement.classList.add(`accent-${savedAccent}`)
    
    // Get botId from URL if possible
    const urlParams = new URLSearchParams(window.location.search);
    const botIdParam = urlParams.get('bot_id');
    if (botIdParam) {
        localStorage.setItem('vesper_bot_id', botIdParam);
    }
    
    // Handle Deep Links (startapp)
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam) {
        if (startParam.startsWith('profile_')) {
            const profileId = startParam.replace('profile_', '');
            targetProfileId.value = profileId;
            activeTab.value = 'profile';
        } else if (startParam === 'wallet') {
            activeTab.value = 'wallet';
        } else if (startParam.startsWith('content_')) {
            const contentId = startParam.replace('content_', '');
            targetContentId.value = contentId;
            activeTab.value = 'content';
        }
    }

    fetchBalance()
    fetchUnreadCount()
    checkAdminStatus()
    unreadPollInterval = setInterval(fetchUnreadCount, 5000)
  }
})

const checkAdminStatus = async () => {
  try {
    const response = await fetch('/vesper/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: tg?.initData,
            botId: getBotId(),
            action: 'stats'
        })
    });
    const result = await response.json();
    if (result.success) {
      isAdmin.value = true;
      // Add Admin tab to menu if not already there
      if (!menuItems.value.find(i => i.id === 'admin')) {
        menuItems.value.push({ id: 'admin', label: 'Admin Panel', icon: '🛠️', color: 'bg-red-500' });
      }
    }
  } catch (e) {
    console.error("Admin Status Check Error:", e);
  }
}

const getBotId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('bot_id') || localStorage.getItem('vesper_bot_id');
}

const fetchBalance = async () => {
  try {
    const response = await fetch('/vesper/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: tg?.initData,
            botId: getBotId(),
            action: 'get_balance'
        })
    });
    const result = await response.json();
    if (result.success) {
      balance.value = result.data.balance;
    }
  } catch (e) {
    console.error("Header Balance Fetch Error:", e);
  } finally {
    isLoadingBalance.value = false
  }
}

const fetchUnreadCount = async () => {
  try {
    const response = await fetch('/vesper/api/direct_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: tg?.initData,
            botId: getBotId(),
            action: 'get_unread_count'
        })
    });
    const result = await response.json();
    if (result.success) {
      unreadMessagesCount.value = result.data.count;
    }
  } catch (e) {
    console.error("Unread Count Fetch Error:", e);
  }
}

const navigate = (id) => {
  if (id === 'profile' || id !== 'profile') targetProfileId.value = null
  if (id !== 'messages') targetDmUserId.value = null
  activeTab.value = id
  isSidebarOpen.value = false
}

const openDirectMessage = (userId) => {
  targetDmUserId.value = userId
  activeTab.value = 'messages'
  isSidebarOpen.value = false
}

const handleTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
}

const handleTouchEnd = (e) => {
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY
  
  const deltaX = touchEndX - touchStartX.value
  const deltaY = touchEndY - touchStartY.value
  
  // Swipe sensitivity (threshold)
  const minSwipeDist = 50
  
  // A horizontal swipe (X movement > Y movement)
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > minSwipeDist && touchStartX.value < 60) {
      // Swipe Right from left edge (0-60px) -> Open Sidebar
      isSidebarOpen.value = true
    } else if (deltaX < -minSwipeDist && isSidebarOpen.value) {
      // Swipe Left anywhere while open -> Close Sidebar
      isSidebarOpen.value = false
    }
  }
}
</script>

<template>
  <div 
    @touchstart="handleTouchStart" 
    @touchend="handleTouchEnd"
    class="min-h-screen bg-tg-bg text-tg-text relative overflow-hidden"
  >
    
    <!-- Sidebar Overlay -->
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"></div>

    <!-- Notification Overlay -->
    <div v-if="isNotifOpen" @click="isNotifOpen = false" class="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[80]"></div>

    <!-- Notification Drawer (Top-Down) -->
    <div 
      :class="isNotifOpen ? 'translate-y-0' : '-translate-y-full opacity-0'"
      class="fixed top-0 left-0 right-0 glass border-b border-white/10 z-[90] transition-all duration-500 ease-out shadow-2xl p-6 rounded-b-[2rem]"
    >
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-black text-lg">Notifications</h3>
        <button @click="isNotifOpen = false" class="text-tg-hint text-sm font-bold">Close</button>
      </div>
      <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        <div v-for="notif in notifications" :key="notif.id" class="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 items-center">
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-tg-secondary flex items-center justify-center text-lg">🔔</div>
            <div v-if="notif.unread" class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-tg-secondary"></div>
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium leading-snug">{{ notif.text }}</p>
            <span class="text-[10px] text-tg-hint">{{ notif.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar Drawer -->
    <aside 
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      class="fixed top-0 left-0 bottom-0 w-72 glass border-r border-white/10 z-[70] transition-transform duration-500 ease-out flex flex-col shadow-2xl"
    >
      <div class="p-4 border-b border-white/5 bg-gradient-to-br from-tg-button/20 to-transparent">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-tg-button p-0.5 shadow-lg shadow-tg-button/30">
             <img src="https://ui-avatars.com/api/?name=User&background=17212b&color=fff" class="w-full h-full rounded-[10px] object-cover" />
          </div>
          <div>
            <h3 class="font-bold text-sm leading-tight">Admin Vesper</h3>
            <p class="text-[10px] text-tg-hint">@vesper_admin</p>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-4 space-y-1 mt-2">
        <button v-for="item in menuItems" :key="item.id" @click="navigate(item.id)" :class="activeTab === item.id ? 'bg-tg-button/20 text-tg-button border-tg-button/30' : 'text-tg-hint hover:bg-white/5 border-transparent'" class="w-full flex items-center gap-3 p-2 rounded-xl border transition-all duration-300 group">
          <div :class="[item.color, activeTab === item.id ? 'scale-110' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100']" class="w-8 h-8 rounded-lg flex items-center justify-center text-base shadow-lg transition-all relative">
            {{ item.icon }}
            <div v-if="item.id === 'messages' && unreadMessagesCount > 0" class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-black border border-tg-secondary">
              {{ unreadMessagesCount > 9 ? '9+' : unreadMessagesCount }}
            </div>
          </div>
          <span class="font-bold text-xs">{{ item.label }}</span>
        </button>
      </nav>
      <div class="p-6 text-[8px] text-tg-hint opacity-50 font-black uppercase tracking-[0.2em] mt-auto">
        Vesper v1.1.3
      </div>
    </aside>

    <!-- Header Content -->
    <div class="pt-4 px-4 max-w-md mx-auto relative z-10">
      <header class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
          <button @click="isSidebarOpen = true" class="w-11 h-11 rounded-xl bg-tg-secondary border border-white/5 flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-90 transition-all">
            <div class="w-5 h-0.5 bg-tg-text rounded-full"></div>
            <div class="w-5 h-0.5 bg-tg-text rounded-full opacity-70"></div>
            <div class="w-3 h-0.5 bg-tg-button rounded-full self-start ml-3"></div>
          </button>
          <div @click="navigate('dashboard')" class="flex flex-col cursor-pointer active:opacity-70 transition-opacity">
            <h1 class="text-lg font-black tracking-tight leading-none uppercase">Vesper<span class="text-tg-button">App</span></h1>
            <span class="text-[10px] font-bold text-tg-hint tracking-[0.2em] uppercase">Creator Hub</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Balance Pill -->
          <div @click="activeTab = 'wallet'" class="px-2 py-1 active:scale-95 transition-all cursor-pointer">
            <span class="text-xs font-black tracking-tight">
              Rp {{ balance.toLocaleString('id-ID') }}
            </span>
          </div>

          <button @click="isNotifOpen = true" class="w-11 h-11 rounded-xl glass flex items-center justify-center border border-white/10 shadow-lg relative active:scale-90 transition-all">
            <span class="text-xl">🔔</span>
            <div v-if="notifications.some(n => n.unread)" class="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-tg-bg rounded-full animate-pulse"></div>
          </button>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="animate-in fade-in duration-700">
        <Dashboard 
          v-if="activeTab === 'dashboard'" 
          :target-content-id="targetContentId"
          @navigate="(tab) => { navigate(tab); targetContentId = null; }" 
        />
        <Explore v-if="activeTab === 'explore'" @view-profile="(id) => { targetProfileId = id; activeTab = 'profile' }" />
        <Profile v-if="activeTab === 'profile'" :targetId="targetProfileId" @nav="navigate" @open-dm="openDirectMessage" />
        <Messages v-if="activeTab === 'messages'" :initialTargetId="targetDmUserId" @view-profile="(id) => { targetProfileId = id; activeTab = 'profile' }" />
        <Wallet v-if="activeTab === 'wallet'" @mutasi="activeTab = 'mutasi'" />
        <Achievements v-if="activeTab === 'achievements'" />
        <Library v-if="activeTab === 'library'" @view-content="(id) => { targetContentId = id; activeTab = 'content'; }" />
        <ContentDetail v-if="activeTab === 'content'" :shortId="targetContentId" @back="activeTab = 'dashboard'" />
        <Help v-if="activeTab === 'help'" />
        <Settings v-if="activeTab === 'settings'" />
        <Mutasi v-if="activeTab === 'mutasi'" @back="activeTab = 'wallet'" />
        <Admin v-if="activeTab === 'admin'" />
      </main>
    </div>

    <!-- Background Decoration -->
    <div class="fixed -top-24 -right-24 w-64 h-64 bg-tg-button/5 rounded-full blur-[100px] pointer-events-none"></div>
    <div class="fixed -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

  </div>
</template>
