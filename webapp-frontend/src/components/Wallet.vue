<script setup>
import { ref, onMounted } from 'vue'
import Withdrawal from './Withdrawal.vue'

const isWithdrawOpen = ref(false)
const balance = ref(0)
const transactions = ref([])
const isLoading = ref(true)
const error = ref(null)

const getBotId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('bot_id') || localStorage.getItem('vesper_bot_id');
}

const fetchWalletData = async () => {
    isLoading.value = true
    error.value = null
    try {
        const tg = window.Telegram?.WebApp;
        const botId = getBotId();

        // Fetch Balance
        const bRes = await fetch('/vesper/api/wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                botId: botId,
                action: 'get_balance'
            })
        });
        const bData = await bRes.json();
        if (bData.success) balance.value = bData.data.balance;

        // Fetch History
        const hRes = await fetch('/vesper/api/wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                botId: botId,
                action: 'get_history'
            })
        });
        const hData = await hRes.json();
        if (hData.success) transactions.value = hData.data;

    } catch (e) {
        error.value = "Gagal memuat data dompet.";
        console.error(e);
    } finally {
        isLoading.value = false
    }
}

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

onMounted(fetchWalletData)
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">DOMPET</h2>
      <p class="text-tg-hint text-xs">Kelola pendapatan dan pengeluaran Anda</p>
    </div>

    <!-- Balance Card -->
    <div class="glass p-6 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-tg-button/20 via-transparent to-purple-500/10 relative overflow-hidden">
      <div class="relative z-10">
          <div class="flex justify-between items-start mb-8">
            <div>
              <p class="text-tg-hint text-[10px] font-bold uppercase tracking-widest opacity-70">Saldo Tersedia</p>
              <h3 v-if="!isLoading" class="text-4xl font-black mt-1">Rp {{ balance.toLocaleString('id-ID') }}</h3>
              <div v-else class="h-10 w-40 bg-white/5 animate-pulse rounded-xl mt-1"></div>
            </div>
            <div class="w-14 h-14 bg-gradient-to-br from-tg-button to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-tg-button/20">
              💰
            </div>
          </div>
          
          <div class="flex gap-3">
             <button @click="isWithdrawOpen = true" class="flex-1 bg-tg-button text-white py-3.5 rounded-2xl text-xs font-black shadow-xl shadow-tg-button/30 active:scale-95 transition-all">TARIK SALDO</button>
             <button @click="$emit('mutasi')" class="flex-1 bg-white/5 border border-white/10 text-white py-3.5 rounded-2xl text-xs font-bold active:scale-95 transition-all">RIWAYAT</button>
          </div>
      </div>
      
      <!-- Background Glow -->
      <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-tg-button/20 blur-[60px] rounded-full"></div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-3">
        <div class="glass p-4 rounded-3xl border border-white/5 text-center">
            <p class="text-[9px] font-black text-tg-hint uppercase tracking-tighter">Total Masuk</p>
            <p class="text-sm font-black text-green-500 mt-1">Rp 0</p>
        </div>
        <div class="glass p-4 rounded-3xl border border-white/5 text-center">
            <p class="text-[9px] font-black text-tg-hint uppercase tracking-tighter">Total Keluar</p>
            <p class="text-sm font-black text-red-400 mt-1">Rp 0</p>
        </div>
    </div>

    <!-- Withdrawal Modal -->
    <Withdrawal 
      v-if="isWithdrawOpen" 
      :balance="balance" 
      @close="isWithdrawOpen = false"
      @success="fetchWalletData"
    />

    <!-- Transaction History -->
    <div class="space-y-4">
      <div class="flex justify-between items-center px-1">
          <h3 class="font-black text-sm uppercase tracking-widest">Aktivitas Terbaru</h3>
          <button @click="fetchWalletData" class="text-[10px] font-bold text-tg-button">Refresh</button>
      </div>

      <div v-if="isLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-20 w-full bg-white/5 rounded-2xl animate-pulse"></div>
      </div>

      <div v-else-if="transactions.length === 0" class="glass p-10 rounded-3xl text-center border border-dashed border-white/10">
          <div class="text-4xl mb-4 opacity-20">🕳️</div>
          <p class="text-xs text-tg-hint font-bold">Belum ada transaksi</p>
      </div>

      <div v-else class="space-y-3">
        <div v-for="tx in transactions" :key="tx.id" class="glass p-4 rounded-2xl flex items-center gap-4 border border-white/5 group hover:border-white/10 transition-colors">
          <div :class="tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'" class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner">
            {{ tx.type === 'withdrawal' ? '📤' : (tx.type === 'topup' ? '📥' : '🎁') }}
          </div>
          <div class="flex-1">
            <h4 class="text-sm font-black">{{ tx.description || (tx.type === 'withdrawal' ? 'Penarikan Saldo' : 'Donasi Masuk') }}</h4>
            <p class="text-[10px] text-tg-hint font-bold uppercase tracking-widest opacity-60">{{ formatDate(tx.created_at) }}</p>
          </div>
          <div class="text-right">
            <p :class="tx.amount > 0 ? 'text-green-500' : 'text-red-500'" class="text-sm font-black">
              {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toLocaleString('id-ID') }}
            </p>
            <span :class="tx.status === 'success' ? 'bg-green-500/20 text-green-500' : (tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500')" class="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
              {{ tx.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
