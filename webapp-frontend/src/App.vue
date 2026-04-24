<script setup>
import { ref, onMounted } from 'vue'
import Dashboard from './components/Dashboard.vue'
import Profile from './components/Profile.vue'
import Explore from './components/Explore.vue'

const activeTab = ref('dashboard')
const tg = window.Telegram?.WebApp

onMounted(() => {
  if (tg) {
    tg.ready()
    tg.expand()
    // Apply theme classes
    document.body.className = tg.colorScheme
  }
})
</script>

<template>
  <div class="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen flex flex-col">
    <!-- Header -->
    <header class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 bg-tg-button rounded-xl flex items-center justify-center shadow-lg shadow-tg-button/20">
          <span class="text-white font-bold text-xl">V</span>
        </div>
        <h1 class="text-xl font-bold tracking-tight">Vesper<span class="text-tg-button">App</span></h1>
      </div>
      <button class="w-10 h-10 rounded-full bg-tg-secondary flex items-center justify-center border border-white/5">
        <span class="text-xl">🔔</span>
      </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <Dashboard v-if="activeTab === 'dashboard'" />
      <Explore v-if="activeTab === 'explore'" />
      <Profile v-if="activeTab === 'profile'" />
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-6 left-4 right-4 h-16 glass rounded-2xl flex items-center justify-around px-4 shadow-2xl border border-white/10 z-50">
      <button 
        @click="activeTab = 'explore'"
        :class="activeTab === 'explore' ? 'text-tg-button scale-110' : 'text-tg-hint'"
        class="flex flex-col items-center gap-1 transition-all duration-300"
      >
        <span class="text-2xl">🌍</span>
        <span class="text-[10px] font-medium">Explore</span>
      </button>
      
      <button 
        @click="activeTab = 'dashboard'"
        :class="activeTab === 'dashboard' ? 'text-tg-button scale-110' : 'text-tg-hint'"
        class="flex flex-col items-center gap-1 transition-all duration-300"
      >
        <div :class="activeTab === 'dashboard' ? 'bg-tg-button text-white' : 'bg-tg-secondary text-tg-hint'" class="w-12 h-12 rounded-xl flex items-center justify-center -mt-8 shadow-xl border-4 border-tg-bg transition-all">
          <span class="text-2xl">⚡</span>
        </div>
        <span class="text-[10px] font-medium">Home</span>
      </button>

      <button 
        @click="activeTab = 'profile'"
        :class="activeTab === 'profile' ? 'text-tg-button scale-110' : 'text-tg-hint'"
        class="flex flex-col items-center gap-1 transition-all duration-300"
      >
        <span class="text-2xl">👤</span>
        <span class="text-[10px] font-medium">Profile</span>
      </button>
    </nav>
  </div>
</template>
