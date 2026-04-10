# 🚀 BotSawer Deployment Guide

Panduan lengkap untuk deploy BotSawer ke production environment dengan fokus pada **Shared Hosting**.

## 📋 Prerequisites

### Shared Hosting Requirements
- ✅ **PHP**: 8.1+ (cek via `phpinfo()`)
- ✅ **Database**: MySQL 5.7+ atau MariaDB 10.0+
- ✅ **Storage**: 500MB+ untuk aplikasi + 200MB+ untuk database
- ✅ **Web Server**: Apache/Nginx (pre-configured)
- ✅ **Access**: cPanel, Plesk, atau DirectAdmin
- ✅ **SSL**: Auto-SSL dari hosting provider (biasanya gratis)
- ⚠️ **Cron**: Mungkin terbatas atau tidak tersedia
- ⚠️ **SSH**: Mungkin tidak tersedia

### VPS/Dedicated Server Requirements (Advanced)
- ✅ **OS**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- ✅ **Web Server**: Apache 2.4+ atau Nginx 1.18+
- ✅ **PHP**: 8.5+ dengan ekstensi lengkap
- ✅ **Database**: MySQL 8.0+ atau MariaDB 10.5+
- ✅ **Root Access**: Required untuk konfigurasi server

## 🏗️ **DEPLOYMENT UNTUK SHARED HOSTING**

### Step 1: Persiapan Awal

1. **Cek PHP Version & Extensions**
   - Akses `phpinfo.php` di browser atau cPanel → PHP Config
   - Pastikan PHP 8.1+ dengan ekstensi: `pdo_mysql`, `mbstring`, `curl`, `json`, `bcmath`

2. **Buat Database**
   - Login ke cPanel → MySQL Databases
   - Create database: `botsawer_db`
   - Create user: `botsawer_user`
   - Set permissions: Full access ke database

3. **Siapkan Domain/Subdomain**
   - Point domain ke hosting account
   - Enable SSL (biasanya auto dari hosting provider)

### Step 2: Upload Files

#### Via cPanel File Manager
1. Login cPanel → File Manager
2. Navigate ke `public_html/` atau folder website
3. Upload semua files dari repository (gunakan zip jika banyak)
4. Extract files di folder utama

#### Via FTP/SFTP
```bash
# Connect via FTP client (FileZilla, WinSCP, etc.)
# Upload semua files ke public_html/ atau www/
# Pastikan folder structure terjaga
```

### Step 3: Install Dependencies

#### Via SSH (jika tersedia)
```bash
cd public_html
curl -sS https://getcomposer.org/installer | php
php composer.phar install --no-dev --optimize-autoloader
```

#### Via Manual Upload (jika tidak ada SSH)
1. Download `composer.phar` dari https://getcomposer.org/
2. Upload ke server via FTP
3. Jalankan via browser atau cron job
4. Upload hasil `vendor/` folder

### Step 4: Konfigurasi Environment

1. **Copy .env file**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env untuk shared hosting**
   ```env
   APP_NAME=BotSawer
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://yourdomain.com

   # Database (dari cPanel)
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=botsawer_db
   DB_USERNAME=botsawer_user
   DB_PASSWORD=your_db_password

   # Telegram Bot
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_WEBHOOK_SECRET=webhook_secret_1

   # Admin
   ADMIN_TELEGRAM_ID=123456789

   # Logging (shared hosting friendly)
   LOG_CHANNEL=daily
   LOG_LEVEL=warning
   ```

3. **Import Database Schema**
   - Akses phpMyAdmin via cPanel
   - Import file `migrations/schema.sql`
   - Verifikasi semua tabel terbuat

### Step 5: Konfigurasi Web Server

#### Untuk Shared Hosting (biasanya auto)
- Pastikan `public/` folder sebagai document root
- Enable mod_rewrite untuk Apache
- Pastikan .htaccess terbaca

#### Jika perlu custom .htaccess
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

### Step 6: Setup Cron Jobs (Alternatif untuk Shared Hosting)

#### Via cPanel Cron Jobs
1. Login cPanel → Cron Jobs
2. Add new cron job:
   ```
   Command: wget -q -O /dev/null https://yourdomain.com/cron.php
   Schedule: Every 1 minute (* * * * *)
   ```

#### Via External Cron Service
Jika hosting tidak support cron, gunakan:
- **Cron-job.org** (gratis)
- **EasyCron** (berbayar)
- **GitHub Actions** untuk scheduling

#### Buat cron.php file
```php
<?php
// cron.php - Alternative cron runner for shared hosting
require_once __DIR__ . '/vendor/autoload.php';
BotSawer\Database::init();

// Run scheduler
exec('php ' . __DIR__ . '/schedule.php');
echo "Cron executed at " . date('Y-m-d H:i:s');
```

