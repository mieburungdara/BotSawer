# 🚀 VesperApp Deployment Guide

Panduan lengkap untuk deploy VesperApp ke production environment dengan fokus pada **Shared Hosting**.

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
   - Create database: `VesperApp_db`
   - Create user: `VesperApp_user`
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
   APP_NAME=VesperApp
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://yourdomain.com

   # Database (dari cPanel)
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=VesperApp_db
   DB_USERNAME=VesperApp_user
   DB_PASSWORD=your_db_password

    # Bot configuration dilakukan via webapp setelah setup selesai

   # Logging (shared hosting friendly)
   LOG_CHANNEL=daily
   LOG_LEVEL=warning
   ```

3. **Import Database Schema**
   - Akses phpMyAdmin via cPanel
   - Import file `migrations/schema.sql`
   - Verifikasi semua tabel terbuat termasuk `admins`, `audit_logs`, `bot_configs`

### Step 5: Setup Admin Pertama

Setelah database ter-import, Anda perlu setup admin pertama:

1. **Via phpMyAdmin** (cPanel):
   ```sql
   -- Ganti 123456789 dengan Telegram ID Anda
   -- Ganti '@yourusername' dengan username Telegram Anda
   INSERT INTO admins (telegram_id, telegram_username, full_name, role, is_active)
   VALUES (123456789, '@yourusername', 'Super Admin', 'super_admin', 1);
   ```

2. **Verifikasi Admin**:
    - Pastikan record admin sudah ada di tabel `admins`
    - Admin dapat mengakses moderator bot setelah setup webhook

### Step 6: Setup Bot Configuration

1. **Akses Web App**:
   - Buka `https://yourdomain.com/public/webapp/`
   - Login dengan akun Telegram admin

2. **Add Bot Configuration**:
   - Pergi ke **Bot Management**
   - Click **"Add New Bot"**
   - Masukkan:
     - Bot Name: "Bot Sawer 1"
     - Username: "@your_bot_username" (dari @BotFather)
     - Token: bot token dari @BotFather
     - Webhook Secret: string acak aman
   - Set bot sebagai **Active**

3. **Setup Channel Configuration**:
   - Pergi ke **System Settings**
   - Configure:
     - `public_channel`: ID channel publik (-100xxxxxxxxxx)
     - `backup_channel`: ID channel backup (-100xxxxxxxxxx)
     - `payment_info_message_id`: Message ID dari backup channel

### Step 7: Setup Multiple Admins (Opsional)

Untuk menambah admin tambahan:

1. **Via Web App**: Login sebagai super admin → Admin Management → Add Admin
2. **Via Moderator Bot**: `/admin add [telegram_id] [role]`
3. **Via phpMyAdmin**: Insert langsung ke tabel `admins`

**Role Options**:
- `super_admin`: Full access, manage admins
- `moderator`: Content management only
- `finance`: Payment management only

### Step 8: Konfigurasi Web Server

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

### Step 9: Setup Cron Jobs (Alternatif untuk Shared Hosting)

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
VesperApp\Database::init();

// Run scheduler
exec('php ' . __DIR__ . '/schedule.php');
echo "Cron executed at " . date('Y-m-d H:i:s');
```

### Step 7: Multi Bot Configuration

VesperApp menggunakan **Standalone Multi Bot System** untuk menghindari rate limit Telegram:

#### ✅ Setup Webhook Setiap Bot
```bash
# Set webhook untuk SETIAP bot yang Anda tambahkan
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -d "url=https://yourdomain.com/public/webhook.php?bot_id=<BOT_ID>"
```

- Ganti `<BOT_TOKEN>` dengan token dari @BotFather
- Ganti `<BOT_ID>` dengan ID bot yang terdaftar di database
- Lakukan ini untuk SEMUA bot yang Anda tambahkan

#### Browser-based Setup (Shared Hosting)
Buat file `set_webhooks.php`:

```php
<?php
// set_webhooks.php - Setup webhook untuk semua bot
$bots = [
    1 => 'BOT_TOKEN_1',
    2 => 'BOT_TOKEN_2',
    3 => 'BOT_TOKEN_3',
    // Tambahkan bot lain disini
];

$domain = 'https://yourdomain.com';

echo "<h2>🤖 Multi Bot Webhook Setup Results</h2>";

foreach ($bots as $botId => $token) {
    $url = "https://api.telegram.org/bot{$token}/setWebhook?url=" . urlencode("{$domain}/public/webhook.php?bot_id={$botId}");
    $response = json_decode(file_get_contents($url), true);
    
    echo "<h3>Bot #{$botId}:</h3>";
    echo "<pre>" . json_encode($response, JSON_PRETTY_PRINT) . "</pre>";
}
```

Akses file ini via browser untuk setup webhook semua bot sekaligus.

### Step 8: Testing & Verification

#### Test Files
1. **Health Check**: `https://yourdomain.com/public/health.php`
2. **Database Test**: Buat `test_db.php`:
   ```php
   <?php
   require 'vendor/autoload.php';
   VesperApp\Database::init();
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
sudo git clone https://github.com/mieburungdara/VesperApp.git
sudo chown -R www-data:www-data VesperApp
cd VesperApp

# Install dependencies
sudo -u www-data composer install --no-dev --optimize-autoloader

# Database setup
sudo mysql -e "CREATE DATABASE VesperApp CHARACTER SET utf8mb4;"
sudo mysql -e "CREATE USER 'VesperApp'@'localhost' IDENTIFIED BY 'secure_password';"
sudo mysql -e "GRANT ALL ON VesperApp.* TO 'VesperApp'@'localhost';"
mysql -u VesperApp -p VesperApp < migrations/schema.sql

# Web server config
sudo nano /etc/apache2/sites-available/VesperApp.conf
# ... (Apache config as before)

# SSL Setup
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d yourdomain.com

# Cron setup
echo "* * * * * cd /var/www/VesperApp && php schedule.php" | sudo crontab -
```

## 🔧 **Konfigurasi Environment**

### Shared Hosting .env
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_HOST=localhost
DB_DATABASE=VesperApp_db
DB_USERNAME=VesperApp_user
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
DB_DATABASE=VesperApp
DB_USERNAME=VesperApp
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

