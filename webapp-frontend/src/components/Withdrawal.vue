<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps(['balance'])
const emit = defineEmits(['close', 'success'])

const amount = ref('')
const isProcessing = ref(false)
const step = ref(1) // 0: Setup, 1: Input, 2: Success
const error = ref(null)

// Fees
const adminFee = 5000
const commissionRate = 0.025 // 2.5%

// Wallet Info
const walletInfo = ref({
    type: '',
    number: '',
    name: ''
})

const fetchWalletInfo = async () => {
    try {
        const tg = window.Telegram?.WebApp;
        const botId = localStorage.getItem('vesper_bot_id');
        const res = await fetch('/vesper/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg?.initData, botId, action: 'get' })
        });
        const result = await res.json();
        if (result.success) {
            walletInfo.value = {
                type: result.data.ewallet_type || '',
                number: result.data.ewallet_number || '',
                name: result.data.ewallet_name || ''
            }
            if (!walletInfo.value.number) step.value = 0;
        }
    } catch (e) {
        console.error(e);
    }
}

const saveWalletInfo = async () => {
    if (!walletInfo.value.type || !walletInfo.value.number || !walletInfo.value.name) return;
    isProcessing.value = true;
    try {
        const tg = window.Telegram?.WebApp;
        const botId = localStorage.getItem('vesper_bot_id');
        const res = await fetch('/vesper/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData, 
                botId, 
                action: 'update',
                profile_data: {
                    ewallet_type: walletInfo.value.type,
                    ewallet_number: walletInfo.value.number,
                    ewallet_name: walletInfo.value.name
                }
            })
        });
        const result = await res.json();
        if (result.success) {
            step.value = 1;
        }
    } catch (e) {
        error.value = "Gagal menyimpan pengaturan dompet.";
    } finally {
        isProcessing.value = false;
    }
}

const commissionFee = computed(() => {
  const val = parseInt(amount.value) || 0
  return Math.round(val * commissionRate)
})

const totalFee = computed(() => adminFee + commissionFee.value)

const netAmount = computed(() => {
  const val = parseInt(amount.value) || 0
  return Math.max(0, val - totalFee.value)
})

const canWithdraw = computed(() => {
  const val = parseInt(amount.value) || 0
  return val >= 50000 && val <= props.balance
})

const handleWithdraw = async () => {
  if (!canWithdraw.value) return
  isProcessing.value = true
  error.value = null
  
  try {
    const tg = window.Telegram?.WebApp;
    const botId = localStorage.getItem('vesper_bot_id');
    const res = await fetch('/vesper/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: tg?.initData, 
            botId, 
            amount: parseInt(amount.value),
            admin_fee: adminFee,
            commission_fee: commissionFee.value,
            net_amount: netAmount.value,
            ewallet_info: walletInfo.value
        })
    });
    const result = await res.json();
    if (result.success) {
        step.value = 2;
    } else {
        error.value = result.message;
    }
  } catch (e) {
    error.value = "Terjadi kesalahan sistem. Silakan coba lagi.";
  } finally {
    isProcessing.value = false
  }
}

onMounted(fetchWalletInfo)
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6">
    <!-- Overlay -->
    <div @click="$emit('close')" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    
    <!-- Drawer Content -->
    <div class="relative w-full max-w-md glass border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden">
      
      <!-- STEP 0: SETUP WALLET -->
      <div v-if="step === 0" class="space-y-6">
        <div class="text-center">
          <h3 class="text-xl font-black mb-1">Set Alamat Dompet</h3>
          <p class="text-tg-hint text-xs">Lengkapi data untuk menerima pembayaran</p>
        </div>

        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-tg-hint ml-1">Jenis E-Wallet</label>
            <select v-model="walletInfo.type" class="w-full bg-tg-secondary/50 border border-white/5 h-12 rounded-xl px-4 text-sm font-bold outline-none focus:border-tg-button transition-all appearance-none">
              <option value="" disabled>Pilih E-Wallet</option>
              <option value="DANA">DANA</option>
              <option value="OVO">OVO</option>
              <option value="GOPAY">GoPay</option>
              <option value="SHOPEEPAY">ShopeePay</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-tg-hint ml-1">Nomor Akun / HP</label>
            <input v-model="walletInfo.number" type="text" placeholder="0812xxxx" class="w-full bg-tg-secondary/50 border border-white/5 h-12 rounded-xl px-4 text-sm font-bold outline-none focus:border-tg-button transition-all" />
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-tg-hint ml-1">Nama Pemilik Akun</label>
            <input v-model="walletInfo.name" type="text" placeholder="Nama sesuai aplikasi" class="w-full bg-tg-secondary/50 border border-white/5 h-12 rounded-xl px-4 text-sm font-bold outline-none focus:border-tg-button transition-all" />
          </div>
        </div>

        <button 
          @click="saveWalletInfo"
          :disabled="!walletInfo.type || !walletInfo.number || !walletInfo.name || isProcessing"
          class="w-full h-14 bg-tg-button text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3"
        >
          <span v-if="isProcessing" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Simpan & Lanjutkan
        </button>
      </div>

      <!-- STEP 1: INPUT AMOUNT -->
      <div v-else-if="step === 1" class="space-y-6">
        <div class="flex justify-between items-center mb-4">
            <div class="text-left">
              <h3 class="text-xl font-black mb-1">Tarik Saldo</h3>
              <p class="text-tg-hint text-[10px] font-bold uppercase">{{ walletInfo.type }} • {{ walletInfo.number }}</p>
            </div>
            <button @click="step = 0" class="text-[10px] text-tg-button font-black uppercase border border-tg-button/20 px-3 py-1 rounded-full">Ubah</button>
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

        <!-- Fees Details -->
        <div class="bg-white/5 rounded-3xl p-5 space-y-3 text-xs border border-white/5">
          <div class="flex justify-between items-center">
            <span class="text-tg-hint font-bold">Biaya Admin (Bank)</span>
            <span class="font-black">Rp {{ adminFee.toLocaleString('id-ID') }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-tg-hint font-bold">Komisi Layanan (2.5%)</span>
            <span class="font-black">Rp {{ commissionFee.toLocaleString('id-ID') }}</span>
          </div>
          <div class="h-px bg-white/5 w-full"></div>
          <div class="flex justify-between items-center pt-1">
            <span class="text-tg-hint font-black uppercase tracking-widest text-[9px]">Dana Bersih Diterima</span>
            <span class="font-black text-tg-button text-lg">Rp {{ netAmount.toLocaleString('id-ID') }}</span>
          </div>
        </div>

        <div v-if="error" class="bg-red-500/10 text-red-400 p-3 rounded-xl text-[10px] font-bold text-center">
            ⚠️ {{ error }}
        </div>

        <button 
          @click="handleWithdraw"
          :disabled="!canWithdraw || isProcessing"
          :class="!canWithdraw || isProcessing ? 'opacity-50 grayscale' : 'shadow-xl shadow-tg-button/20 active:scale-95'"
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
          <h3 class="text-xl font-black mb-2">Permintaan Terkirim!</h3>
          <p class="text-tg-hint text-sm px-4 leading-relaxed">
            Penarikan Rp {{ parseInt(amount).toLocaleString('id-ID') }} sedang ditinjau. Dana akan masuk ke akun **{{ walletInfo.type }}** Anda dalam 1-24 jam.
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
