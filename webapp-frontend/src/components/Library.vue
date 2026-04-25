<script setup>
import { ref } from 'vue'

const activeSection = ref('my-posts')

const sections = [
  { id: 'my-posts', label: 'My Posts', icon: '📝' },
  { id: 'collection', label: 'Collection', icon: '📦' }
]
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">Library</h2>
      <p class="text-tg-hint text-xs">Kelola konten dan koleksi media Anda</p>
    </div>

    <!-- Tab Navigation -->
    <div class="flex p-1 bg-tg-secondary/50 rounded-2xl border border-white/5 shadow-inner">
      <button 
        v-for="section in sections" 
        :key="section.id"
        @click="activeSection = section.id"
        :class="activeSection === section.id ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint'"
        class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300"
      >
        <span>{{ section.icon }}</span>
        {{ section.label }}
      </button>
    </div>

    <!-- Content Sections -->
    <div class="mt-6">
      <div v-if="activeSection === 'my-posts'" class="space-y-4">
        <div class="glass p-8 rounded-3xl text-center border border-white/5 opacity-50 italic text-sm">
          Belum ada post yang dibuat.
        </div>
      </div>

      <div v-if="activeSection === 'collection'" class="space-y-4">
        <div class="glass p-8 rounded-3xl text-center border border-white/5 opacity-50 italic text-sm">
          Koleksi Anda masih kosong.
        </div>
      </div>
    </div>
  </div>
</template>
