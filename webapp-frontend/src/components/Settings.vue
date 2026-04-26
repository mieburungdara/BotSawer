<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['nav'])
const { t, locale } = useI18n()

const fontSize = ref(localStorage.getItem('vesper_font_size') || 'medium')
const fontFamily = ref(localStorage.getItem('vesper_font_family') || 'inter')
const currentLocale = ref(locale.value)
const isAppearanceExpanded = ref(false)
const theme = ref(localStorage.getItem('vesper_theme') || 'auto')
const accentColor = ref(localStorage.getItem('vesper_accent') || 'blue')

const isFeedbackOpen = ref(false)
const isSubmittingFeedback = ref(false)
const feedbackData = ref({
    type: 'suggestion',
    content: ''
})

const updateFontSize = (size) => {
  fontSize.value = size
  localStorage.setItem('vesper_font_size', size)
  
  // Update document class
  const html = document.documentElement
  html.classList.remove('font-size-small', 'font-size-medium', 'font-size-large')
  html.classList.add(`font-size-${size}`)
}

const updateFontFamily = (family) => {
  fontFamily.value = family
  localStorage.setItem('vesper_font_family', family)
  
  // Update document class
  const html = document.documentElement
  html.classList.remove('font-family-inter', 'font-family-roboto', 'font-family-outfit', 'font-family-montserrat')
  html.classList.add(`font-family-${family}`)
}

const updateLocale = (lang) => {
  currentLocale.value = lang
  locale.value = lang
  localStorage.setItem('vesper_locale', lang)
}

const updateTheme = (newTheme) => {
  theme.value = newTheme
  localStorage.setItem('vesper_theme', newTheme)
  
  const html = document.documentElement
  html.classList.remove('theme-dark', 'theme-light')
  
  if (newTheme === 'auto') {
    const isDark = window.Telegram?.WebApp?.colorScheme === 'dark'
    html.classList.add(isDark ? 'theme-dark' : 'theme-light')
  } else {
    html.classList.add(`theme-${newTheme}`)
  }
}

const updateAccent = (color) => {
  accentColor.value = color
  localStorage.setItem('vesper_accent', color)
  
  const html = document.documentElement
  html.classList.remove('accent-blue', 'accent-purple', 'accent-pink', 'accent-orange', 'accent-green')
  html.classList.add(`accent-${color}`)
}


const sendFeedback = async () => {
    if (!feedbackData.value.content) return;
    
    isSubmittingFeedback.value = true;
    try {
        const response = await fetch('/vesper/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                type: feedbackData.value.type,
                content: feedbackData.value.content
            })
        });
        const result = await response.json();
        if (result.success) {
            alert(t('settings.feedbackSuccess'));
            isFeedbackOpen.value = false;
            feedbackData.value = { type: 'suggestion', content: '' };
        } else {
            alert(result.message);
        }
    } catch (e) {
        console.error("Feedback error:", e);
        alert(t('settings.feedbackError'));
    } finally {
        isSubmittingFeedback.value = false;
    }
}

const settings = ref([
  { id: 'social', title: t('settings.socialLinks'), icon: '🔗', desc: t('settings.socialLinksDesc'), action: () => emit('nav', 'profile') },
  { id: 'notifications', title: t('settings.notifications'), icon: '🔔', desc: t('settings.notifDesc'), toggle: true, value: true, aria: t('settings.notifications') },
  { id: 'private', title: t('settings.privateMode'), icon: '🔒', desc: t('settings.privateDesc'), toggle: true, value: false, aria: t('settings.privateMode') },
  { id: 'feedback', title: t('settings.feedback'), icon: '💬', desc: t('settings.feedbackDesc'), action: () => isFeedbackOpen.value = true },
  { id: 'payments', title: t('settings.payments'), icon: '💳', desc: t('settings.paymentsDesc'), toggle: false, aria: t('settings.payments') },
  { id: 'contact', title: t('settings.contactAdmin'), icon: '🎧', desc: t('settings.contactDesc'), toggle: false, action: () => emit('nav', 'help'), aria: t('settings.contactAdmin') },
])

const tg = window.Telegram?.WebApp

onMounted(() => {
    fetchProfile()
})

const fetchProfile = async () => {
    try {
        const response = await fetch('/vesper/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg?.initData,
                action: 'get'
            })
        });
        const result = await response.json();
        if (result.success) {
            // Sync toggles
            const privateItem = settings.value.find(s => s.id === 'private');
            if (privateItem) privateItem.value = result.data.is_private === 1;
        }
    } catch (e) {
        console.error("Fetch Settings Error:", e);
    }
}

