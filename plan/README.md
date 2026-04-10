# 🤖 BotSawer - Telegram Content Monetization Bot

BotSawer adalah sistem monetisasi konten berbasis Telegram yang memungkinkan kreator konten untuk menerima donasi dari penggemar secara anonim dan otomatis.

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
- ✅ Audit logs semua aktivitas
- ✅ Multi-bot support
- ✅ System monitoring

## 🤖 Bot System Architecture

BotSawer menggunakan **dual bot system** untuk keamanan dan pemisahan fungsi:

### 🤖 **User Bot** (Bot Interaksi)
- **Function**: Interaksi dengan user biasa dan kreator
- **Webhook**: `https://domain.com/public/webhook.php?secret=user_secret`
- **Commands**: `/start`, `/register`, `/saldo`, `/topup`
- **Features**: Upload media, cek saldo, topup via QR
- **Access**: Semua user

### 👑 **Moderator Bot** (Bot Admin)
- **Function**: Mengelola content posting dan admin controls
- **Webhook**: `https://domain.com/public/moderator.php?secret=moderator_secret`
- **Commands**: `/mod_start`, `/mod_stats`, `/mod_queue`, `/mod_post`
- **Features**: Manual posting, queue management, statistics
- **Access**: Admin only (hanya menerima pesan dari admin ID)

### 🔐 **Security Concept**
- User bot: Tidak ada admin commands (redirect ke moderator bot)
- Moderator bot: Hanya menerima pesan dari admin ID terverifikasi
- Pemisahan fungsi untuk keamanan maksimal dan rate limit management

## 🚀 Quick Start

### Installation
1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/botsawer.git
   cd botsawer
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
   # Edit .env dengan database credentials dan bot token
   ```

5. **Setup bot webhooks**
   ```bash
   # User Bot Webhook
   curl -X POST "https://api.telegram.org/bot<USER_BOT_TOKEN>/setWebhook" \
        -d "url=https://yourdomain.com/public/webhook.php?secret=user_secret"

   # Moderator Bot Webhook (Admin Only)
   curl -X POST "https://api.telegram.org/bot<MODERATOR_BOT_TOKEN>/setWebhook" \
        -d "url=https://yourdomain.com/public/moderator.php?secret=moderator_$(date +%Y-%m-%d)"
   ```

6. **Setup cron job**
   ```bash
   * * * * * cd /path/to/botsawer && php schedule.php
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

**BotSawer** - Monetize your creativity, connect with fans, earn from content! 🎨💰
