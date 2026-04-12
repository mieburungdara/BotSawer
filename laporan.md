# Analisis Lengkap Alur Bot Sawer

## Ringkasan Sistem

Bot Sawer adalah platform donasi berbasis Telegram yang memungkinkan kreator konten menerima donasi (sawer) dari pengguna melalui bot. Sistem menggunakan arsitektur PHP 8.5 dengan MySQL InnoDB, dan dirancang untuk memastikan semua interaksi konten terjadi melalui bot Telegram, bukan langsung di channel publik.

## Arsitektur Sistem

### Komponen Utama
- **Bot Telegram**: Interface utama untuk interaksi pengguna
- **Webhook Handler**: Menerima update dari Telegram API
- **Database MySQL InnoDB**: Penyimpanan data dengan transaksi ACID
- **Scheduler/Cron Job**: Posting otomatis ke channel publik
- **Admin Panel**: Manajemen manual untuk konfirmasi topup dan penarikan
- **WebApp Dashboard**: Interface web untuk admin

### Struktur Database
Database menggunakan 12 tabel utama dengan desain yang dioptimalkan untuk menghindari redundansi data:

- `users`: Data semua pengguna Telegram
- `creators`: Profil kreator terverifikasi
- `media_files`: Metadata media yang diunggah
- `wallets`: Saldo dan riwayat keuangan pengguna
- `transactions`: Semua transaksi sistem
- `payment_proofs`: Bukti pembayaran untuk topup
- `withdrawals`: Pengajuan penarikan dana kreator
- `bots`: Multi-bot support untuk anti rate limit
- `admins`: Manajemen admin dengan role-based access
- `bot_configs`: Konfigurasi bot yang dapat dikustomisasi
- `settings`: Pengaturan global sistem
- `audit_logs`: Trail audit untuk semua aktivitas

## Alur Kerja Utama

### 1. Pengunggahan Media oleh Kreator

**Proses:**
- Kreator mengirim foto/video langsung ke bot
- Bot menerima dan menyimpan file_id Telegram
- Media secara otomatis diteruskan ke channel backup (private) untuk arsip
- Bot membalas konfirmasi dengan nomor antrian
- Data media disimpan di database dengan status 'queued'

**Tujuan Desain:**
- Semua media tersimpan dengan aman di channel backup
- Tidak ada media yang hilang karena disimpan langsung oleh Telegram

### 2. Posting ke Channel Publik

**Mekanisme:**
- Cron job berjalan setiap menit untuk mengecek antrian
- Bot mengambil media dari antrian berdasarkan urutan
- Bot memposting HANYA caption teks ke channel publik
- Caption berisi deskripsi konten + tombol deeplink unik

**Aturan Posting:**
- Jeda 1 menit antar posting untuk menghindari spam
- Hanya 1 posting per menit
- Tidak pernah memposting media asli ke channel publik

**Formula Deeplink:**
- Single Media: `https://t.me/NamaBot?start=media_XXXX`
- Album: `https://t.me/NamaBot?start=album_YYYY`

**Album Grouping:** Media dalam album dipost sebagai satu unit dengan satu deeplink album. Bot mengirim seluruh album kepada pengguna saat diakses.

### 3. Akses Media oleh Pengguna

**Proses:**
- Pengguna melihat postingan teks di channel publik
- Klik tombol deeplink yang mengarah ke bot
- Bot menerima parameter `?start=media_XXXX`
- Bot mengambil data media dari database
- Bot mengirimkan media ASLI kepada pengguna secara private

**Keamanan:**
- Media tidak pernah tersebar di channel publik
- Semua akses konten wajib melalui bot
- 100% traffic masuk ke bot untuk monetisasi

### 4. Sistem Donasi (Sawer)

**Pengecekan Saldo:**
- Bot cek saldo pengguna terlebih dahulu
- Jika saldo = 0: tampilkan pesan untuk topup
- Jika saldo > 0: tampilkan inline keyboard dengan pilihan nominal

**Pilihan Nominal Default:**
- 100, 500, 1K, 2K, 5K, 10K, 25K, 50K, 100K