const toggleSetting = async (item) => {
    if (!item.toggle) return;
    
    // Optimistic UI update
    item.value = !item.value;
    
    if (item.id === 'private') {
        try {
            await fetch('/vesper/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    initData: tg?.initData,
                    action: 'update',
                    profile_data: { is_private: item.value ? 1 : 0 }
                })
            });
        } catch (e) {
            console.error("Update Setting Error:", e);
            // Revert on error
            item.value = !item.value;
        }
    }
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500 pb-10" role="main">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">{{ $t('settings.title') }}</h2>
      <p class="text-tg-hint text-xs">{{ $t('settings.subtitle') }}</p>
    </div>

    <!-- User Account Quick Card -->
    <div class="glass p-4 rounded-3xl flex items-center gap-4 border border-white/10" role="region" :aria-label="$t('settings.accountInfo')">
      <div class="w-12 h-12 rounded-full bg-tg-button/20 flex items-center justify-center text-xl" aria-hidden="true">
        👤
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-bold">Admin Vesper</h3>
        <p class="text-[10px] text-tg-hint">{{ $t('settings.verifiedSince') }} 2024</p>
      </div>
      <button @click="emit('nav', 'profile')" class="text-tg-button text-xs font-bold" :aria-label="$t('settings.editSocial')">{{ $t('settings.editSocial') }}</button>
    </div>

    <!-- Accessibility & Appearance -->
    <div class="space-y-4">
      <div class="glass p-4 rounded-3xl border border-white/5 transition-all">
        <button 
          @click="isAppearanceExpanded = !isAppearanceExpanded"
          class="w-full flex items-center justify-between group"
          :aria-expanded="isAppearanceExpanded"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-tg-button/10 flex items-center justify-center text-lg">
              🎨
            </div>
            <div class="text-left">
              <h4 class="text-sm font-bold">{{ $t('settings.accessibility') }}</h4>
              <p class="text-[10px] text-tg-hint">{{ $t('settings.fontSettingsDesc') || 'Atur ukuran dan jenis tulisan' }}</p>
            </div>
          </div>
          <span 
            class="text-tg-hint text-xs transition-transform duration-300"
            :class="{ 'rotate-180': isAppearanceExpanded }"
          >
            ▼
          </span>
        </button>

        <div v-show="isAppearanceExpanded" class="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
          <!-- Font Size -->
          <div class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-[10px] font-black text-tg-hint uppercase tracking-widest">{{ $t('settings.fontSize') }}</h3>
            </div>
            <div class="bg-black/20 p-1 rounded-2xl flex gap-1 border border-white/5" role="radiogroup" :aria-label="$t('settings.fontSize')">
              <button 
                v-for="size in ['small', 'medium', 'large']" 
                :key="size"
                @click="updateFontSize(size)"
                :class="fontSize === size ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint hover:bg-white/5'"
                :aria-checked="fontSize === size"
                role="radio"
                class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- Font Family -->
          <div class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-[10px] font-black text-tg-hint uppercase tracking-widest">{{ $t('settings.fontFamily') }}</h3>
            </div>
            <div class="bg-black/20 p-1 rounded-2xl flex flex-wrap gap-1 border border-white/5" role="radiogroup" aria-label="Jenis Font">
              <button 
                v-for="family in ['inter', 'roboto', 'outfit', 'montserrat']" 
                :key="family"
                @click="updateFontFamily(family)"
                :class="fontFamily === family ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint hover:bg-white/5'"
                :aria-checked="fontFamily === family"
                role="radio"
                class="flex-[1_1_45%] py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                :style="{ fontFamily: family === 'inter' ? 'Inter' : family === 'roboto' ? 'Roboto' : family === 'outfit' ? 'Outfit' : 'Montserrat' }"
              >
                {{ family }}
              </button>
            </div>
          </div>

          <!-- Theme Selector -->
          <div class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-[10px] font-black text-tg-hint uppercase tracking-widest">{{ $t('settings.theme') }}</h3>
            </div>
            <div class="bg-black/20 p-1 rounded-2xl flex gap-1 border border-white/5" role="radiogroup">
              <button 
                v-for="mode in ['auto', 'light', 'dark']" 
                :key="mode"
                @click="updateTheme(mode)"
                :class="theme === mode ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint hover:bg-white/5'"
                class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                {{ $t(`settings.themeModes.${mode}`) }}
              </button>
            </div>
          </div>

          <!-- Accent Color -->
          <div class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-[10px] font-black text-tg-hint uppercase tracking-widest">{{ $t('settings.accentColor') }}</h3>
            </div>
            <div class="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
              <button 
                v-for="color in ['blue', 'purple', 'pink', 'orange', 'green']" 
                :key="color"
                @click="updateAccent(color)"
                class="w-8 h-8 rounded-full border-2 transition-all relative"
                :class="[
                  `bg-accent-${color}`,
                  accentColor === color ? 'border-white scale-125 z-10 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'
                ]"
                :style="{ 
                  backgroundColor: color === 'blue' ? '#24a1de' : color === 'purple' ? '#8b5cf6' : color === 'pink' ? '#ec4899' : color === 'orange' ? '#f97316' : '#22c55e'
                }"
              >
                <span v-if="accentColor === color" class="absolute inset-0 flex items-center justify-center text-[10px] text-white">✓</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <h3 class="text-[10px] font-black text-tg-hint uppercase tracking-widest">{{ $t('settings.language') }}</h3>
        </div>
        <div class="glass p-1.5 rounded-2xl flex gap-1 border border-white/5" role="radiogroup" :aria-label="$t('settings.language')">
          <button 
            @click="updateLocale('id')"
            :class="locale === 'id' ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint hover:bg-white/5'"
            :aria-checked="locale === 'id'"
            role="radio"
            class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
          >
            Bahasa Indonesia
          </button>
          <button 
            @click="updateLocale('en')"
            :class="locale === 'en' ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint hover:bg-white/5'"
            :aria-checked="locale === 'en'"
            role="radio"
            class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
          >
            English
          </button>
        </div>
      </div>
    </div>

    <!-- Settings List -->
    <div class="space-y-2" role="list">
      <div 
        v-for="(item, index) in settings" 
        :key="index" 
        @click="item.toggle ? toggleSetting(item) : (item.action ? item.action() : null)"
        :aria-label="item.aria"
        role="listitem"
        class="glass p-4 rounded-2xl flex items-center gap-4 border border-white/5 active:bg-white/5 transition-all cursor-pointer"
      >
        <div class="w-10 h-10 rounded-xl bg-tg-secondary flex items-center justify-center text-lg" aria-hidden="true">
          {{ item.icon }}
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-bold">{{ item.title }}</h4>
          <p class="text-[10px] text-tg-hint">{{ item.desc }}</p>
        </div>
        <div v-if="item.toggle" role="switch" :aria-checked="item.value">
           <div :class="item.value ? 'bg-tg-button' : 'bg-tg-hint/30'" class="w-10 h-5 rounded-full relative transition-colors p-1">
              <div :class="item.value ? 'translate-x-5' : 'translate-x-0'" class="w-3 h-3 bg-white rounded-full transition-transform"></div>
           </div>
        </div>
        <span v-else class="text-tg-hint text-xs" aria-hidden="true">❯</span>
      </div>
    </div>

    <div class="pt-4 space-y-4 text-center">
       <button 
         @click="window.Telegram?.WebApp?.close()"
         class="text-red-500 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
         :aria-label="$t('settings.closeApp')"
       >
         {{ $t('settings.closeApp') }}
       </button>
    </div>

    <!-- Feedback Modal -->
    <Teleport to="body">
      <div v-if="isFeedbackOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div @click="isFeedbackOpen = false" class="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
        
        <div class="glass w-full max-w-sm rounded-[2.5rem] border border-white/10 p-6 relative animate-in zoom-in duration-300 shadow-2xl">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-black">{{ $t('settings.feedback') }}</h3>
            <button @click="isFeedbackOpen = false" class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-tg-hint">✕</button>
          </div>

          <div class="space-y-4">
            <!-- Type Selector -->
            <div class="space-y-2">
              <label class="text-[10px] font-black text-tg-hint uppercase tracking-widest">{{ $t('settings.feedbackType') }}</label>
              <div class="bg-black/20 p-1 rounded-2xl flex gap-1 border border-white/5">
                <button 
                  v-for="type in ['bug', 'suggestion', 'other']" 
                  :key="type"
                  @click="feedbackData.type = type"
                  :class="feedbackData.type === type ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint hover:bg-white/5'"
                  class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  {{ $t(`settings.types.${type}`) }}
                </button>
              </div>
            </div>

            <!-- Content Area -->
            <div class="space-y-2">
              <label class="text-[10px] font-black text-tg-hint uppercase tracking-widest">{{ $t('settings.feedbackContent') }}</label>
              <textarea 
                v-model="feedbackData.content"
                class="w-full h-32 bg-black/20 border border-white/5 rounded-2xl p-4 text-xs resize-none focus:outline-none focus:border-tg-button/50 transition-colors"
                :placeholder="$t('settings.feedbackDesc')"
              ></textarea>
            </div>


            <!-- Submit Button -->
            <button 
              @click="sendFeedback"
              :disabled="!feedbackData.content || isSubmittingFeedback"
              class="w-full py-4 rounded-2xl bg-tg-button text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-tg-button/30 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span v-if="isSubmittingFeedback" class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              {{ isSubmittingFeedback ? 'Sending...' : $t('settings.submitFeedback') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
