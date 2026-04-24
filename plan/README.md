# 🤖 VesperApp - Telegram Content Monetization Bot

VesperApp adalah sistem monetisasi konten berbasis Telegram yang memungkinkan kreator konten untuk menerima donasi dari penggemar secara anonim dan otomatis.

## ✨ Fitur Utama

### 👤 Untuk Kreator
- ✅ Upload foto/video langsung via Telegram
- ✅ Sistem antrian posting otomatis  
- ✅ Terima donasi anonim dari penggemar
- ✅ Dashboard analytics dengan grafik
- ✅ Manajemen profil dan rekening bank
- ✅ Riwayat pendapatan lengkap

### 💰 Untuk Pengguna  
- ✅ Jelajahi konten kreator favorit
- ✅ Donasi dengan berbagai nominal
- ✅ Sistem topup saldo via QR code
- ✅ Riwayat transaksi lengkap
- ✅ Akses konten premium

### 🔧 Untuk Admin
- ✅ Panel admin lengkap via web
- ✅ Konfirmasi pembayaran manual
- ✅ Manajemen user dan kreator
- ✅ **Multi-admin support dengan role-based access**
- ✅ Audit logs semua aktivitas
- ✅ Multi-bot support
- ✅ System monitoring

## 🤖 Bot System Architecture

VesperApp menggunakan **Standalone Multi Bot System** untuk menghindari rate limit Telegram dan menangani beban pengguna secara masif.

### 🤖 **Arsitektur Multi Bot Anti Rate Limit**
- **Semua bot identik dan berdiri sendiri** (tidak ada perbedaan user/moderator bot)
- Setiap bot memiliki token dan rate limit API Telegram sendiri
- Semua bot berbagi database, channel, dan pengaturan sistem yang SAMA
- Pengguna bebas memilih bot mana yang ingin digunakan
- Setiap bot menangani permintaan penggunanya masing-masing

### ✅ Fitur Setiap Bot
- **Semua command tersedia di SEMUA bot**: `/start`, `/register`, `/saldo`, `/topup`, `/admin`
- **Admin access**: Semua bot dapat menerima command admin, diverifikasi via database
- **Role-based permissions**: Tetap berjalan normal di semua bot
- **Webhook**: Setiap bot memiliki endpoint webhook sendiri

### 🔐 **Security Concept**
- Semua bot memiliki tingkat keamanan yang sama
- Admin commands hanya dapat diakses oleh user yang terverifikasi sebagai admin di database
- Tidak ada pemisahan fungsi bot - keamanan berbasis role, bukan berbasis bot
- Semua request selalu divalidasi sebelum dieksekusi

## 🚀 Quick Start

## 📺 Channel Setup

### Channel Requirements
- **Public Channel**: Untuk posting konten ke publik (gunakan **channel ID** dimulai dengan `-100`)
- **Backup Channel**: Untuk arsip media dan informasi pembayaran (gunakan **channel ID** dimulai dengan `-100`)

### Cara Mendapatkan Channel ID
1. Tambahkan bot `@userinfobot` ke channel Anda
2. Bot akan memberikan ID channel (format: `-100xxxxxxxxxx`)

### Setup Bot Configuration
1. Login ke webapp admin (`/public/webapp/`)
2. Pergi ke **Bot Management**
3. Add bot dengan token dari @BotFather
4. Set bot sebagai active

### Setup Channel & Payment
1. Post informasi pembayaran lengkap ke backup channel
2. Dapatkan message ID dari postingan tersebut
3. Pergi ke **System Settings**
4. Configure channel IDs dan payment message ID

### Semua Konfigurasi Lainnya
- Platform commission, min amounts, dll dapat dikonfigurasi via System Settings
- Bot tokens, usernames, webhook secrets via Bot Management
- Admin management via Admin Management section
- Semua perubahan langsung aktif tanpa redeploy aplikasi

### Installation
1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/VesperApp.git
   cd VesperApp
   ```

2. **Install dependencies**
   ```bash
   composer install
   ```

3. **Setup database**
   ```bash
   mysql -u root -p < migrations/schema.sql
   ```

4. **Configure environment**
    ```bash
    cp .env.example .env
    # Edit .env hanya untuk database credentials (bot config via webapp)
    ```

5. **Setup bot webhooks**
   ```bash
   # Setup webhook untuk SETIAP bot yang Anda tambahkan
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
        -d "url=https://yourdomain.com/public/webhook.php?bot_id=<BOT_ID>"
   ```

   Catatan:
   - Ganti `<BOT_TOKEN>` dengan token bot dari @BotFather
   - Ganti `<BOT_ID>` dengan ID bot yang terdaftar di sistem
   - Lakukan ini untuk SETIAP bot yang Anda tambahkan

6. **Setup cron job**
   ```bash
   * * * * * cd /path/to/VesperApp && php schedule.php
   ```

## 📱 Access

- **Web App**: `https://yourdomain.com/public/webapp/`
- **API Docs**: `API_DOCUMENTATION.md`
- **Health Check**: `https://yourdomain.com/public/health.php`

## 📚 Documentation

See `INDEX.md` for complete documentation overview.

## 🚀 Deployment

See `DEPLOYMENT.md` for comprehensive production deployment guide.

---

**VesperApp** - Monetize your creativity, connect with fans, earn from content! 🎨💰

