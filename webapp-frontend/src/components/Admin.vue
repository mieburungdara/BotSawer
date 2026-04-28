<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const isAdmin = ref(false)
const activeSubTab = ref('stats') // stats, bots, payments, admins
const stats = ref({})
const bots = ref([])
const loadingBotId = ref(null)
const loadingChannelId = ref(null)
const showAddBot = ref(false)
const showAddChannel = ref(false)
const editingChannelId = ref(null)
const liveChannelInfo = ref(null)
const channelBotAdmins = ref([])
const selectedBotForAction = ref(null)
const botActionText = ref('')
const botToolTab = ref('message') // message, channel, links, members, polls
const toolInputMessageId = ref('')
const toolInputTitle = ref('')
const toolInputDesc = ref('')
const toolInputUserId = ref('')
const toolInputPollQuestion = ref('')
const toolInputPollOptions = ref('')
const newBot = ref({
    token: '',
    type: 'public'
})
const showWebhookInfo = ref(false)
const selectedWebhookInfo = ref(null)
const channels = ref([])
const usersData = ref({ list: [], total: 0 })
const userSearch = ref('')
const userFilter = ref('all') // all, creator, banned, verified
const userSort = ref('newest') // newest, oldest, streak
const pendingPayments = ref([])
const admins = ref([])

// Channel Form
const newChannel = ref({
    name: '',
    username: '',
    description: '',
    category: '',
    type: 'public',
    chat_type: 'channel'
})

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
        if (result.message && result.message.includes('KEAMANAN')) {
            window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
                promise: Promise.reject(new Error(result.message)),
                reason: new Error(result.message)
            }));
            return { success: false, message: result.message };
        }
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

const loadUsers = async (reset = true) => {
    const result = await fetchAdminData('get_users', {
        search: userSearch.value,
        filter: userFilter.value,
        sort: userSort.value,
        offset: reset ? 0 : usersData.value.list.length,
        limit: 20
    });
    if (result.success) {
        if (reset) {
            usersData.value = result.data;
        } else {
            usersData.value.list = [...usersData.value.list, ...result.data.list];
            usersData.value.total = result.data.total;
        }
    }
}

