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

5. **Setup bot webhook**
   ```bash
   # Set webhook URL ke: https://yourdomain.com/public/webhook.php?secret=your_secret
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

---

**BotSawer** - Monetize your creativity, connect with fans, earn from content! 🎨💰
