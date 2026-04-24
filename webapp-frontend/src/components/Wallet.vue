<script setup>
import { ref } from 'vue'
import Withdrawal from './Withdrawal.vue'

const isWithdrawOpen = ref(false)
const balance = ref(258400)
const transactions = ref([
  { id: 1, type: 'donation', title: 'Donasi dari Fans', amount: 50000, date: '24 Apr, 10:30', status: 'success' },
  { id: 2, type: 'topup', title: 'Topup Saldo', amount: 100000, date: '23 Apr, 15:45', status: 'success' },
  { id: 3, type: 'withdrawal', title: 'Penarikan Saldo', amount: -200000, date: '22 Apr, 09:00', status: 'pending' },
  { id: 4, type: 'donation', title: 'Donasi Konten #XJ2', amount: 25000, date: '21 Apr, 20:15', status: 'success' },
])
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500 pb-10">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">My Wallet</h2>
      <p class="text-tg-hint text-xs">Kelola pendapatan dan pengeluaran Anda</p>
    </div>

    <!-- Balance Card (Mini) -->
    <div class="glass p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-tg-secondary to-transparent">
      <div class="flex justify-between items-center mb-6">
        <div>
          <p class="text-tg-hint text-[10px] font-bold uppercase tracking-widest">Available Balance</p>
          <h3 class="text-3xl font-black mt-1">Rp {{ balance.toLocaleString('id-ID') }}</h3>
        </div>
        <div class="w-12 h-12 bg-tg-button/20 rounded-2xl flex items-center justify-center text-2xl text-tg-button">
          💳
        </div>
      </div>
      <div class="flex gap-3">
         <button @click="isWithdrawOpen = true" class="flex-1 bg-tg-button text-white py-2.5 rounded-xl text-xs font-black shadow-lg shadow-tg-button/20">PENARIKAN</button>
         <button @click="$emit('mutasi')" class="flex-1 bg-white/5 border border-white/10 text-white py-2.5 rounded-xl text-xs font-bold">MUTASI</button>
      </div>
    </div>

    <!-- Withdrawal Simulator -->
    <Withdrawal 
      v-if="isWithdrawOpen" 
      :balance="balance" 
      @close="isWithdrawOpen = false"
      @success="(amt) => {
        balance -= amt;
        isWithdrawOpen = false;
        // In real app, we would re-fetch transactions here
      }"
    />

    <!-- Transaction History -->
    <div>
      <h3 class="font-bold text-sm mb-4 px-1">Riwayat Transaksi</h3>
      <div class="space-y-3">
        <div v-for="tx in transactions" :key="tx.id" class="glass p-4 rounded-2xl flex items-center gap-4 border border-white/5">
          <div :class="tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'" class="w-10 h-10 rounded-xl flex items-center justify-center text-lg">
            {{ tx.type === 'withdrawal' ? '📤' : (tx.type === 'topup' ? '📥' : '🎁') }}
          </div>
          <div class="flex-1">
            <h4 class="text-sm font-bold">{{ tx.title }}</h4>
            <p class="text-[10px] text-tg-hint font-medium">{{ tx.date }}</p>
          </div>
          <div class="text-right">
            <p :class="tx.amount > 0 ? 'text-green-500' : 'text-red-500'" class="text-sm font-black">
              {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toLocaleString('id-ID') }}
            </p>
            <span :class="tx.status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'" class="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
              {{ tx.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
