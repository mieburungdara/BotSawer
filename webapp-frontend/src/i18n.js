import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    explore: {
      title: 'Explore',
      subtitle: 'Discover talented creators',
      trending: 'Trending',
      searchPlaceholder: 'Search name or username...',
      lastSearch: 'Recent Searches',
      clearAll: 'Clear All',
      noResults: 'No results found',
    },
    profile: {
      title: 'My Profile',
      followers: 'Followers',
      following: 'Following',
      contents: 'Contents',
      donations: 'Donations',
      editProfile: 'Edit Profile',
      saveChanges: 'Save Changes',
      updated: 'Profile updated!',
      recentMedia: 'Recent Media',
      noContent: 'No content yet.',
      followingList: 'Following List',
      followersList: 'Followers List',
      follow: 'Follow',
      unfollow: 'Unfollow',
      noFollowers: 'No followers yet.',
      noFollowing: 'Not following anyone yet.',
      message: 'Message',
      shareProfile: 'Share Profile',
      linkCopied: 'Link copied to clipboard!',
      badges: {
        title: 'Achievements',
        verified: 'Verified',
        top_creator: 'Top Creator',
        streak_master: 'Streak Master',
        rising_star: 'Rising Star',
        superstar: 'Superstar',
        active_creator: 'Active Creator'
      }
    },
    settings: {
      title: 'Settings',
      subtitle: 'Set your app preferences',
      accountInfo: 'Account Info',
      verifiedSince: 'Verified since',
      change: 'Change',
      accessibility: 'Accessibility',
      fontSize: 'Font Size',
      language: 'Language',
      notifications: 'Notifications',
      notifDesc: 'Manage donation alerts',
      privateMode: 'Private Mode',
      privateDesc: 'Hide profile from Explore',
      payments: 'Payment Methods',
      paymentsDesc: 'Manage bank & e-wallets',
      contactAdmin: 'Contact Admin',
      contactDesc: 'Help & Questions',
      closeApp: 'Close Vesper'
    }
  },
  id: {
    explore: {
      title: 'Explore',
      subtitle: 'Temukan kreator berbakat',
      trending: 'Trending',
      searchPlaceholder: 'Cari nama atau username...',
      lastSearch: 'Pencarian Terakhir',
      clearAll: 'Hapus Semua',
      noResults: 'Hasil tidak ditemukan',
      categories: {
        Content: 'Konten',
        User: 'Pengguna',
        Post: 'Postingan',
        Menfess: 'Menfess'
      }
    },
    profile: {
      title: 'Profil Saya',
      followers: 'Pengikut',
      following: 'Diikuti',
      contents: 'Konten',
      donations: 'Donasi',
      editProfile: 'Sunting Profil',
      saveChanges: 'Simpan Perubahan',
      updated: 'Profil diperbarui!',
      recentMedia: 'Media Terbaru',
      noContent: 'Belum ada konten.',
      followingList: 'Daftar Diikuti',
      followersList: 'Daftar Pengikut',
      follow: 'Ikuti',
      unfollow: 'Berhenti Ikuti',
      noFollowers: 'Belum ada pengikut.',
      noFollowing: 'Belum mengikuti siapapun.',
      message: 'Pesan',
      shareProfile: 'Bagikan Profil',
      linkCopied: 'Tautan disalin ke papan klip!',
      badges: {
        title: 'Pencapaian',
        verified: 'Terverifikasi',
        top_creator: 'Top Creator',
        streak_master: 'Streak Master',
        rising_star: 'Rising Star',
        superstar: 'Superstar',
        active_creator: 'Kreator Aktif'
      }
    },
    settings: {
      title: 'Settings',
      subtitle: 'Atur preferensi aplikasi Anda',
      accountInfo: 'Informasi Akun',
      verifiedSince: 'Terverifikasi sejak',
      change: 'Ubah',
      accessibility: 'Aksesibilitas',
      fontSize: 'Ukuran Font',
      language: 'Bahasa',
      notifications: 'Notifikasi',
      notifDesc: 'Kelola pemberitahuan donasi',
      privateMode: 'Mode Privat',
      privateDesc: 'Sembunyikan profil dari Explore',
      payments: 'Metode Pembayaran',
      paymentsDesc: 'Kelola rekening bank & e-wallet',
      contactAdmin: 'Hubungi Admin',
      contactDesc: 'Bantuan & Pertanyaan',
      closeApp: 'Tutup Vesper',
      message: 'Pesan'
    }
  }
}

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('vesper_locale') || 'id',
  fallbackLocale: 'en',
  messages
})

export default i18n
