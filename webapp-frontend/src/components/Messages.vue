<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps(['initialTargetId'])
const emit = defineEmits(['view-profile'])
const { t } = useI18n()

const tg = window.Telegram?.WebApp
const getBotId = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('bot_id') || localStorage.getItem('vesper_bot_id')
}

// State
const view = ref('list') // 'list' | 'chat'
const conversations = ref([])
const activeConversation = ref(null)
const messages = ref([])
const newMessage = ref('')
const isLoading = ref(true)
const isChatLoading = ref(false)
const isSending = ref(false)
const isFetchingMore = ref(false)
const hasMoreMessages = ref(true)
const messageInput = ref(null)
const messagesContainer = ref(null)

// ===========================
// API Helpers
// ===========================
const apiCall = async (body) => {
  const res = await fetch('/vesper/api/direct_message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      initData: tg?.initData,
      botId: getBotId(),
      ...body
    })
  })
  return res.json()
}

// ===========================
// Conversation List
// ===========================
const fetchConversations = async () => {
  try {
    const result = await apiCall({ action: 'get_conversations' })
    if (result.success) conversations.value = result.data
  } catch (e) {
    console.error('Fetch conversations error:', e)
  } finally {
    isLoading.value = false
  }
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return 'Baru saja'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'j'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// ===========================
// Chat View
// ===========================
const openChat = async (conversationId, partner) => {
  activeConversation.value = { id: conversationId, partner }
  view.value = 'chat'
  isChatLoading.value = true
  messages.value = []
  hasMoreMessages.value = true
  await fetchMessages()
  await markRead()
  isChatLoading.value = false
}

const openChatWithTarget = async (targetId) => {
  isChatLoading.value = true
  view.value = 'chat'
  try {
    const result = await apiCall({ action: 'get_or_create', targetId })
    if (result.success) {
      // Fetch partner info from conversation list or from conversations
      await fetchConversations()
      const conv = conversations.value.find(c => c.conversation_id === result.data.id)
      activeConversation.value = {
        id: result.data.id,
        partner: conv?.partner || { display_name: 'User', photo_url: null, username: '' }
      }
      hasMoreMessages.value = true
      await fetchMessages()
      await markRead()
    }
  } catch (e) {
    console.error('Open chat with target error:', e)
  } finally {
    isChatLoading.value = false
  }
}

const fetchMessages = async (loadMore = false) => {
  if (!activeConversation.value) return
  if (loadMore && (!hasMoreMessages.value || isFetchingMore.value)) return

  if (loadMore) {
    isFetchingMore.value = true
  }

  const offset = loadMore ? messages.value.length : 0

  try {
    const result = await apiCall({
      action: 'get_messages',
      conversationId: activeConversation.value.id,
      limit: 50,
      offset
    })
    
    if (result.success) {
      if (loadMore) {
        // Save scroll height before prepending
        const oldScrollHeight = messagesContainer.value?.scrollHeight || 0
        
        messages.value = [...result.data, ...messages.value]
        hasMoreMessages.value = result.data.length === 50
        
        // Restore scroll position so it doesn't jump
        await nextTick()
        if (messagesContainer.value) {
          const newScrollHeight = messagesContainer.value.scrollHeight
          messagesContainer.value.scrollTop = newScrollHeight - oldScrollHeight
        }
      } else {
        messages.value = result.data
        hasMoreMessages.value = result.data.length === 50
        await scrollToBottom()
      }
      
      // Update unread count in list
      const conv = conversations.value.find(c => c.conversation_id === activeConversation.value.id)
      if (conv) conv.unread_count = 0
    }
  } catch (e) {
    console.error('Fetch messages error:', e)
  } finally {
    isFetchingMore.value = false
  }
}

const handleScroll = async (e) => {
  if (e.target.scrollTop <= 50) {
    await fetchMessages(true)
  }
}

const markRead = async () => {
  if (!activeConversation.value) return
  await apiCall({ action: 'mark_read', conversationId: activeConversation.value.id })
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || isSending.value) return
  const content = newMessage.value.trim()
  newMessage.value = ''

  isSending.value = true
  try {
    const result = await apiCall({
      action: 'send_message',
      conversationId: activeConversation.value.id,
      content
    })
    if (result.success) {
      messages.value.push(result.data)
      await scrollToBottom()
      tg?.HapticFeedback?.impactOccurred('light')
    }
  } catch (e) {
    console.error('Send message error:', e)
    newMessage.value = content // restore on error
  } finally {
    isSending.value = false
  }
}

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const isSelf = (senderId) => {
  const userData = tg?.initDataUnsafe?.user
  return String(senderId) === String(userData?.id)
}

