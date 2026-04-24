# 📋 Rencana Pembangunan Bot Telegram Pembayaran Kreator

**Teknologi:** PHP 8.5 + MySQL InnoDB  
**Sistem Pembayaran:** MANUAL KONFIRMASI OLEH ADMIN  
**Fitur Utama:** Sistem pembayaran untuk kreator yang mengunggah foto/video

---

## ✅ Checklist Pengerjaan

```markdown
- [x] Analisa kebutuhan sistem dan arsitektur
- [x] Perancangan Database MySQL InnoDB
- [x] Setup struktur project dan dependensi
- [x] Implementasi koneksi database
- [x] Implementasi koneksi Bot Telegram API
- [x] Sistem upload media foto/video
- [x] Sistem wallet dan saldo pengguna
- [x] Sistem konfirmasi pembayaran manual admin
- [x] Panel admin dan laporan
- [x] Keamanan dan validasi (rate limiting)
- [x] WebApp dashboard lengkap (wallet, creator, admin)
- [x] Sistem penarikan via WebApp
- [x] QR code untuk topup
- [x] Admin user management (search, ban/unban)
- [x] Settings management
- [ ] Testing dan deployment
```

---

## 🎯 Fitur Sistem

### 👤 Untuk Kreator:
1. Daftar/Login via Telegram otomatis
2. Upload foto & video langsung ke bot
3. Konten untuk donasi sukarela
4. Melihat riwayat pendapatan
5. Penarikan saldo manual
6. Statistik unggahan dan penghasilan

### 💳 Untuk Pengguna Pembeli:
1. Melihat daftar konten kreator
2. Mendapatkan nomor rekening untuk transfer
3. Mengirim bukti pembayaran
4. Menunggu konfirmasi admin
5. Akses konten setelah pembayaran terkonfirmasi
6. Riwayat transaksi

### 🔧 Admin Panel:
1. Manajemen pengguna dan kreator
2. Pengaturan komisi platform
3. Monitoring transaksi pending
4. Konfirmasi/penolakan pembayaran manual
5. Laporan keuangan
6. Pengaturan bot

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Pengguna       │────▶│  Bot Telegram   │────▶│  PHP Backend    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                ┌─────────────────┐
                                                │  MySQL InnoDB   │
                                                └─────────────────┘
                                                          │
                                                          ▼
                                                ┌─────────────────┐
                                                │  Admin Manual   │
                                                │  Konfirmasi     │
                                                └─────────────────┘
```

---

## 🗃️ Rancangan Tabel Database

### Tabel Utama:
1. `users` - Data semua pengguna telegram
2. `creators` - Data kreator terverifikasi
3. `media_files` - Data foto/video yang diunggah
4. `wallets` - Saldo setiap pengguna
5. `transactions` - Semua transaksi pembayaran
6. `payment_proofs` - Bukti transfer pembayaran
7. `withdrawals` - Pengajuan penarikan dana
8. `purchases` - Riwayat pembelian konten
9. `settings` - Pengaturan sistem bot

> Semua tabel menggunakan Engine InnoDB dengan Foreign Key dan Transaksi ACID

---

## 📂 Struktur Folder Project

```
VesperApp/
├── config/
│   ├── database.php
│   ├── telegram.php
│   └── payment.php
├── src/
│   ├── Bot.php
│   ├── Database.php
│   ├── MediaHandler.php
│   ├── PaymentManual.php
│   ├── Wallet.php
│   ├── Creator.php
│   └── Admin.php
├── public/
│   └── webhook.php
├── migrations/
│   └── schema.sql
├── logs/
├── vendor/
├── .env
└── README.md
```

---

## 🔐 Keamanan Sistem
1. Validasi semua input dari Telegram
2. Semua transaksi database menggunakan InnoDB Transaction
3. Enkripsi data sensitif
4. Rate limiting untuk mencegah spam
5. Log semua aktivitas sistem
6. Verifikasi webhook signature Telegram
7. Hanya admin yang bisa mengkonfirmasi pembayaran

---

## 💰 Alur Pembayaran MANUAL
1. Kreator mengunggah media ke bot
2. Konten tersedia untuk donasi sukarela
3. Pengguna melihat dan memilih untuk melakukan sawer
4. Sistem menampilkan pilihan nominal sawer
5. Pengguna memilih nominal dan konfirmasi otomatis
6. Saldo pengguna dipotong, saldo kreator bertambah otomatis
7. Sistem mengirim notifikasi anonim ke kedua pihak
8. Semua dicatat dalam transaksi tanpa konfirmasi admin

---

## 🚀 Langkah Implementasi Selanjutnya
1. Install dependensi dengan `composer install`
2. Import file schema database
3. Konfigurasi file .env
4. Implementasi class Bot Telegram
5. Buat sistem upload media
6. Implementasi wallet dan transaksi
7. Buat sistem bukti pembayaran dan konfirmasi admin
8. Testing end-to-end
