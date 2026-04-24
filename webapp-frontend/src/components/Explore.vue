<!-- Explore.vue -->
<template>
  <div class="space-y-4">
    <div class="glass flex items-center px-4 h-12 rounded-xl mb-6">
      <span class="mr-2">🔍</span>
      <input type="text" placeholder="Cari Kreator..." class="bg-transparent border-none outline-none text-sm w-full" />
    </div>

    <div v-for="i in 5" :key="i" class="glass p-4 rounded-2xl flex items-center gap-4">
      <div class="w-12 h-12 rounded-full bg-tg-button/20 flex items-center justify-center font-bold text-tg-button">
        K{{ i }}
      </div>
      <div class="flex-1">
        <h4 class="text-sm font-bold">Kreator Berbakat {{ i }}</h4>
        <p class="text-xs text-tg-hint">@kreator_{{ i }}</p>
      </div>
      <button class="bg-tg-button/10 text-tg-button px-4 py-1.5 rounded-lg text-xs font-bold">
        Lihat
      </button>
    </div>
  </div>
</template>