const toggleBanUser = async (userObj) => {
    const isBannedBool = Boolean(Number(userObj.is_banned));
    const newStatus = !isBannedBool;
    const result = await fetchAdminData('toggle_ban_user', { 
        target_telegram_id: userObj.telegram_id, 
        is_banned: newStatus 
    });
    if (result.success) {
        tg.showAlert(result.message);
        loadUsers(true);
    } else {
        tg.showAlert('Gagal ubah status ban: ' + result.message);
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

const addChannel = async () => {
    if (!newChannel.value.name || !newChannel.value.username) {
        tg.showAlert('Nama dan Username wajib diisi');
        return;
    }
    
    const action = editingChannelId.value ? 'update_channel' : 'add_channel';
    const payload = editingChannelId.value 
        ? { ...newChannel.value, id: editingChannelId.value }
        : newChannel.value;

    const result = await fetchAdminData(action, payload);
    if (result.success) {
        tg.showAlert(result.message);
        showAddChannel.value = false;
        editingChannelId.value = null;
        newChannel.value = { name: '', username: '', description: '', category: '', type: 'public' };
        loadChannels();
    } else {
        tg.showAlert('Gagal simpan channel: ' + result.message);
    }
}

const deleteChannel = async () => {
    if (!editingChannelId.value) return;
    
    tg.showConfirm('Apakah Anda yakin ingin menghapus channel ini secara permanen?', async (ok) => {
        if (!ok) return;
        const result = await fetchAdminData('delete_channel', { channel_id: editingChannelId.value });
        if (result.success) {
            tg.showAlert(result.message);
            showAddChannel.value = false;
            editingChannelId.value = null;
            loadChannels();
        } else {
            tg.showAlert('Gagal hapus channel: ' + result.message);
        }
    });
}

const checkChannelAdmin = async (channelId) => {
    loadingChannelId.value = channelId;
    const result = await fetchAdminData('check_channel_admin', { channel_id: channelId });
    loadingChannelId.value = null;
    tg.showAlert(result.message);
}

const editChannel = async (channel) => {
    newChannel.value = {
        name: channel.name,
        username: channel.username,
        description: channel.description,
        category: channel.category,
        type: channel.type,
        chat_type: channel.chat_type || 'channel'
    };
    editingChannelId.value = channel.id;
    showAddChannel.value = true;
    
    // Fetch live info
    liveChannelInfo.value = null;
    channelBotAdmins.value = [];
    selectedBotForAction.value = null;

    fetchAdminData('get_channel_info', { channel_id: channel.id }).then(result => {
        if (result.success) liveChannelInfo.value = result.data;
    });

    fetchAdminData('get_channel_bot_admins', { channel_id: channel.id }).then(result => {
        if (result.success) {
            channelBotAdmins.value = result.data;
            if (result.data.length > 0) selectedBotForAction.value = result.data[0].id;
        }
    });
}

const sendBotMessage = async () => {
    if (!selectedBotForAction.value || !botActionText.value) {
        tg.showAlert('Pilih bot dan isi pesan');
        return;
    }
    const result = await fetchAdminData('channel_bot_action', {
        bot_id: selectedBotForAction.value,
        channel_id: editingChannelId.value,
        action_type: 'send_message',
        params: { text: botActionText.value }
    });
    if (result.success) {
        tg.showAlert(result.message);
        botActionText.value = '';
    } else {
        tg.showAlert('Gagal kirim pesan: ' + result.message);
    }
}

const runToolAction = async (type, params = {}) => {
    if (!selectedBotForAction.value) return;
    const result = await fetchAdminData('channel_bot_action', {
        bot_id: selectedBotForAction.value,
        channel_id: editingChannelId.value,
        action_type: type,
        params: params
    });
    if (result.success) {
        tg.showAlert(result.message + (result.data ? '\n\n' + result.data : ''));
        // Clear inputs based on type
        if (type === 'set_title') toolInputTitle.value = '';
        if (type === 'set_description') toolInputDesc.value = '';
        if (type === 'delete_message' || type === 'pin_message') toolInputMessageId.value = '';
    } else {
        tg.showAlert('Gagal: ' + result.message);
    }
}

const openAddChannel = () => {
    newChannel.value = { name: '', username: '', description: '', category: '', type: 'public', chat_type: 'channel' };
    editingChannelId.value = null;
    liveChannelInfo.value = null;
    channelBotAdmins.value = [];
    selectedBotForAction.value = null;
    botActionText.value = '';
    showAddChannel.value = true;
}

const updateBotInfo = async (botId) => {
    loadingBotId.value = botId;
    const result = await fetchAdminData('update_bot_info', { bot_id: botId });
    loadingBotId.value = null;
    if (result.success) {
        tg.showAlert(result.message);
        loadBots();
    } else {
        tg.showAlert('Gagal perbarui info: ' + result.message);
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
    if (tab === 'users') loadUsers();
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
        <!-- Sub Tabs Navigation -->
        <div class="sticky top-0 z-[50] bg-tg-bg/80 backdrop-blur-xl -mx-6 px-6 py-4 border-b border-white/5 mb-4">
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button 
                    v-for="tab in [
                        { id: 'stats', name: 'Stats', icon: '📊' },
                        { id: 'bots', name: 'Bots', icon: '🤖' },
                        { id: 'channels', name: 'Channels', icon: '📺' },
                        { id: 'users', name: 'Users', icon: '👥' },
                        { id: 'payments', name: 'Payments', icon: '💳' },
                        { id: 'admins', name: 'Admins', icon: '🛡️' }
                    ]" 
                    :key="tab.id"
                    @click="changeTab(tab.id)"
                    :class="activeSubTab === tab.id 
                        ? 'bg-tg-button text-white shadow-lg shadow-tg-button/20 border-tg-button' 
                        : 'bg-white/5 text-tg-hint border-transparent hover:bg-white/10'"
                    class="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0 border active:scale-95"
                >
                    <span class="text-sm">{{ tab.icon }}</span>
                    {{ tab.name }}
                </button>
            </div>
        </div>

        <!-- STATS TAB -->
        <div v-if="activeSubTab === 'stats'" class="grid grid-cols-2 gap-3">
            <div @click="changeTab('users')" class="glass p-4 rounded-3xl border border-white/5 space-y-1 cursor-pointer active:scale-95 transition-all">
                <p class="text-[10px] font-black text-tg-hint uppercase">Total Users</p>
                <p class="text-2xl font-black">{{ stats.total_users || 0 }}</p>
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

            <div v-for="bot in bots" :key="bot.id" 
                 :class="[bot.is_active ? 'border-white/5' : 'opacity-70 grayscale border-red-500/20', loadingBotId === bot.id ? 'pointer-events-none scale-[0.98]' : '']"
                 class="glass p-4 rounded-3xl border space-y-3 relative transition-all duration-300 overflow-hidden">
                
                <!-- Loading Overlay -->
                <div v-if="loadingBotId === bot.id" class="absolute inset-0 z-10 bg-tg-secondary/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                    <div class="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-[8px] font-black uppercase tracking-widest text-tg-button animate-pulse">Updating...</span>
                </div>

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
                    <button @click="updateBotInfo(bot.id)" class="py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl text-[9px] font-bold">UPDATE</button>
                    <button @click="checkWebhook(bot.id)" class="py-2 glass rounded-xl text-[9px] font-bold hover:bg-white/10 transition-all">INFO</button>
                    <button @click="setWebhook(bot.id)" class="py-2 bg-tg-button/20 text-tg-button border border-tg-button/30 rounded-xl text-[9px] font-bold">WEBHOOK</button>
                </div>
                <div class="grid grid-cols-1 gap-2">
                    <button @click="deleteWebhook(bot.id)" class="py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-bold">DELETE WEBHOOK</button>
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
                <button @click="openAddChannel" class="px-3 py-1.5 bg-tg-button text-white rounded-lg text-[10px] font-black uppercase">Tambah Channel</button>
            </div>

            <div v-if="channels.length === 0" class="py-12 text-center glass rounded-3xl border border-white/5 opacity-50">
                <p class="text-sm font-bold">Belum ada channel terdaftar</p>
            </div>

            <div v-for="channel in channels" :key="channel.id" 
                 @click="editChannel(channel)"
                 class="glass p-4 rounded-3xl border border-white/5 space-y-3 active:scale-95 transition-all cursor-pointer group">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-tg-secondary flex items-center justify-center text-lg relative group-hover:bg-tg-button/20 transition-all">
                            📺
                            <div :class="channel.is_active ? 'bg-green-500' : 'bg-red-500'" class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-tg-secondary"></div>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="font-bold text-sm">{{ channel.name }}</p>
                                <span class="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity bg-tg-button/20 text-tg-button px-1.5 py-0.5 rounded uppercase font-black">Edit</span>
                            </div>
                            <p class="text-[10px] text-tg-hint">{{ channel.username }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button 
                            @click.stop="toggleChannel(channel.id, channel.is_active)"
                            :class="channel.is_active ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'" 
                            class="px-3 py-1 rounded-lg text-[8px] font-black uppercase border transition-all active:scale-95"
                        >
                            {{ channel.is_active ? 'ACTIVE' : 'INACTIVE' }}
                        </button>
                        <button 
                            @click.stop="checkChannelAdmin(channel.id)"
                            :disabled="loadingChannelId === channel.id"
                            class="px-3 py-1 bg-blue-500/20 text-blue-500 border border-blue-500/30 rounded-lg text-[8px] font-black uppercase transition-all active:scale-95 disabled:opacity-50"
                        >
                            {{ loadingChannelId === channel.id ? 'CHECKING...' : 'CHECK ADMIN' }}
                        </button>
                    </div>
                </div>
                <div v-if="channel.description" class="p-3 bg-white/5 rounded-2xl text-[10px] text-tg-hint italic">
                    {{ channel.description }}
                </div>
                <div class="flex gap-2">
                    <span class="px-2 py-1 bg-white/5 rounded-md text-[8px] font-bold uppercase">{{ channel.category || 'NO CATEGORY' }}</span>
                    <span class="px-2 py-1 bg-white/5 rounded-md text-[8px] font-bold uppercase">{{ channel.type }}</span>
                </div>
            </div>

            <!-- Add Channel Form Overlay -->
            <div v-if="showAddChannel" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div @click="showAddChannel = false; editingChannelId = null; liveChannelInfo = null" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                <div class="relative w-full max-w-sm glass p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-4 overflow-y-auto max-h-[85vh] scrollbar-hide">
                    <div class="text-center shrink-0">
                        <h2 class="text-xl font-black uppercase tracking-tight">{{ editingChannelId ? 'Update' : 'Register' }} <span class="text-tg-button">Channel</span></h2>
                        <p class="text-[10px] text-tg-hint font-bold">{{ editingChannelId ? 'Perbarui informasi channel' : 'Masukkan informasi channel baru' }}</p>
                    </div>

                    <!-- Live Channel Stats -->
                    <div v-if="liveChannelInfo" class="bg-white/5 border border-white/5 rounded-3xl p-4 space-y-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-tg-button/20 flex items-center justify-center text-2xl">
                                {{ liveChannelInfo.chat_type === 'group' ? '👥' : '📢' }}
                            </div>
                            <div>
                                <p class="font-black text-sm">{{ liveChannelInfo.title }}</p>
                                <p class="text-[10px] text-tg-hint font-bold uppercase tracking-widest">{{ liveChannelInfo.member_count }} Members • {{ liveChannelInfo.type }}</p>
                            </div>
                        </div>
                        <div class="p-3 bg-black/20 rounded-2xl">
                            <p class="text-[9px] font-bold text-tg-hint uppercase mb-1">Live Description</p>
                            <p class="text-[10px] leading-relaxed italic">{{ liveChannelInfo.description }}</p>
                        </div>
                        <div v-if="liveChannelInfo.invite_link" class="text-[9px] bg-tg-button/10 text-tg-button p-2 rounded-xl text-center font-bold break-all">
                            {{ liveChannelInfo.invite_link }}
                        </div>
                    </div>

                    <!-- Managing Bots Section -->
                    <div v-if="editingChannelId" class="space-y-3">
                        <div class="flex items-center justify-between">
                            <p class="text-[10px] font-black text-tg-hint uppercase ml-2">Managing Bots</p>
                            <span class="text-[8px] bg-white/5 px-2 py-1 rounded-md font-bold uppercase">{{ channelBotAdmins.length }} Bots Found</span>
                        </div>
                        
                        <div v-if="channelBotAdmins.length === 0" class="p-4 border border-dashed border-white/10 rounded-2xl text-center">
                            <p class="text-[10px] font-bold text-tg-hint">Tidak ada bot yang terdeteksi sebagai admin.</p>
                        </div>

                        <div v-else class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <div v-for="bot in channelBotAdmins" :key="bot.id" class="px-3 py-2 bg-tg-secondary border border-white/5 rounded-xl flex items-center gap-2 shrink-0">
                                <span class="text-xs">🤖</span>
                                <div>
                                    <p class="text-[10px] font-black leading-none">{{ bot.name }}</p>
                                    <p class="text-[8px] text-tg-hint font-bold uppercase">@{{ bot.username }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Bot Actions Tool -->
                        <div v-if="channelBotAdmins.length > 0" class="bg-white/5 border border-white/5 rounded-3xl p-4 space-y-4">
                            <div class="flex items-center justify-between">
                                <p class="text-[10px] font-black text-tg-button uppercase tracking-wider">Bot Tools</p>
                                <select v-model="selectedBotForAction" class="bg-tg-secondary border border-white/5 px-2 py-1 rounded-lg text-[9px] font-bold outline-none">
                                    <option v-for="bot in channelBotAdmins" :key="bot.id" :value="bot.id">Via @{{ bot.username }}</option>
                                </select>
                            </div>

                            <!-- Tools Tab -->
                            <div class="flex gap-1 bg-black/20 p-1 rounded-xl overflow-x-auto scrollbar-hide">
                                <button @click="botToolTab = 'message'" :class="botToolTab === 'message' ? 'bg-tg-button text-white shadow-md' : 'text-tg-hint'" class="px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all shrink-0">Message</button>
                                <button @click="botToolTab = 'channel'" :class="botToolTab === 'channel' ? 'bg-tg-button text-white shadow-md' : 'text-tg-hint'" class="px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all shrink-0">Channel</button>
                                <button @click="botToolTab = 'members'" :class="botToolTab === 'members' ? 'bg-tg-button text-white shadow-md' : 'text-tg-hint'" class="px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all shrink-0">Members</button>
                                <button @click="botToolTab = 'polls'" :class="botToolTab === 'polls' ? 'bg-tg-button text-white shadow-md' : 'text-tg-hint'" class="px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all shrink-0">Engagement</button>
                                <button @click="botToolTab = 'links'" :class="botToolTab === 'links' ? 'bg-tg-button text-white shadow-md' : 'text-tg-hint'" class="px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all shrink-0">Links</button>
                                <button @click="botToolTab = 'maintenance'" :class="botToolTab === 'maintenance' ? 'bg-tg-button text-white shadow-md' : 'text-tg-hint'" class="px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all shrink-0">System</button>
                            </div>

                            <div v-if="botToolTab === 'message'" class="space-y-3">
                                <div class="space-y-2">
                                    <textarea v-model="botActionText" placeholder="Tulis pesan (HTML supported)..." class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-tg-button/50 transition-all h-20 resize-none"></textarea>
                                    <div class="grid grid-cols-2 gap-2">
                                        <button @click="sendBotMessage" class="py-3 bg-tg-button text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-tg-button/20 active:scale-95 transition-all">🚀 Send</button>
                                        <button @click="runToolAction('edit_message', { message_id: toolInputMessageId, text: botActionText })" class="py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">✏️ Edit Text</button>
                                        <button @click="runToolAction('edit_caption', { message_id: toolInputMessageId, text: botActionText })" class="col-span-2 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">📝 Edit Media Caption</button>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="space-y-1 col-span-2">
                                        <input v-model="toolInputMessageId" type="number" placeholder="Message ID" class="w-full bg-tg-secondary border border-white/5 px-4 py-2 rounded-xl text-xs font-bold outline-none">
                                    </div>
                                    <button @click="runToolAction('pin_message', { message_id: toolInputMessageId })" class="py-3 bg-blue-500/20 text-blue-500 border border-blue-500/30 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all">📌 Pin</button>
                                    <button @click="runToolAction('delete_message', { message_id: toolInputMessageId })" class="py-3 bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all">🗑️ Delete</button>
                                </div>
                                <button @click="runToolAction('unpin_message')" class="w-full py-2 border border-white/5 rounded-xl text-[8px] text-tg-hint font-bold uppercase active:scale-95 transition-all">Unpin All Messages</button>
                            </div>

                            <div v-if="botToolTab === 'channel'" class="space-y-3">
                                <div class="space-y-2">
                                    <input v-model="toolInputTitle" placeholder="Ganti Judul Channel" class="w-full bg-tg-secondary border border-white/5 px-4 py-3 rounded-xl text-xs font-bold outline-none">
                                    <button @click="runToolAction('set_title', { title: toolInputTitle })" class="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase active:scale-95">Update Title</button>
                                </div>
                                <div class="space-y-2">
                                    <textarea v-model="toolInputDesc" placeholder="Ganti Deskripsi Channel" class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none h-20 resize-none"></textarea>
                                    <button @click="runToolAction('set_description', { description: toolInputDesc })" class="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase active:scale-95">Update Description</button>
                                </div>
                            </div>

                            <div v-if="botToolTab === 'members'" class="space-y-3">
                                <div class="space-y-2">
                                    <input v-model="toolInputUserId" type="number" placeholder="User Telegram ID" class="w-full bg-tg-secondary border border-white/5 px-4 py-3 rounded-xl text-xs font-bold outline-none">
                                    <div class="grid grid-cols-2 gap-2">
                                        <button @click="runToolAction('get_member_info', { user_id: toolInputUserId })" class="py-3 bg-blue-500/20 text-blue-500 border border-blue-500/30 rounded-xl text-[9px] font-black uppercase active:scale-95">Check Info</button>
                                        <button @click="runToolAction('promote_member', { user_id: toolInputUserId })" class="py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-xl text-[9px] font-black uppercase active:scale-95">Make Admin</button>
                                        <button @click="runToolAction('ban_user', { user_id: toolInputUserId })" class="py-3 bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-[9px] font-black uppercase active:scale-95">Ban User</button>
                                        <button @click="runToolAction('unban_user', { user_id: toolInputUserId })" class="py-3 bg-green-500/20 text-green-500 border border-green-500/30 rounded-xl text-[9px] font-black uppercase active:scale-95">Unban User</button>
                                        <button v-if="newChannel.chat_type === 'group'" @click="runToolAction('restrict_user', { user_id: toolInputUserId, can_send: false })" class="col-span-2 py-3 bg-orange-500/20 text-orange-500 border border-orange-500/30 rounded-xl text-[9px] font-black uppercase active:scale-95">🔇 Mute / Read Only (24h)</button>
                                    </div>
                                </div>
                            </div>

                            <div v-if="botToolTab === 'polls'" class="space-y-3">
                                <div class="space-y-2">
                                    <input v-model="toolInputPollQuestion" placeholder="Pertanyaan Poll" class="w-full bg-tg-secondary border border-white/5 px-4 py-3 rounded-xl text-xs font-bold outline-none">
                                    <textarea v-model="toolInputPollOptions" placeholder="Opsi (Satu opsi per baris)" class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none h-24 resize-none"></textarea>
                                    <button @click="runToolAction('send_poll', { question: toolInputPollQuestion, options: toolInputPollOptions.split('\n').filter(o => o.trim() !== '') })" class="w-full py-3 bg-tg-button text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-tg-button/20 active:scale-95 transition-all">
                                        📊 Kirim Poll ke Channel
                                    </button>
                                </div>
                            </div>

                            <div v-if="botToolTab === 'links'" class="space-y-3">
                                <button @click="runToolAction('export_link')" class="w-full py-4 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                    🔗 Generate New Invite Link
                                </button>
                                <p class="text-[9px] text-tg-hint text-center px-4 font-bold italic">Link lama akan tetap berlaku kecuali jika link baru ini dibuat untuk menggantikan link utama.</p>
                            </div>

                            <div v-if="botToolTab === 'maintenance'" class="space-y-3">
                                <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3">
                                    <p class="text-[10px] font-black text-red-500 uppercase text-center">Danger Zone</p>
                                    <button @click="tg?.showConfirm('Bot akan keluar dari channel ini. Lanjutkan?', (ok) => ok && runToolAction('leave_chat'))" class="w-full py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">
                                        🚪 Bot Leave Channel
                                    </button>
                                </div>
                                <div class="space-y-2">
                                    <p class="text-[9px] font-bold text-tg-hint uppercase ml-2">Channel Photo (URL)</p>
                                    <input v-model="toolInputTitle" placeholder="https://example.com/photo.jpg" class="w-full bg-tg-secondary border border-white/5 px-4 py-3 rounded-xl text-xs font-bold outline-none">
                                    <button @click="runToolAction('set_photo', { photo_url: toolInputTitle })" class="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase active:scale-95">Set New Photo</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="editingChannelId" class="py-4 text-center">
                        <p class="text-[10px] font-bold animate-pulse text-tg-hint uppercase">Fetching live data from Telegram...</p>
                    </div>

                    <div class="space-y-3">
                        <div class="space-y-1">
                            <label class="text-[10px] font-black text-tg-hint uppercase ml-2">Channel Name</label>
                            <input v-model="newChannel.name" type="text" placeholder="Contoh: Vesper Official" class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-tg-button/50 transition-all" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-black text-tg-hint uppercase ml-2">Username</label>
                            <input v-model="newChannel.username" type="text" placeholder="@username" class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-tg-button/50 transition-all" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-black text-tg-hint uppercase ml-2">Category</label>
                            <input v-model="newChannel.category" type="text" placeholder="Contoh: News, Entertainment" class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-tg-button/50 transition-all" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-[10px] font-black text-tg-hint uppercase ml-2">Chat Type</label>
                                <select v-model="newChannel.chat_type" class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-tg-button/50 transition-all appearance-none">
                                    <option value="channel">Channel</option>
                                    <option value="group">Group</option>
                                </select>
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-black text-tg-hint uppercase ml-2">Visibility</label>
                                <select v-model="newChannel.type" class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-tg-button/50 transition-all appearance-none">
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-black text-tg-hint uppercase ml-2">Description</label>
                            <textarea v-model="newChannel.description" placeholder="Deskripsi singkat..." class="w-full bg-tg-secondary border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-tg-button/50 transition-all h-20 resize-none"></textarea>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button v-if="editingChannelId" @click="deleteChannel" class="w-12 h-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center active:scale-95 transition-all">
                            🗑️
                        </button>
                        <button @click="showAddChannel = false; editingChannelId = null" class="flex-1 py-4 glass rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all">Batal</button>
                        <button @click="addChannel" class="flex-1 py-4 bg-tg-button text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-tg-button/30 active:scale-95 transition-all">Simpan</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- USERS TAB -->
        <div v-if="activeSubTab === 'users'" class="space-y-4">
            <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                    <h3 class="font-bold text-sm text-tg-hint uppercase tracking-wider">User Management</h3>
                    <span class="text-[10px] font-black bg-tg-button/20 text-tg-button px-2 py-1 rounded-lg">{{ usersData.total }} TOTAL</span>
                </div>

                <!-- Search & Filters -->
                <div class="space-y-3">
                    <div class="relative">
                        <input 
                            v-model="userSearch" 
                            @input="loadUsers(true)"
                            type="text" 
                            placeholder="Cari nama, username, atau ID..." 
                            class="w-full bg-tg-secondary border border-white/5 p-4 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-tg-button/50 transition-all"
                        />
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                    </div>

                    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <select v-model="userFilter" @change="loadUsers(true)" class="bg-tg-secondary border border-white/5 px-4 py-2 rounded-xl text-[10px] font-bold outline-none">
                            <option value="all">Semua User</option>
                            <option value="creator">Kreator Saja</option>
                            <option value="verified">Terverifikasi</option>
                            <option value="banned">Dibanned</option>
                        </select>

                        <select v-model="userSort" @change="loadUsers(true)" class="bg-tg-secondary border border-white/5 px-4 py-2 rounded-xl text-[10px] font-bold outline-none">
                            <option value="newest">Terbaru</option>
                            <option value="oldest">Terlama</option>
                            <option value="streak">Streak Tertinggi</option>
                        </select>
                    </div>
                </div>
            </div>

            <div v-if="usersData.list.length === 0" class="py-12 text-center glass rounded-3xl border border-white/5 opacity-50">
                <p class="text-sm font-bold">Tidak ada user ditemukan</p>
            </div>

            <div v-for="userItem in usersData.list" :key="userItem.id" class="glass p-4 rounded-3xl border border-white/5 space-y-3 relative overflow-hidden">
                <div :class="userItem.is_banned ? 'bg-red-500' : 'bg-green-500'" class="absolute top-0 left-0 w-1 h-full"></div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-tg-secondary p-0.5 relative">
                            <img :src="userItem.photo_url || 'https://ui-avatars.com/api/?name=' + (userItem.first_name || 'User')" class="w-full h-full rounded-[14px] object-cover" />
                            <div v-if="userItem.is_verified" class="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] border-2 border-tg-secondary">✅</div>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="font-bold text-sm">{{ userItem.first_name }} {{ userItem.last_name || '' }}</p>
                                <span v-if="userItem.is_creator" class="text-[8px] bg-purple-500/20 text-purple-500 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Creator</span>
                            </div>
                            <p class="text-[10px] text-tg-hint">@{{ userItem.username || userItem.telegram_id }}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="text-[8px] text-tg-hint font-bold uppercase tracking-tighter">{{ new Date(userItem.created_at).toLocaleDateString() }}</span>
                        <button 
                            @click="toggleBanUser(userItem)"
                            :class="userItem.is_banned ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'" 
                            class="px-3 py-1 rounded-lg text-[8px] font-black uppercase border transition-all active:scale-95"
                        >
                            {{ userItem.is_banned ? 'UNBAN' : 'BAN USER' }}
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2 pt-1">
                    <div class="bg-white/5 p-2 rounded-xl text-center">
                        <p class="text-[8px] text-tg-hint uppercase font-black">Streak</p>
                        <p class="text-xs font-black">{{ userItem.donation_streak || 0 }} 🔥</p>
                    </div>
                    <div class="bg-white/5 p-2 rounded-xl text-center">
                        <p class="text-[8px] text-tg-hint uppercase font-black">ID</p>
                        <p class="text-[10px] font-bold">{{ userItem.telegram_id }}</p>
                    </div>
                    <div class="bg-white/5 p-2 rounded-xl text-center">
                        <p class="text-[8px] text-tg-hint uppercase font-black">Lang</p>
                        <p class="text-[10px] font-bold uppercase">{{ userItem.language_code || 'ID' }}</p>
                    </div>
                </div>
            </div>

            <button v-if="usersData.list.length < usersData.total" @click="loadUsers(false)" class="w-full py-4 glass border border-white/5 rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all text-tg-hint">
                Muat Lebih Banyak
            </button>
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
</style>
