<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  shortId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['back'])

const isLoading = ref(true)
const content = ref(null)
const errorMsg = ref('')

const isDonating = ref(false)
const showDonationModal = ref(false)
const donationAmount = ref(5000)
const donationError = ref('')
const donationMessage = ref('')
const donationPresets = [2000, 5000, 10000, 25000, 50000]

const fetchContent = async () => {
  if (!props.shortId) {
    errorMsg.value = 'ID Konten tidak valid'
    isLoading.value = false
    return
  }
  
  isLoading.value = true
  errorMsg.value = ''
  
  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId: botId,
        action: 'get',
        short_id: props.shortId
      })
    });
    
    const result = await response.json();
    if (result.success) {
      content.value = result.data;
    } else {
      errorMsg.value = result.message || 'Gagal memuat konten';
    }
  } catch (e) {
    console.error("Fetch Content Error:", e);
    errorMsg.value = 'Terjadi kesalahan jaringan';
  } finally {
    isLoading.value = false
  }
}

const togglePrivacy = async () => {
  if (!content.value?.is_owner) return;
  
  const newPrivacy = content.value.privacy === 'public' ? 'followers_only' : 'public';
  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId: botId,
        action: 'update_privacy',
        short_id: props.shortId,
        privacy: newPrivacy
      })
    });
    
    const result = await response.json();
    if (result.success) {
      content.value.privacy = newPrivacy;
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
  } catch (e) {
    console.error("Toggle Privacy Error:", e);
  }
}

const publishContent = async () => {
  if (!content.value?.is_owner || content.value.status !== 'draft') return;
  
  if (!confirm('Apakah Anda yakin ingin mempublikasikan konten ini?')) return;

  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId: botId,
        action: 'publish_content',
        short_id: props.shortId
      })
    });
    
    const result = await response.json();
    if (result.success) {
      content.value.status = 'posted';
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      alert('Konten berhasil dipublikasikan!');
    } else {
      alert('Gagal mempublikasikan: ' + result.message);
    }
  } catch (e) {
    console.error("Publish Error:", e);
  }
}

const deleteContent = async () => {
  if (!content.value?.is_owner) return;
  
  if (!confirm('Konten akan dihapus permanen. Lanjutkan?')) return;

  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');

    const response = await fetch('/vesper/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData: tg?.initData,
        botId: botId,
        action: 'delete_content',
        short_id: props.shortId
      })
    });
    
    const result = await response.json();
    if (result.success) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      alert('Konten berhasil dihapus.');
      emit('back'); // Navigate away after deletion
    }
  } catch (e) {
    console.error("Delete Error:", e);
  }
}

const openDonationModal = () => {
  showDonationModal.value = true;
  donationError.value = '';
  donationAmount.value = 5000;
  donationMessage.value = '';
}

const processDonation = async () => {
  if (!content.value || donationAmount.value <= 0) return;
  
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
        receiverId: content.value.creator_id,
        amount: donationAmount.value,
        contentId: content.value.id,
        message: donationMessage.value
      })
    });
    
    const result = await response.json();
    if (result.success) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      showDonationModal.value = false;
      alert('Saweran berhasil dikirim!');
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
  fetchContent()
})
</script>

<template>
  <div class="space-y-4 animate-in fade-in duration-500 pb-10">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button @click="$emit('back')" class="w-9 h-9 glass rounded-xl flex items-center justify-center active:scale-90 transition-all text-sm">❮</button>
      <h2 class="text-lg font-black tracking-tight">Detail Konten</h2>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="glass p-8 rounded-3xl text-center border border-white/5 flex flex-col items-center justify-center">
        <div class="w-8 h-8 border-4 border-tg-button border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-sm font-bold text-tg-hint animate-pulse">Memuat data konten...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMsg" class="glass p-8 rounded-3xl text-center border border-red-500/20">
        <div class="text-4xl mb-3">⚠️</div>
        <p class="text-sm font-bold text-red-500">{{ errorMsg }}</p>
        <button @click="$emit('back')" class="mt-4 px-6 py-2 bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider">Kembali</button>
    </div>

    <!-- Content Detail -->
    <div v-else-if="content" class="glass p-5 rounded-3xl border-2 border-tg-button/20 bg-tg-button/5 space-y-4 relative overflow-hidden">
        
        <!-- Status Badges -->
        <div class="flex gap-2">
            <span v-if="content.status === 'draft'" class="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-500/30">DRAFT</span>
            <span v-else class="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-500/30">POSTED</span>
            
            <span v-if="content.privacy === 'public'" class="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-500/30">PUBLIC</span>
            <span v-else class="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-purple-500/30">PRIVATE</span>
        </div>

        <div class="flex items-center gap-3">
            <img :src="content.creator_photo || `https://ui-avatars.com/api/?name=${content.creator_name}&background=random`" class="w-10 h-10 rounded-full border border-white/10">
            <div class="flex-1">
            <h4 class="text-sm font-bold">{{ content.creator_name }}</h4>
            <p class="text-[10px] text-tg-hint">@{{ content.creator_username }} • {{ new Date(content.created_at).toLocaleDateString('id-ID') }}</p>
            </div>
        </div>
        
        <p class="text-sm whitespace-pre-wrap">{{ content.caption }}</p>

        <!-- Media Grid -->
        <div class="grid grid-cols-2 gap-2 mt-2" v-if="content.media_list && content.media_list.length > 0">
            <div v-for="media in content.media_list" :key="media.id" class="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/5 relative">
                <img v-if="media.imagekit_url" :src="media.imagekit_url" class="w-full h-full object-cover">
                <div v-else class="w-full h-full flex items-center justify-center text-2xl">🔒</div>
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div v-if="content.is_owner" class="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
            <div class="flex gap-2">
            <button v-if="content.status === 'draft'" @click="publishContent" class="flex-1 py-3 bg-green-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-green-500/30">
                Publikasikan 🚀
            </button>
            <button v-else @click="togglePrivacy" class="flex-1 py-3 bg-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-wider">
                {{ content.privacy === 'public' ? '🔓 Buat Private' : '🔒 Buat Public' }}
            </button>
            </div>
            <button @click="deleteContent" class="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-2xl text-xs font-black uppercase tracking-wider">
            Hapus Konten 🗑️
            </button>
        </div>
        <button v-else @click="openDonationModal" class="w-full py-3 bg-tg-button text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-tg-button/30 mt-4">
            Kirim Saweran 🎁
        </button>

    </div>

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

        <div v-if="content" class="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
          <img :src="content.creator_photo || `https://ui-avatars.com/api/?name=${content.creator_name}&background=random`" class="w-10 h-10 rounded-full">
          <div>
            <p class="text-sm font-bold">{{ content.creator_name }}</p>
            <p class="text-[10px] text-tg-hint">@{{ content.creator_username }}</p>
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
