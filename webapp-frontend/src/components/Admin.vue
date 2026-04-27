<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const isAdmin = ref(false)
const activeSubTab = ref('stats') // stats, bots, payments, admins
const stats = ref({})
const bots = ref([])
const channels = ref([])
const pendingPayments = ref([])
const admins = ref([])

// Bot Form
const showAddBot = ref(false)
const newBot = ref({
    token: '',
    type: 'public'
})

// Webhook Info Modal
const showWebhookInfo = ref(false)
const selectedWebhookInfo = ref(null)

const tg = window.Telegram?.WebApp

const fetchAdminData = async (action, body = {}) => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const botId = urlParams.get('bot_id') || localStorage.getItem('vesper_bot_id');

        const response = await fetch('/vesper/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                botId: botId,
                action,
                ...body
            })
        });
        const result = await response.json();
        return result;
    } catch (e) {
        console.error(`Admin API Error (${action}):`, e);
        return { success: false, message: e.message };
    }
}

const loadStats = async () => {
    const result = await fetchAdminData('stats');
    if (result.success) {
        stats.value = result.data;
        isAdmin.value = true;
    } else {
        isAdmin.value = false;
    }
    isLoading.value = false;
}

const loadBots = async () => {
    const result = await fetchAdminData('get_bots');
    if (result.success) {
        bots.value = result.data;
    }
}

const loadPayments = async () => {
    const result = await fetchAdminData('get_pending_payments');
    if (result.success) {
        pendingPayments.value = result.data;
    }
}

const loadChannels = async () => {
    const result = await fetchAdminData('get_channels');
    if (result.success) {
        channels.value = result.data;
    }
}

const loadAdmins = async () => {
    const result = await fetchAdminData('get_admins');
    if (result.success) {
        admins.value = result.data;
    }
}

const addBot = async () => {
    const result = await fetchAdminData('add_bot', newBot.value);
    if (result.success) {
        tg.showAlert(result.message);
        showAddBot.value = false;
        newBot.value = { token: '', type: 'public' };
        loadBots();
    } else {
        tg.showAlert('Gagal: ' + result.message);
    }
}

const toggleBot = async (botId, currentStatus) => {
    const isActiveBool = Boolean(Number(currentStatus));
    const newStatus = !isActiveBool;
    const result = await fetchAdminData('toggle_bot', { bot_id: botId, is_active: newStatus });
    if (result.success) {
        loadBots();
    } else {
        tg.showAlert('Gagal ubah status: ' + result.message);
    }
}

const toggleChannel = async (channelId, currentStatus) => {
    const isActiveBool = Boolean(Number(currentStatus));
    const newStatus = !isActiveBool;
    const result = await fetchAdminData('toggle_channel', { channel_id: channelId, is_active: newStatus });
    if (result.success) {
        loadChannels();
    } else {
        tg.showAlert('Gagal ubah status: ' + result.message);
    }
}

const checkWebhook = async (botId) => {
    const result = await fetchAdminData('webhook_info', { bot_id: botId });
    if (result.success) {
        selectedWebhookInfo.value = result.data;
        showWebhookInfo.value = true;
    } else {
        tg.showAlert('Gagal cek webhook: ' + result.message);
    }
}

const setWebhook = async (botId) => {
    tg.showConfirm('Apakah Anda yakin ingin memasang webhook untuk bot ini?', async (ok) => {
        if (!ok) return;
        const result = await fetchAdminData('set_webhook', { bot_id: botId });
        if (result.success) {
            tg.showAlert('Webhook berhasil dipasang!');
        } else {
            tg.showAlert('Gagal pasang webhook: ' + result.message);
        }
    });
}

const deleteWebhook = async (botId) => {
    tg.showConfirm('Apakah Anda yakin ingin menghapus webhook bot ini?', async (ok) => {
        if (!ok) return;
        const result = await fetchAdminData('delete_webhook', { bot_id: botId });
        if (result.success) {
            tg.showAlert('Webhook berhasil dihapus!');
        } else {
            tg.showAlert('Gagal hapus webhook: ' + result.message);
        }
    });
}

onMounted(() => {
    loadStats();
})

const changeTab = (tab) => {
    activeSubTab.value = tab;
    if (tab === 'bots') loadBots();
    if (tab === 'channels') loadChannels();
    if (tab === 'payments') loadPayments();
    if (tab === 'admins') loadAdmins();
}

</script>