// ===========================
// Polling removed as per user request to save server resources.
// Data is fetched on-demand when opening conversations or chat views.

// ===========================
// Navigation
// ===========================
const goBack = () => {
  view.value = 'list'
  activeConversation.value = null
  messages.value = []
  fetchConversations()
}

// ===========================
// Lifecycle
// ===========================
onMounted(async () => {
  await fetchConversations()
  if (props.initialTargetId) {
    await openChatWithTarget(props.initialTargetId)
  }
})

onUnmounted(() => {})

watch(() => props.initialTargetId, async (newId) => {
  if (newId) await openChatWithTarget(newId)
})
</script>

<template>
  <div class="relative min-h-screen pb-6">

    <!-- ======================== -->
    <!-- VIEW: CONVERSATION LIST  -->
    <!-- ======================== -->
    <div v-if="view === 'list'" class="space-y-4 animate-in fade-in duration-300 -mx-2">
      <!-- Header -->
      <div class="flex items-center justify-between px-3 pt-4 mb-2">
        <div>
          <h1 class="text-2xl font-black tracking-tight">{{ $t('dm.title') }}</h1>
          <p class="text-[11px] text-tg-button font-bold uppercase tracking-[0.15em] mt-0.5">{{ $t('dm.subtitle') }}</p>
        </div>
        <div class="w-11 h-11 bg-tg-button/10 text-tg-button rounded-full flex items-center justify-center text-xl shadow-inner">💬</div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-3 animate-pulse">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 p-4 glass rounded-3xl border border-white/5">
          <div class="w-14 h-14 rounded-2xl bg-white/10 shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-32 bg-white/10 rounded-full"></div>
            <div class="h-3 w-48 bg-white/5 rounded-full"></div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="conversations.length === 0" class="flex flex-col items-center justify-center py-24 text-center space-y-4 px-8">
        <div class="w-20 h-20 glass rounded-[2rem] flex items-center justify-center text-4xl border border-white/5">💬</div>
        <h2 class="text-base font-black uppercase tracking-widest text-tg-hint">{{ $t('dm.noConversations') }}</h2>
        <p class="text-xs text-tg-hint opacity-50 leading-relaxed">{{ $t('dm.noConversationsHint') }}</p>
      </div>

      <!-- Conversation List -->
      <div v-else class="space-y-2.5 px-2">
        <div
          v-for="conv in conversations"
          :key="conv.conversation_id"
          @click="openChat(conv.conversation_id, conv.partner)"
          class="flex items-center gap-4 p-3.5 bg-[#121215]/80 backdrop-blur-xl border border-white/5 rounded-[1.8rem] hover:border-white/10 hover:bg-[#1a1a1f]/90 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] active:scale-[0.97] transition-all duration-300 cursor-pointer group shadow-[0_4px_15px_-5px_rgba(0,0,0,0.3)] relative overflow-hidden"
        >
          <!-- Subtle glow indicator for unread -->
          <div v-if="conv.unread_count > 0" class="absolute -left-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-tg-button/30 rounded-full blur-[20px] pointer-events-none transition-opacity duration-500"></div>

          <!-- Avatar -->
          <div class="relative shrink-0 z-10">
            <div class="w-[3.5rem] h-[3.5rem] rounded-[1.2rem] bg-gradient-to-tr from-[#1a1a1f] to-[#2a2a30] p-[2px] shadow-sm overflow-hidden group-hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-shadow">
              <img
                :src="conv.partner?.photo_url || 'https://ui-avatars.com/api/?name=' + (conv.partner?.display_name || 'U') + '&background=random'"
                class="w-full h-full object-cover rounded-[1rem]"
              />
            </div>
            <!-- Unread Badge -->
            <div
              v-if="conv.unread_count > 0"
              class="absolute -top-1.5 -right-1.5 min-w-[24px] h-[24px] bg-gradient-to-tr from-red-600 to-rose-400 rounded-full flex items-center justify-center px-1.5 border-2 border-[#121215] shadow-[0_0_10px_rgba(225,29,72,0.6)] z-20"
            >
              <span class="text-[10px] font-black text-white">{{ conv.unread_count > 99 ? '99+' : conv.unread_count }}</span>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0 py-0.5">
            <div class="flex items-center justify-between gap-2 mb-1">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="font-bold text-[15px] truncate text-white/90 group-hover:text-white transition-colors">
                  {{ conv.partner?.display_name || 'User' }}
                </span>
                <span v-if="conv.partner?.is_verified" class="text-blue-500 text-[11px] shrink-0 mt-0.5" style="text-shadow: 0 0 5px rgba(59,130,246,0.5)">✔</span>
              </div>
              <span :class="conv.unread_count > 0 ? 'text-rose-400 font-bold' : 'text-white/40 font-medium'" class="text-[11px] shrink-0">{{ formatTime(conv.last_message_at) }}</span>
            </div>
            <p :class="conv.unread_count > 0 ? 'text-white/90 font-semibold' : 'text-white/50 font-medium'" class="text-[13px] truncate">
              <span v-if="conv.last_message">
                {{ conv.last_message.sender_id === String($tg?.initDataUnsafe?.user?.id) ? $t('dm.you') + ': ' : '' }}{{ conv.last_message.content }}
              </span>
              <span v-else class="italic opacity-50">{{ $t('dm.noMessages') }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================== -->
    <!-- VIEW: CHAT               -->
    <!-- ======================== -->
    <div v-if="view === 'chat'" class="flex flex-col h-screen animate-in fade-in zoom-in-95 duration-500 relative -mx-4" style="height: calc(100vh - 80px)">
      
      <!-- Dynamic Background Decoration -->
      <div class="absolute inset-0 bg-tg-bg overflow-hidden pointer-events-none z-0">
        <div class="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#0088cc]/10 rounded-full blur-[100px] animate-pulse"></div>
        <div class="absolute bottom-[10%] left-[-20%] w-[70vw] h-[70vw] bg-[#6b21a8]/10 rounded-full blur-[120px]"></div>
        <!-- Noise Overlay -->
        <div class="absolute inset-0 opacity-[0.015]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E');"></div>
      </div>

      <!-- Floating Chat Header -->
      <div class="px-3 pt-3 pb-1 z-20 shrink-0">
        <div class="flex items-center gap-3 px-3 py-2.5 bg-[#121215]/80 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-[2rem]">
          <button @click="goBack" class="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-2xl text-white/80 active:scale-90 transition-transform shrink-0">
            ‹
          </button>
          <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0088cc] to-[#6b21a8] p-[2px] shrink-0 shadow-[0_0_15px_rgba(107,33,168,0.3)]">
            <img
              :src="activeConversation?.partner?.photo_url || 'https://ui-avatars.com/api/?name=' + (activeConversation?.partner?.display_name || 'U') + '&background=random'"
              class="w-full h-full object-cover rounded-full border-2 border-[#121215]"
            />
          </div>
          <div class="flex-1 min-w-0" @click="emit('view-profile', activeConversation?.partner?.telegram_id)">
            <div class="flex items-center gap-1.5">
              <p class="font-extrabold text-[15px] truncate cursor-pointer text-white/90 hover:text-white transition-colors tracking-tight">
                {{ activeConversation?.partner?.display_name || 'User' }}
              </p>
              <span v-if="activeConversation?.partner?.is_verified" class="text-[#00aaff] text-[11px] drop-shadow-[0_0_5px_rgba(0,170,255,0.5)] mt-0.5">✔</span>
            </div>
            <p class="text-[11px] text-white/40 font-semibold truncate uppercase tracking-wider mt-0.5">@{{ activeConversation?.partner?.username || 'user' }}</p>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div
        ref="messagesContainer"
        @scroll="handleScroll"
        class="flex-1 overflow-y-auto space-y-5 px-4 py-2 custom-scrollbar z-10"
        style="overscroll-behavior: contain;"
      >
        <!-- Loading More History -->
        <div v-if="isFetchingMore" class="flex justify-center py-4">
          <div class="w-6 h-6 border-[3px] border-[#00aaff] border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(0,170,255,0.5)]"></div>
        </div>
        <!-- Loading -->
        <div v-if="isChatLoading" class="flex justify-center py-12">
          <div class="text-[#00aaff] text-xs font-black tracking-widest uppercase animate-pulse">Memuat...</div>
        </div>

        <!-- Empty chat -->
        <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center py-20 text-center space-y-4 px-8">
          <div class="w-24 h-24 rounded-full bg-gradient-to-tr from-[#0088cc]/10 to-[#6b21a8]/10 flex items-center justify-center text-5xl border border-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">👋</div>
          <p class="text-sm font-bold text-white/90">Kirim pesan pertama!</p>
          <p class="text-xs text-white/50 font-medium leading-relaxed">
            Mulai obrolan dengan <span class="text-[#00aaff] font-bold">{{ activeConversation?.partner?.display_name || 'pengguna ini' }}</span> sekarang.
          </p>
        </div>

        <!-- Message Bubbles -->
        <TransitionGroup name="chat-bubble" tag="div" class="space-y-4 pb-4 pt-2">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="isSelf(msg.sender_id) ? 'justify-end' : 'justify-start'"
            class="flex items-end gap-3"
          >
            <!-- Partner Avatar (only on received messages) -->
            <div v-if="!isSelf(msg.sender_id)" class="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-[#1a1a1f] to-[#2a2a30] shrink-0 mb-0.5 shadow-sm">
              <img
                :src="msg.sender_photo || 'https://ui-avatars.com/api/?name=' + (msg.sender_name || 'U') + '&background=random'"
                class="w-full h-full object-cover rounded-full border border-white/10"
              />
            </div>

            <!-- Bubble -->
            <div
              :class="isSelf(msg.sender_id)
                ? 'bg-gradient-to-br from-[#0066cc] via-[#0088ff] to-[#00aaff] text-white rounded-[1.6rem] rounded-br-[0.4rem] ml-12 shadow-[0_4px_20px_-5px_rgba(0,136,255,0.4)]'
                : 'bg-[#16161a]/95 backdrop-blur-2xl border border-white/5 text-white/90 rounded-[1.6rem] rounded-bl-[0.4rem] mr-12 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.5)] relative overflow-hidden'"
              class="px-5 py-3 max-w-[85%] group"
            >
              <!-- Subtle inner highlight for partner bubble -->
              <div v-if="!isSelf(msg.sender_id)" class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-[1.6rem] rounded-bl-[0.4rem]"></div>
              
              <p :class="isSelf(msg.sender_id) ? 'text-white drop-shadow-sm' : 'relative z-10'" class="text-[14.5px] leading-[1.5] font-medium break-words">{{ msg.content }}</p>
              <div :class="isSelf(msg.sender_id) ? 'text-white/80 justify-end' : 'text-white/40 justify-start relative z-10'" class="flex items-center gap-1.5 mt-1.5 -mb-1">
                <span class="text-[10px] font-bold tracking-[0.05em]">
                  {{ new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                </span>
                <span v-if="isSelf(msg.sender_id) && msg.is_read" class="text-[11px] font-black text-white drop-shadow-md">✓✓</span>
                <span v-else-if="isSelf(msg.sender_id)" class="text-[11px] font-black opacity-60">✓</span>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Floating Input Area -->
      <div class="shrink-0 px-3 pb-3 pt-1 z-20">
        <div class="flex items-end gap-2 relative bg-[#121215]/80 backdrop-blur-2xl border border-white/5 p-2 rounded-[2rem] shadow-[0_-10px_40px_rgb(0,0,0,0.5)]">
          <textarea
            ref="messageInput"
            v-model="newMessage"
            @keydown="handleKeydown"
            :placeholder="$t('dm.typeMessage')"
            rows="1"
            class="flex-1 bg-[#0a0a0c] text-white/90 border border-white/5 rounded-[1.5rem] pl-4 pr-2 py-3.5 text-[15px] font-medium focus:outline-none focus:border-white/10 transition-all resize-none max-h-32 custom-scrollbar placeholder:text-white/30"
            style="field-sizing: content;"
          ></textarea>
          <button
            @click="sendMessage"
            :disabled="!newMessage.trim() || isSending"
            class="w-12 h-12 bg-gradient-to-tr from-[#0066cc] to-[#00aaff] rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,170,255,0.4)] active:scale-90 active:shadow-none transition-all disabled:opacity-30 disabled:grayscale shrink-0"
          >
            <span class="text-xl -ml-0.5 mt-0.5" style="text-shadow: 0 2px 5px rgba(0,0,0,0.2);">{{ isSending ? '⏳' : '➤' }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.4);
}

/* Chat Bubble Transitions */
.chat-bubble-enter-active,
.chat-bubble-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.chat-bubble-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.95);
}
.chat-bubble-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
