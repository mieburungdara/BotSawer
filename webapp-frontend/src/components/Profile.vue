<!-- Profile.vue -->
<template>
  <div class="space-y-6">
    <div class="flex flex-col items-center py-6">
      <div class="w-24 h-24 rounded-full border-4 border-tg-button p-1 mb-4">
        <img src="https://ui-avatars.com/api/?name=User&background=24a1de&color=fff" class="w-full h-full rounded-full object-cover" />
      </div>
      <h2 class="text-xl font-bold">@username</h2>
      <p class="text-tg-hint text-sm">Content Creator</p>
    </div>
    
    <div class="grid grid-cols-3 gap-2">
      <div v-for="i in 9" :key="i" class="aspect-square glass rounded-lg animate-pulse bg-white/5"></div>
    </div>
  </div>
</template>