<template>
  <div class="space-y-6 pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-black italic tracking-tighter">ADMIN <span class="text-tg-button">PANEL</span></h2>
      <div class="px-3 py-1 rounded-full bg-tg-button/10 border border-tg-button/20 text-[10px] font-black text-tg-button uppercase tracking-widest">
        Super Admin
      </div>
    </div>

    <div v-if="isLoading" class="py-20 flex justify-center">
        <div class="w-8 h-8 border-4 border-tg-button border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="!isAdmin" class="glass p-8 rounded-[2rem] text-center space-y-4">
        <div class="text-5xl opacity-20">🚫</div>
        <h3 class="font-bold text-lg">Akses Ditolak</h3>
        <p class="text-tg-hint text-sm">Hanya akun dengan hak akses admin yang dapat melihat halaman ini.</p>
    </div>

    <div v-else class="space-y-6">
        <!-- Sub Tabs -->
        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button 
                v-for="tab in ['stats', 'bots', 'channels', 'payments', 'admins']" 
                :key="tab"
                @click="changeTab(tab)"
                :class="activeSubTab === tab ? 'bg-tg-button text-white' : 'glass text-tg-hint'"
                class="px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all shrink-0"
            >
                {{ tab }}
            </button>
        </div>

        <!-- STATS TAB -->
        <div v-if="activeSubTab === 'stats'" class="grid grid-cols-2 gap-4">
            <div class="glass p-4 rounded-3xl border border-white/5">
                <span class="text-[10px] font-bold text-tg-hint uppercase tracking-wider">Total Users</span>
                <p class="text-2xl font-black">{{ stats.total_users }}</p>
            </div>
            <div class="glass p-4 rounded-3xl border border-white/5">
                <span class="text-[10px] font-bold text-tg-hint uppercase tracking-wider">Total Bots</span>
                <p class="text-2xl font-black">{{ stats.total_bots }}</p>
            </div>
            <div class="glass p-4 rounded-3xl border border-white/5">
                <span class="text-[10px] font-bold text-tg-hint uppercase tracking-wider">Donations</span>
                <p class="text-lg font-black leading-tight">Rp {{ stats.total_donations_amount?.toLocaleString('id-ID') }}</p>
                <span class="text-[8px] text-tg-hint font-bold uppercase">{{ stats.total_donations_count }} trx</span>
            </div>
            <div class="glass p-4 rounded-3xl border border-tg-button/30 bg-tg-button/5">
                <span class="text-[10px] font-bold text-tg-button uppercase tracking-wider">Pending Topup</span>
                <p class="text-2xl font-black text-tg-button">{{ stats.pending_topups }}</p>
            </div>
        </div>

        <!-- BOTS TAB -->
        <div v-if="activeSubTab === 'bots'" class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="font-bold text-sm text-tg-hint uppercase tracking-wider">Bot Management</h3>
                <button @click="showAddBot = true" class="px-3 py-1.5 bg-tg-button text-white rounded-lg text-[10px] font-black uppercase">Tambah Bot</button>
            </div>

            <div v-for="bot in bots" :key="bot.id" class="glass p-4 rounded-3xl border border-white/5 space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-tg-secondary flex items-center justify-center text-lg relative">
                            🤖
                            <div :class="bot.is_active ? 'bg-green-500' : 'bg-red-500'" class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-tg-secondary"></div>
                        </div>
                        <div>
                            <p class="font-bold text-sm">{{ bot.name }}</p>
                            <p class="text-[10px] text-tg-hint">@{{ bot.username }}</p>
                        </div>
                    </div>
                    <button 
                        @click="toggleBot(bot.id, bot.is_active)"
                        :class="bot.is_active ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'" 
                        class="px-3 py-1 rounded-lg text-[8px] font-black uppercase border transition-all active:scale-95"
                    >
                        {{ bot.is_active ? 'ENABLED' : 'DISABLED' }}
                    </button>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <button @click="checkWebhook(bot.id)" class="py-2 glass rounded-xl text-[9px] font-bold hover:bg-white/10 transition-all">CHECK INFO</button>
                    <button @click="setWebhook(bot.id)" class="py-2 bg-tg-button/20 text-tg-button border border-tg-button/30 rounded-xl text-[9px] font-bold">SET WEBHOOK</button>
                    <button @click="deleteWebhook(bot.id)" class="py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-bold">DELETE</button>
                </div>
            </div>

            <!-- Add Bot Form Overlay -->
            <div v-if="showAddBot" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div @click="showAddBot = false" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                <div class="relative w-full max-w-sm glass p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-4">
                    <h3 class="font-black text-lg">Tambah Bot Baru</h3>
                    <p class="text-[10px] text-tg-hint">Masukkan token bot dari @BotFather. Sistem akan mengambil nama dan username secara otomatis.</p>
                    <div class="space-y-3">
                        <input v-model="newBot.token" type="text" placeholder="Bot Token (e.g. 123456:ABC...)" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-tg-button" />
                        <div class="flex items-center justify-between glass p-4 rounded-2xl border border-white/5">
                            <span class="text-xs font-bold text-tg-hint">Tipe Bot</span>
                            <div class="flex gap-2">
                                <button @click="newBot.type = 'public'" :class="newBot.type === 'public' ? 'bg-tg-button text-white' : 'bg-white/5 text-tg-hint'" class="px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all">Public</button>
                                <button @click="newBot.type = 'private'" :class="newBot.type === 'private' ? 'bg-tg-button text-white' : 'bg-white/5 text-tg-hint'" class="px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all">Private</button>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button @click="showAddBot = false" class="flex-1 py-4 glass rounded-2xl font-bold text-sm">Batal</button>
                        <button @click="addBot" class="flex-1 py-4 bg-tg-button text-white rounded-2xl font-black text-sm shadow-lg shadow-tg-button/30">Simpan</button>
                    </div>
                </div>
            </div>

            <!-- Webhook Info Modal -->
            <div v-if="showWebhookInfo" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div @click="showWebhookInfo = false" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                <div class="relative w-full max-w-sm glass p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-4 overflow-hidden">
                    <h3 class="font-black text-lg">Webhook Info</h3>
                    <div class="bg-black/20 p-4 rounded-2xl max-h-[60vh] overflow-y-auto">
                        <pre class="text-[10px] text-tg-hint font-mono">{{ JSON.stringify(selectedWebhookInfo, null, 2) }}</pre>
                    </div>
                    <button @click="showWebhookInfo = false" class="w-full py-4 bg-tg-button text-white rounded-2xl font-black text-sm">Tutup</button>
                </div>
            </div>
        </div>

        <!-- CHANNELS TAB -->
        <div v-if="activeSubTab === 'channels'" class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="font-bold text-sm text-tg-hint uppercase tracking-wider">Channel List</h3>
            </div>

            <div v-if="channels.length === 0" class="py-12 text-center glass rounded-3xl border border-white/5 opacity-50">
                <p class="text-sm font-bold">Belum ada channel terdaftar</p>
            </div>

            <div v-for="channel in channels" :key="channel.id" class="glass p-4 rounded-3xl border border-white/5 space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-tg-secondary flex items-center justify-center text-lg relative">
                            📺
                            <div :class="channel.is_active ? 'bg-green-500' : 'bg-red-500'" class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-tg-secondary"></div>
                        </div>
                        <div>
                            <p class="font-bold text-sm">{{ channel.name }}</p>
                            <p class="text-[10px] text-tg-hint">{{ channel.username }}</p>
                        </div>
                    </div>
                    <button 
                        @click="toggleChannel(channel.id, channel.is_active)"
                        :class="channel.is_active ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'" 
                        class="px-3 py-1 rounded-lg text-[8px] font-black uppercase border transition-all active:scale-95"
                    >
                        {{ channel.is_active ? 'ACTIVE' : 'INACTIVE' }}
                    </button>
                </div>
                <div v-if="channel.description" class="p-3 bg-white/5 rounded-2xl text-[10px] text-tg-hint italic">
                    {{ channel.description }}
                </div>
                <div class="flex gap-2">
                    <span class="px-2 py-1 bg-white/5 rounded-md text-[8px] font-bold uppercase">{{ channel.category || 'NO CATEGORY' }}</span>
                    <span class="px-2 py-1 bg-white/5 rounded-md text-[8px] font-bold uppercase">{{ channel.type }}</span>
                </div>
            </div>
        </div>

        <!-- PAYMENTS TAB -->
        <div v-if="activeSubTab === 'payments'" class="space-y-4">
            <h3 class="font-bold text-sm text-tg-hint uppercase tracking-wider">Pending Payments</h3>
            <div v-if="pendingPayments.length === 0" class="py-12 text-center glass rounded-3xl border border-white/5 opacity-50">
                <p class="text-sm font-bold">Tidak ada antrian pembayaran</p>
            </div>
            <div v-for="payment in pendingPayments" :key="payment.id" class="glass p-4 rounded-3xl border border-white/5">
                <!-- Payment card content... abbreviated for brevity but would be full featured -->
                <p class="text-xs font-bold">{{ payment.display_name }}</p>
                <p class="text-lg font-black">Rp {{ payment.amount?.toLocaleString('id-ID') }}</p>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
