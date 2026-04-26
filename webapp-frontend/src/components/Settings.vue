<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['nav'])
const { t, locale } = useI18n()

const fontSize = ref(localStorage.getItem('vesper_font_size') || 'medium')
const fontFamily = ref(localStorage.getItem('vesper_font_family') || 'inter')
const currentLocale = ref(locale.value)
const isAppearanceExpanded = ref(false)

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

const settings = ref([
  { title: t('settings.socialLinks'), icon: '🔗', desc: t('settings.socialLinksDesc'), action: () => emit('nav', 'profile') },
  { title: t('settings.notifications'), icon: '🔔', desc: t('settings.notifDesc'), toggle: true, value: true, aria: t('settings.notifications') },
  { title: t('settings.privateMode'), icon: '🔒', desc: t('settings.privateDesc'), toggle: true, value: false, aria: t('settings.privateMode') },
  { title: t('settings.payments'), icon: '💳', desc: t('settings.paymentsDesc'), toggle: false, aria: t('settings.payments') },
  { title: t('settings.contactAdmin'), icon: '🎧', desc: t('settings.contactDesc'), toggle: false, action: () => emit('nav', 'help'), aria: t('settings.contactAdmin') },
])
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
        @click="item.toggle ? item.value = !item.value : (item.action ? item.action() : null)"
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

    <!-- Footer Links -->
    <div class="pt-4 space-y-4 text-center">
       <button 
         @click="window.Telegram?.WebApp?.close()"
         class="text-red-500 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
         :aria-label="$t('settings.closeApp')"
       >
         {{ $t('settings.closeApp') }}
       </button>
    </div>
  </div>
</template>