### Step 7: Bot Configuration

#### Set Webhook via Browser (shared hosting friendly)
Buat file `set_webhook.php`:

```php
<?php
// set_webhook.php - Set Telegram webhook
$botToken = 'YOUR_BOT_TOKEN';
$webhookUrl = 'https://yourdomain.com/public/webhook.php?secret=webhook_secret_1';

$url = "https://api.telegram.org/bot{$botToken}/setWebhook?url=" . urlencode($webhookUrl);

$response = file_get_contents($url);
echo $response;
```

Akses `https://yourdomain.com/set_webhook.php` via browser untuk set webhook.

### Step 8: Testing & Verification

#### Test Files
1. **Health Check**: `https://yourdomain.com/public/health.php`
2. **Database Test**: Buat `test_db.php`:
   ```php
   <?php
   require 'vendor/autoload.php';
   BotSawer\Database::init();
   echo "Database connected successfully";
   ```

3. **Bot Test**: Kirim `/start` ke bot via Telegram

#### Manual Testing Checklist
- [ ] Website accessible via HTTPS
- [ ] Database connection works
- [ ] Bot responds to commands
- [ ] Web app loads (Mini App)
- [ ] Admin panel accessible
- [ ] Logs ter-generate

## 🏗️ **DEPLOYMENT UNTUK VPS/DEDICATED SERVER** (Advanced)

### Quick VPS Setup
```bash
# Ubuntu/Debian VPS
sudo apt update && sudo apt upgrade -y
sudo apt install -y apache2 mysql-server php8.1 php8.1-mysql php8.1-mbstring php8.1-curl php8.1-xml php8.1-bcmath curl unzip

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Clone and setup
cd /var/www
sudo git clone https://github.com/mieburungdara/BotSawer.git
sudo chown -R www-data:www-data BotSawer
cd BotSawer

# Install dependencies
sudo -u www-data composer install --no-dev --optimize-autoloader

# Database setup
sudo mysql -e "CREATE DATABASE botsawer CHARACTER SET utf8mb4;"
sudo mysql -e "CREATE USER 'botsawer'@'localhost' IDENTIFIED BY 'secure_password';"
sudo mysql -e "GRANT ALL ON botsawer.* TO 'botsawer'@'localhost';"
mysql -u botsawer -p botsawer < migrations/schema.sql

# Web server config
sudo nano /etc/apache2/sites-available/botsawer.conf
# ... (Apache config as before)

# SSL Setup
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d yourdomain.com

# Cron setup
echo "* * * * * cd /var/www/BotSawer && php schedule.php" | sudo crontab -
```

## 🔧 **Konfigurasi Environment**

### Shared Hosting .env
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_HOST=localhost
DB_DATABASE=botsawer_db
DB_USERNAME=botsawer_user
DB_PASSWORD=your_db_password

TELEGRAM_BOT_TOKEN=your_token
ADMIN_TELEGRAM_ID=123456789

LOG_CHANNEL=daily
LOG_LEVEL=warning
```

### VPS .env
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_HOST=localhost
DB_DATABASE=botsawer
DB_USERNAME=botsawer
DB_PASSWORD=secure_password

TELEGRAM_BOT_TOKEN=your_token
ADMIN_TELEGRAM_ID=123456789

LOG_CHANNEL=stack
LOG_LEVEL=error
```

## 🧪 **Testing Deployment**

### Automated Tests
```bash
# Run basic tests
php test.php

# Test health endpoint
curl https://yourdomain.com/public/health.php
```

### Manual Tests
1. **Web Access**: `https://yourdomain.com/public/health.php`
2. **Bot Response**: Kirim `/start` ke bot
3. **Database**: Cek via phpMyAdmin
4. **Logs**: Cek `logs/app.log`
5. **Web App**: `https://yourdomain.com/public/webapp/`

## 📊 **Monitoring & Maintenance**

### Shared Hosting Monitoring
- **Uptime**: Gunakan external monitoring (UptimeRobot gratis)
- **Logs**: Cek via cPanel error logs
- **Database**: Monitor via phpMyAdmin
- **Bot Status**: Test manual commands

### VPS Monitoring
- **Server Monitoring**: `htop`, `df -h`, `free -h`
- **Application Logs**: `tail -f logs/app.log`
- **Database**: `mysqladmin processlist`
- **Web Server**: Apache/Nginx status

## 🚨 **Troubleshooting Shared Hosting**

### Common Issues & Solutions

#### 1. **PHP Version Too Low**
```
Solution: Upgrade PHP via cPanel → PHP Config
Alternative: Contact hosting support
```

#### 2. **Memory Limit Error**
```
Solution: Edit .htaccess or php.ini via cPanel
Add: php_value memory_limit 256M
```

#### 3. 
