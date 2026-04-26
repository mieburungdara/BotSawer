<script setup>
import { ref } from 'vue'

const activeCategory = ref('faq')

const helpData = {
  faq: [
    {
      q: 'Apa itu VesperApp?',
      a: 'VesperApp adalah platform donasi sukarela (sawer) untuk kreator konten. Anda bisa mendukung kreator favorit atau mulai mengumpulkan dukungan dari karya Anda sendiri.'
    },
    {
      q: 'Bagaimana cara mengisi saldo (Topup)?',
      a: 'Masuk ke menu Dompet, pilih Topup, atau hubungi Admin melalui menu Settings. Kirim bukti transfer Anda, dan Admin akan memverifikasi saldo Anda dalam waktu singkat.'
    },
    {
      q: 'Apakah donasi bersifat anonim?',
      a: 'Ya, donasi Anda bersifat anonim secara default. Kreator hanya akan menerima notifikasi nominal dan pesan dukungan Anda.'
    },
    {
      q: 'Bagaimana cara menjadi Kreator?',
      a: 'Cukup kirimkan foto atau video karya Anda langsung ke Bot Vesper. Konten akan tersimpan sebagai draft, dan Anda bisa melengkapinya di Dashboard ini.'
    },
    {
      q: 'Berapa biaya admin untuk pencairan dana?',
      a: 'Biaya admin standar adalah 10% dari total penarikan. Biaya ini digunakan untuk pemeliharaan server dan pengembangan platform.'
    }
  ],
  guide: [
    {
      title: 'Cara Unggah Konten',
      steps: [
        'Kirim foto atau video ke Bot @VesperAppBot',
        'Buka WebApp Dashboard',
        'Masuk ke menu My Profile',
        'Lengkapi caption pada media yang baru diunggah',
        'Klik konfirmasi untuk mempublikasikan'
      ]
    },
    {
      title: 'Cara Memberi Dukungan (Sawer)',
      steps: [
        'Klik link konten yang ada di channel publik',
        'Bot akan mengirimkan media asli secara privat',
        'Klik tombol nominal donasi di bawah media',
        'Pastikan saldo Anda mencukupi'
      ]
    }
  ],
  terms: {
    title: 'Syarat & Ketentuan',
    content: 'VesperApp melarang keras pengunggahan konten ilegal, pornografi anak, atau konten yang melanggar hak cipta. Setiap pelanggaran akan mengakibatkan pemblokiran akun permanen tanpa pengembalian saldo.'
  }
}

const categories = [
  { id: 'faq', label: 'FAQ', icon: '❓' },
  { id: 'guide', label: 'Panduan', icon: '📖' },
  { id: 'terms', label: 'Ketentuan', icon: '⚖️' }
]
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500 pb-20">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-black">Pusat Bantuan</h2>
      <p class="text-tg-hint text-xs">Temukan jawaban dan panduan penggunaan VesperApp</p>
    </div>

    <!-- Category Tabs -->
    <div class="flex p-1 bg-tg-secondary/50 rounded-2xl border border-white/5 shadow-inner">
      <button 
        v-for="cat in categories" 
        :key="cat.id"
        @click="activeCategory = cat.id"
        :class="activeCategory === cat.id ? 'bg-tg-button text-white shadow-lg' : 'text-tg-hint'"
        class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300"
      >
        <span>{{ cat.icon }}</span>
        {{ cat.label }}
      </button>
    </div>

    <!-- Content Area -->
    <div class="mt-4">
      <!-- FAQ Section -->
      <div v-if="activeCategory === 'faq'" class="space-y-3">
        <div 
          v-for="(item, i) in helpData.faq" 
          :key="i"
          class="glass p-5 rounded-[2rem] border border-white/5 space-y-2"
        >
          <h4 class="text-sm font-black text-tg-button uppercase tracking-tight">Q: {{ item.q }}</h4>
          <p class="text-xs text-tg-text leading-relaxed opacity-80">{{ item.a }}</p>
        </div>
      </div>

      <!-- Guide Section -->
      <div v-if="activeCategory === 'guide'" class="space-y-6">
        <div 
          v-for="(guide, i) in helpData.guide" 
          :key="i"
          class="glass p-6 rounded-[2.5rem] border border-white/5"
        >
          <h4 class="text-sm font-black mb-4 flex items-center gap-2">
            <span class="w-2 h-2 bg-tg-button rounded-full"></span>
            {{ guide.title }}
          </h4>
          <div class="space-y-4">
            <div v-for="(step, si) in guide.steps" :key="si" class="flex gap-4">
              <div class="w-6 h-6 rounded-lg bg-tg-button/10 flex items-center justify-center text-[10px] font-black text-tg-button shrink-0 border border-tg-button/20">
                {{ si + 1 }}
              </div>
              <p class="text-xs text-tg-hint font-medium">{{ step }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Terms Section -->
      <div v-if="activeCategory === 'terms'" class="glass p-8 rounded-[2.5rem] border border-white/5 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-3xl mx-auto border border-red-500/20">
          ⚖️
        </div>
        <h4 class="text-lg font-black uppercase tracking-tight">{{ helpData.terms.title }}</h4>
        <p class="text-xs text-tg-hint leading-loose italic">
          "{{ helpData.terms.content }}"
        </p>
        <div class="pt-4">
           <button @click="activeCategory = 'faq'" class="text-[10px] font-black text-tg-button uppercase tracking-widest hover:underline">
             Ada pertanyaan lain? Cek FAQ
           </button>
        </div>
      </div>
    </div>

    <!-- Contact Support Footer -->
    <div class="glass p-6 rounded-[2.5rem] bg-gradient-to-br from-tg-button/20 to-transparent border border-tg-button/10 flex items-center justify-between">
      <div>
        <h4 class="text-sm font-black">Masih butuh bantuan?</h4>
        <p class="text-[10px] text-tg-hint">Hubungi tim support kami</p>
      </div>
      <button class="bg-tg-button text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg shadow-tg-button/30 active:scale-95 transition-all">
        CHAT ADMIN
      </button>
    </div>
  </div>
</template>