**Filter Nominal Dinamis:**
- Sistem hanya menampilkan nominal yang sesuai dengan saldo
- Jika saldo tidak cukup untuk nominal terendah, tampilkan pesan topup

**Transaksi Otomatis:**
- Pengguna pilih nominal
- Bot potong saldo donatur secara otomatis
- Saldo langsung bertambah ke wallet kreator
- Sistem kirim notifikasi ke kedua pihak
- Semua dicatat dalam tabel transactions

**Yang Perlu Konfirmasi Manual Admin:**
- Topup saldo pengguna (bukti transfer)
- Penarikan saldo kreator

### 5. Sistem Topup Saldo

**Proses Topup:**
- Pengguna kirim perintah /topup
- Bot kirim QR code dompet digital admin
- Tampilkan nomor rekening dan panduan transfer
- Pengguna transfer dan kirim bukti ke bot
- Bot forward bukti ke admin dengan tombol konfirmasi

**Konfirmasi Admin:**
- Admin klik tombol di Telegram Mini App
- Form terisi otomatis dengan user ID pengguna
- Admin input nominal yang diterima
- Klik simpan → saldo pengguna langsung bertambah
- Tidak ada status pending, langsung aktif

### 6. Sistem Penarikan Kreator

**Proses Penarikan:**
- Kreator ajukan penarikan via WebApp
- Sistem hitung komisi platform (default 10%)
- Admin konfirmasi manual melalui WebApp
- Dana ditransfer ke rekening kreator
- Status berubah menjadi completed

## Mekanisme Keamanan dan Optimisasi

### Rate Limiting
- Pembatasan request per endpoint per IP
- Konfigurasi melalui tabel settings
- Pencegahan spam dan abuse

### Audit Trail
- Semua aktivitas tercatat di audit_logs
- Tracking perubahan data sensitif
- IP address dan user agent dicatat

### Multi-Bot Support
- Dukungan multiple bot untuk menghindari rate limit Telegram
- Load balancing otomatis
- Konfigurasi per bot di tabel bot_configs

### Transaksi Database
- Semua menggunakan InnoDB dengan ACID properties
- Foreign key constraints untuk data integrity
- Rollback otomatis jika terjadi error

## Alur Data dan Integrasi

### Flow Data Utama
```
Kreator → Bot → Database → Channel Backup
                     ↓
               Cron Job → Channel Publik (Caption Only)
                     ↓
               Deeplink → Bot → Media Asli + Tombol Sawer
                     ↓
               Transaksi Otomatis → Wallet Update → Notifikasi
```

### Webhook Integration
- Endpoint tunggal untuk semua bot
- Routing berdasarkan webhook secret
- Rate limiting per IP address

### Scheduler System
- Cron job setiap menit: `* * * * * php schedule.php`
- Antrian FIFO dengan jeda 1 menit
- Status tracking: queued → scheduled → posted

## Karakteristik Sistem

### Monetisasi Maksimal
- Semua konten wajib melalui bot
- Tidak ada bypass channel publik
- Setiap akses berpotensi donasi

### Otomatisasi Transaksi
- Sawer 100% otomatis tanpa konfirmasi
- Hanya topup dan penarikan yang manual
- Mengurangi beban admin

### Skalabilitas
- Multi-bot untuk handle traffic tinggi
- Database indexing untuk query cepat
- Queue system untuk posting terjadwal

### Privasi dan Anonimitas
- Donasi anonim antara pengguna
- Tidak ada data pribadi yang tersebar
- Sistem audit untuk tracking internal

## Kesimpulan

Bot Sawer dirancang sebagai platform donasi yang efisien dan aman dengan fokus pada:
1. **Maksimal Monetisasi**: Semua traffic wajib melalui bot
2. **Otomatisasi**: Transaksi sawer tanpa intervensi manual
3. **Keamanan**: Media tidak tersebar, audit trail lengkap
4. **Skalabilitas**: Multi-bot dan queue system
5. **User Experience**: Interface sederhana via Telegram

Sistem ini berhasil menggabungkan kemudahan penggunaan Telegram dengan mekanisme donasi yang transparan dan dapat dilacak.</content>
<parameter name="filePath">laporan.md