<script setup>
import { ref, onMounted } from 'vue'
import Dashboard from './components/Dashboard.vue'
import Profile from './components/Profile.vue'
import Explore from './components/Explore.vue'

const activeTab = ref('dashboard')
const isSidebarOpen = ref(false)
const tg = window.Telegram?.WebApp

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⚡', color: 'bg-yellow-500' },
  { id: 'explore', label: 'Explore', icon: '🌍', color: 'bg-blue-500' },
  { id: 'profile', label: 'My Profile', icon: '👤', color: 'bg-purple-500' },
  { id: 'wallet', label: 'Wallet', icon: '💰', color: 'bg-green-500' },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: 'bg-gray-500' },
]

onMounted(() => {
  if (tg) {
    tg.ready()
    tg.expand()
    document.body.className = tg.colorScheme
  }
})

const navigate = (id) => {
  activeTab.value = id
  isSidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-tg-bg text-tg-text relative overflow-hidden">
    
    <!-- Sidebar Overlay -->
    <div 
      v-if="isSidebarOpen" 
      @click="isSidebarOpen = false"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300"
    ></div>

    <!-- Sidebar Drawer -->
    <aside 
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      class="fixed top-0 left-0 bottom-0 w-72 glass border-r border-white/10 z-[70] transition-transform duration-500 ease-out flex flex-col shadow-2xl"
    >
      <!-- User Info -->
      <div class="p-6 border-b border-white/5 bg-gradient-to-br from-tg-button/20 to-transparent">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-tg-button p-0.5 shadow-lg shadow-tg-button/30">
             <img src="https://ui-avatars.com/api/?name=User&background=24a1de&color=fff" class="w-full h-full rounded-[14px] object-cover" />
          </div>
          <div>
            <h3 class="font-bold text-lg leading-tight">Admin Vesper</h3>
            <p class="text-xs text-tg-hint">@vesper_admin</p>
          </div>
        </div>
      </div>

      <!-- Menu Navigation -->
      <nav class="flex-1 p-4 space-y-2 mt-4">
        <button 
          v-for="item in menuItems" 
          :key="item.id"
          @click="navigate(item.id)"
          :class="activeTab === item.id ? 'bg-tg-button/20 text-tg-button border-tg-button/30' : 'text-tg-hint hover:bg-white/5 border-transparent'"
          class="w-full flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 group"
        >
          <div :class="[item.color, activeTab === item.id ? 'scale-110' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100']" class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg transition-all">
            {{ item.icon }}
          </div>
          <span class="font-bold text-sm">{{ item.label }}</span>
          <div v-if="activeTab === item.id" class="ml-auto w-2 h-2 rounded-full bg-tg-button animate-pulse"></div>
        </button>
      </nav>

      <!-- Sidebar Footer -->
      <div class="p-6 border-t border-white/5">
        <div class="bg-tg-secondary/50 rounded-2xl p-4 flex items-center justify-between">
          <span class="text-xs font-bold text-tg-hint">Version 2.1.0</span>
          <span class="px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] rounded-full font-bold uppercase">Stable</span>
        </div>
      </div>
    </aside>

    <!-- Header Content -->
    <div class="pt-4 px-4 max-w-md mx-auto relative z-10">
      <header class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
          <!-- Burger Menu Button -->
          <button 
            @click="isSidebarOpen = true"
            class="w-11 h-11 rounded-xl bg-tg-secondary border border-white/5 flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-90 transition-all"
          >
            <div class="w-5 h-0.5 bg-tg-text rounded-full"></div>
            <div class="w-5 h-0.5 bg-tg-text rounded-full opacity-70"></div>
            <div class="w-3 h-0.5 bg-tg-button rounded-full self-start ml-3"></div>
          </button>
          
          <div class="flex flex-col">
            <h1 class="text-lg font-black tracking-tight leading-none uppercase">Vesper<span class="text-tg-button">App</span></h1>
            <span class="text-[10px] font-bold text-tg-hint tracking-[0.2em] uppercase">Creator Hub</span>
          </div>
        </div>

        <button class="w-11 h-11 rounded-xl glass flex items-center justify-center border border-white/10 shadow-lg relative">
          <span class="text-xl">🔔</span>
          <div class="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-tg-bg rounded-full"></div>
        </button>
      </header>

      <!-- Main Content Area -->
      <main class="animate-in fade-in duration-700">
        <Dashboard v-if="activeTab === 'dashboard'" />
        <Explore v-if="activeTab === 'explore'" />
        <Profile v-if="activeTab === 'profile'" />
      </main>
    </div>

    <!-- Background Decoration -->
    <div class="fixed -top-24 -right-24 w-64 h-64 bg-tg-button/5 rounded-full blur-[100px] pointer-events-none"></div>
    <div class="fixed -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

  </div>
</template>

<style>
.animate-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
