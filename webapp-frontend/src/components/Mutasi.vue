<script setup>
import { ref, computed } from 'vue'

const filter = ref('semua')
const currentPage = ref(1)
const itemsPerPage = 10 // 10 data per halaman

const transactions = ref([
  { id: 'TX-9921', type: 'masuk', title: 'Sawer: Fans Sejati', amount: 50000, balance: 258400, method: 'QRIS Bot', date: '24 Apr, 10:30' },
  { id: 'TX-9920', type: 'masuk', title: 'Topup Saldo WebApp', amount: 100000, balance: 208400, method: 'QRIS', date: '23 Apr, 15:45' },
  { id: 'TX-9919', type: 'keluar', title: 'Penarikan Dana', amount: -200000, balance: 108400, method: 'Internal', date: '22 Apr, 09:00' },
  { id: 'TX-9918', type: 'masuk', title: 'Sawer: Konten Exclusive', amount: 25000, balance: 308400, method: 'QRIS Bot', date: '21 Apr, 20:15' },
  { id: 'TX-9917', type: 'masuk', title: 'Sawer: Anonim', amount: 10000, balance: 283400, method: 'QRIS Bot', date: '20 Apr, 18:00' },
  { id: 'TX-9916', type: 'masuk', title: 'Sawer: Tip Video', amount: 15000, balance: 273400, method: 'QRIS Bot', date: '19 Apr, 12:00' },
  { id: 'TX-9915', type: 'keluar', title: 'Biaya Admin', amount: -2500, balance: 270900, method: 'System', date: '18 Apr, 10:00' },
  { id: 'TX-9914', type: 'masuk', title: 'Sawer: Fans #1', amount: 100000, balance: 370900, method: 'QRIS Bot', date: '17 Apr, 09:00' },
])

const allFilteredItems = computed(() => {
  if (filter.value === 'semua') return transactions.value
  return transactions.value.filter(tx => tx.type === filter.value)
})

const totalPages = computed(() => {
  return Math.ceil(allFilteredItems.value.length / itemsPerPage)
})

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return allFilteredItems.value.slice(start, end)
})

const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

const totalMasuk = computed(() => {
  return transactions.value
    .filter(tx => tx.type === 'masuk')
    .reduce((sum, tx) => sum + tx.amount, 0)
})

const totalKeluar = computed(() => {
  return transactions.value
    .filter(tx => tx.type === 'keluar')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
})

const emit = defineEmits(['back'])
</script>

<template>
  <div class="space-y-4 animate-in fade-in duration-500 pb-10">
    <!-- Header Compact -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button @click="$emit('back')" class="w-9 h-9 glass rounded-xl flex items-center justify-center active:scale-90 transition-all text-sm">❮</button>
        <h2 class="text-lg font-black tracking-tight">Mutasi Saldo</h2>
      </div>
      <span class="text-[9px] bg-tg-button/20 text-tg-button px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Audit Mode</span>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-2">
      <div class="glass p-3 rounded-2xl border-l-4 border-green-500">
        <p class="text-[8px] text-tg-hint font-bold uppercase opacity-60">Total Sawer</p>
        <p class="text-xs font-black text-green-500">+Rp {{ totalMasuk.toLocaleString('id-ID') }}</p>
      </div>
      <div class="glass p-3 rounded-2xl border-l-4 border-red-500">
        <p class="text-[8px] text-tg-hint font-bold uppercase opacity-60">Total Keluar</p>
        <p class="text-xs font-black text-red-500">-Rp {{ totalKeluar.toLocaleString('id-ID') }}</p>
      </div>
    </div>

    <!-- Filter Pills -->
    <div class="flex gap-1.5 p-1 glass rounded-xl">
      <button 
        v-for="f in ['semua', 'masuk', 'keluar']" 
        :key="f"
        @click="filter = f; currentPage = 1"
        :class="filter === f ? 'bg-tg-button text-white shadow-md' : 'text-tg-hint'"
        class="flex-1 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all"
      >
        {{ f }}
      </button>
    </div>

    <!-- Paginated List -->
    <div class="space-y-1.5 min-h-[300px]">
      <div v-for="tx in paginatedTransactions" :key="tx.id" class="glass p-3 rounded-2xl flex items-center justify-between gap-3 border border-white/5 active:bg-white/5 transition-all">
        <div class="flex items-center gap-3">
          <div :class="tx.type === 'masuk' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'" class="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0">
            {{ tx.type === 'masuk' ? '📥' : '📤' }}
          </div>
          <div>
            <h4 class="text-xs font-bold leading-tight">{{ tx.title }}</h4>
            <div class="flex items-center gap-2 mt-0.5">
               <p class="text-[9px] text-tg-hint font-medium">{{ tx.date }}</p>
               <span class="w-1 h-1 rounded-full bg-white/10"></span>
               <p class="text-[9px] text-tg-hint font-bold">{{ tx.method }}</p>
            </div>
          </div>
        </div>
        <div class="text-right">
          <p :class="tx.type === 'masuk' ? 'text-green-500' : 'text-red-500'" class="text-xs font-black">
            {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toLocaleString('id-ID') }}
          </p>
          <p class="text-[8px] text-tg-hint font-medium mt-0.5">Rp {{ tx.balance.toLocaleString('id-ID') }}</p>
        </div>
      </div>

      <div v-if="allFilteredItems.length === 0" class="text-center py-20 opacity-50">
         <p class="text-[10px] font-bold uppercase">Tidak ada transaksi ditemukan</p>
      </div>
    </div>

    <!-- Numbered Pagination UI -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-2">
      <button 
        @click="changePage(currentPage - 1)"
        :disabled="currentPage === 1"
        :class="currentPage === 1 ? 'opacity-30' : 'active:scale-90'"
        class="w-9 h-9 glass rounded-xl flex items-center justify-center transition-all"
      >
        ❮
      </button>

      <div class="flex gap-1.5">
        <button 
          v-for="page in totalPages" 
          :key="page"
          @click="changePage(page)"
          :class="currentPage === page ? 'bg-tg-button text-white shadow-lg' : 'glass text-tg-hint'"
          class="w-9 h-9 rounded-xl text-xs font-black transition-all"
        >
          {{ page }}
        </button>
      </div>

      <button 
        @click="changePage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        :class="currentPage === totalPages ? 'opacity-30' : 'active:scale-90'"
        class="w-9 h-9 glass rounded-xl flex items-center justify-center transition-all"
      >
        ❯
      </button>
    </div>

    <!-- Results Indicator -->
    <p v-if="allFilteredItems.length > 0" class="text-[9px] text-center text-tg-hint font-bold uppercase tracking-widest mt-2">
      Halaman {{ currentPage }} dari {{ totalPages }}
    </p>

  </div>
</template>
