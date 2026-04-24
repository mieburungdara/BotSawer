<script setup>
import { ref, computed } from 'vue'

const props = defineProps(['balance'])
const emit = defineEmits(['close', 'success'])

const amount = ref('')
const adminFee = 5000
const isProcessing = ref(false)
const step = ref(1) // 1: Input, 2: Success

const netAmount = computed(() => {
  const val = parseInt(amount.value) || 0
  return Math.max(0, val - adminFee)
})

const canWithdraw = computed(() => {
  const val = parseInt(amount.value) || 0
  return val >= 50000 && val <= props.balance
})

const handleWithdraw = async () => {
  if (!canWithdraw.value) return
  isProcessing.value = true
  // Simulasi proses bank (2 detik)
  await new Promise(resolve => setTimeout(resolve, 2000))
  isProcessing.value = false
  step.value = 2
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6">
    <!-- Overlay -->
    <div @click="$emit('close')" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    
    <!-- Drawer Content -->
    <div class="relative w-full max-w-md glass border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
      
      <!-- STEP 1: INPUT -->
      <div v-if="step === 1" class="space-y-6">
        <div class="text-center">
          <h3 class="text-xl font-black mb-1">Tarik Saldo</h3>
          <p class="text-tg-hint text-xs">Minimal penarikan Rp 50.000</p>
        </div>

        <div class="space-y-2">
          <div class="relative">
             <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold opacity-50">Rp</span>
             <input 
               v-model="amount"
               type="number" 
               placeholder="0"
               class="w-full bg-tg-secondary/50 border border-white/5 h-16 rounded-2xl pl-12 pr-4 text-2xl font-black outline-none focus:border-tg-button transition-all"
             />
          </div>
          <div class="flex justify-between px-1">
             <p class="text-[10px] text-tg-hint font-bold uppercase">Saldo Anda: Rp {{ balance.toLocaleString('id-ID') }}</p>
             <button @click="amount = balance" class="text-[10px] text-tg-button font-black uppercase">Tarik Semua</button>
          </div>
        </div>

        <!-- Details -->
        <div class="bg-white/5 rounded-2xl p-4 space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-tg-hint">Biaya Admin</span>
            <span class="font-bold">Rp {{ adminFee.toLocaleString('id-ID') }}</span>
          </div>
          <div class="flex justify-between border-t border-white/5 pt-2">
            <span class="text-tg-hint font-bold">Total Diterima</span>
            <span class="font-black text-tg-button text-sm">Rp {{ netAmount.toLocaleString('id-ID') }}</span>
          </div>
        </div>

        <button 
          @click="handleWithdraw"
          :disabled="!canWithdraw || isProcessing"
          :class="!canWithdraw || isProcessing ? 'opacity-50 grayscale' : 'shadow-lg shadow-tg-button/20 active:scale-95'"
          class="w-full h-14 bg-tg-button text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3"
        >
          <span v-if="isProcessing" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          {{ isProcessing ? 'Memproses...' : 'Konfirmasi Penarikan' }}
        </button>
      </div>

      <!-- STEP 2: SUCCESS -->
      <div v-else class="text-center space-y-6 py-4 animate-in zoom-in duration-500">
        <div class="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg shadow-green-500/10">
          ✓
        </div>
        <div>
          <h3 class="text-xl font-black mb-2">Penarikan Berhasil!</h3>
          <p class="text-tg-hint text-sm px-4 leading-relaxed">
            Permintaan penarikan Rp {{ parseInt(amount).toLocaleString('id-ID') }} sedang diproses. Dana akan masuk dalam 1-24 jam.
          </p>
        </div>
        <button 
          @click="$emit('success')"
          class="w-full h-14 bg-white text-tg-bg rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
        >
          Selesai
        </button>
      </div>

    </div>
  </div>
</template>
