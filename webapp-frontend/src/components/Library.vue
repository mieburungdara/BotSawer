<script setup>
import { ref, onMounted, watch } from 'vue'

const emit = defineEmits(['navigate', 'view-content'])

const activeSection = ref('bookmarks')
const bookmarkedItems = ref([])
const myContents = ref([])
const isLoading = ref(false)

const sections = [
  { id: 'bookmarks', label: 'Bookmarks', icon: '🔖' },
  { id: 'my-posts', label: 'My Posts', icon: '📝' }
]

const fetchBookmarks = async () => {
  isLoading.value = true
  try {
    const tg = window.Telegram?.WebApp;
    const response = await fetch('/vesper/api/bookmarks/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg?.initData })
    });
    const result = await response.json();
    if (result.success) {
      bookmarkedItems.value = result.data;
    }
  } catch (e) {
    console.error("Fetch Bookmarks Error:", e);
  } finally {
    isLoading.value = false
  }
}

const fetchMyContents = async () => {
  isLoading.value = true
  try {
    const tg = window.Telegram?.WebApp;
    const response = await fetch('/vesper/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          initData: tg?.initData,
          action: 'list_my_content'
      })
    });
    const result = await response.json();
    if (result.success) {
      myContents.value = result.data;
    }
  } catch (e) {
    console.error("Fetch My Contents Error:", e);
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBookmarks();
})

watch(activeSection, (newVal) => {
  if (newVal === 'my-posts' && myContents.value.length === 0) {
    fetchMyContents();
  } else if (newVal === 'bookmarks' && bookmarkedItems.value.length === 0) {
    fetchBookmarks();
  }
})

const toggleBookmark = async (item) => {
  try {
    const tg = window.Telegram?.WebApp;
    const response = await fetch('/vesper/api/bookmarks/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: tg?.initData,
        content_id: item.id
      })
    });
    const result = await response.json();
    if (result.success && !result.is_bookmarked) {
      // Remove from local list if unbookmarked
      bookmarkedItems.value = bookmarkedItems.value.filter(b => b.id !== item.id);
    }
  } catch (e) {
    console.error("Toggle Bookmark Error:", e);
  }
}

const openContent = (shortId) => {
  emit('view-content', shortId);
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">Library</h2>
      <p class="text-tg-hint text-xs">Simpanan dan konten media Anda</p>
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
      <!-- Bookmarks Section -->
      <div v-if="activeSection === 'bookmarks'" class="space-y-4">
        <div v-if="isLoading" class="py-10 text-center">
            <div class="inline-block w-8 h-8 border-4 border-tg-hint border-t-tg-button rounded-full animate-spin"></div>
        </div>
        <template v-else>
            <div v-if="bookmarkedItems.length === 0" class="glass p-12 rounded-3xl text-center border border-white/5">
                <div class="text-5xl mb-4 opacity-30">📚</div>
                <p class="font-bold text-tg-hint">Belum ada konten tersimpan</p>
                <p class="text-xs text-tg-hint/70 mt-2">Bookmark konten favorit Anda di feed untuk melihatnya di sini.</p>
            </div>
            
            <!-- Bookmark Items List -->
            <div v-for="item in bookmarkedItems" :key="item.id" class="glass p-4 rounded-3xl border border-white/5 space-y-3 relative overflow-hidden">
                <div class="flex items-center gap-3">
                    <img :src="item.photo_url || `https://ui-avatars.com/api/?name=${item.display_name}&background=random`" class="w-10 h-10 rounded-full border border-white/10">
                    <div class="flex-1">
                        <div class="flex items-center gap-1">
                            <h4 class="text-sm font-bold">{{ item.display_name }}</h4>
                            <span v-if="item.is_verified" class="text-blue-400 text-xs">✓</span>
                        </div>
                        <p class="text-[10px] text-tg-hint">@{{ item.username }} • {{ new Date(item.created_at).toLocaleDateString('id-ID') }}</p>
                    </div>
                    <button @click="toggleBookmark(item)" class="p-2 text-yellow-500">🔖</button>
                </div>
                <p class="text-sm">{{ item.caption }}</p>
                <button @click="openContent(item.short_id)" class="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-tg-button transition-colors">Buka Post</button>
            </div>
        </template>
      </div>



      <!-- My Posts Section -->
      <div v-if="activeSection === 'my-posts'" class="space-y-4">
        <div v-if="isLoading" class="py-10 text-center">
            <div class="inline-block w-8 h-8 border-4 border-tg-hint border-t-tg-button rounded-full animate-spin"></div>
        </div>
        <template v-else>
            <div v-if="myContents.length === 0" class="glass p-12 rounded-3xl text-center border border-white/5">
                <div class="text-5xl mb-4 opacity-30">📝</div>
                <p class="font-bold text-tg-hint">Belum ada postingan</p>
                <p class="text-xs text-tg-hint/70 mt-2">Buat konten pertama Anda melalui bot VesperApp sekarang.</p>
            </div>
            
            <!-- My Content Items List -->
            <div v-for="item in myContents" :key="item.id" class="glass p-4 rounded-3xl border border-white/5 space-y-3 relative overflow-hidden flex flex-col">
                <div class="flex gap-4">
                  <!-- Thumbnail -->
                  <div class="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden relative">
                    <img v-if="item.thumb_url" :src="item.thumb_url" class="w-full h-full object-cover">
                    <div v-else class="w-full h-full flex items-center justify-center text-xl opacity-50">📷</div>
                  </div>
                  
                  <div class="flex-1 flex flex-col justify-center">
                    <div class="flex justify-between items-start mb-1">
                      <div class="flex gap-1 flex-wrap">
                        <!-- Status Badge -->
                        <span :class="{
                          'bg-yellow-500/20 text-yellow-500 border-yellow-500/30': item.status === 'draft',
                          'bg-green-500/20 text-green-500 border-green-500/30': item.status === 'posted',
                        }" class="px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest">
                          {{ item.status }}
                        </span>
                        
                        <!-- Privacy Badge -->
                        <span class="px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 text-[8px] font-black uppercase tracking-widest text-tg-hint">
                          {{ item.privacy === 'public' ? '🔓 Public' : '🔒 ' + item.privacy.replace('_', ' ') }}
                        </span>
                      </div>
                      <span class="text-[10px] text-tg-hint">{{ new Date(item.created_at).toLocaleDateString('id-ID') }}</span>
                    </div>
                    
                    <p class="text-xs font-bold line-clamp-2 mt-1">{{ item.caption || 'Tanpa Caption' }}</p>
                    
                    <div class="flex gap-3 mt-2">
                      <span class="text-[10px] text-tg-hint font-bold flex items-center gap-1">
                        🎁 Rp{{ item.total_donations.toLocaleString('id-ID') }}
                      </span>
                      <span class="text-[10px] text-tg-hint font-bold flex items-center gap-1">
                        👥 {{ item.donation_count }} saweran
                      </span>
                    </div>
                  </div>
                </div>
                
                <button @click="openContent(item.short_id)" class="w-full mt-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-tg-button transition-colors">Kelola Post</button>
            </div>
        </template>
      </div>

    </div>
  </div>
</template>
