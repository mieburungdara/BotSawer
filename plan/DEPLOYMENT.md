# 🚀 BotSawer Deployment Guide

Panduan lengkap untuk deploy BotSawer ke production environment.

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Web Server**: Apache 2.4+ atau Nginx 1.18+
- **PHP**: 8.5+ dengan ekstensi: pdo_mysql, mbstring, openssl, curl, json, bcmath, fileinfo
- **Database**: MySQL 8.0+ atau MariaDB 10.5+
- **SSL**: Certificate (Let's Encrypt recommended)
- **Cron**: System cron access

### Recommended Server Specs
- **CPU**: 2+ cores
- **RAM**: 2GB+ (4GB recommended)  
- **Storage**: 20GB+ SSD
- **Bandwidth**: 100Mbps+

## 🏗️ Quick Deployment

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install LAMP stack
sudo apt install -y apache2 mysql-server php8.1 php8.1-mysql php8.1-mbstring php8.1-curl php8.1-xml php8.1-bcmath curl unzip

# Install Composer
curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer
```

### 2. Database Setup
```bash
# Create database
sudo mysql -e "CREATE DATABASE botsawer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'botsawer'@'localhost' IDENTIFIED BY 'secure_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON botsawer.* TO 'botsawer'@'localhost';"

# Import schema
mysql -u botsawer -p botsawer < migrations/schema.sql
```

### 3. Application Deployment
```bash
# Clone and setup
cd /var/www
sudo git clone https://github.com/mieburungdara/BotSawer.git
sudo chown -R www-data:www-data BotSawer
cd BotSawer

# Install dependencies
sudo -u www-data composer install --no-dev --optimize-autoloader

# Configure environment
sudo -u www-data cp .env.example .env
# Edit .env with production values
```

### 4. Web Server Setup
```bash
# Apache virtual host
sudo nano /etc/apache2/sites-available/botsawer.conf
```

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/BotSawer/public
    
    <Directory /var/www/BotSawer/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

```bash
sudo a2ensite botsawer && sudo systemctl reload apache2
```

### 5. SSL Setup
```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d yourdomain.com
```

### 6. Cron & Permissions
```bash
# Set permissions
sudo chown -R www-data:www-data /var/www/BotSawer
sudo chmod -R 755 /var/www/BotSawer
sudo chmod -R 775 /var/www/BotSawer/logs

# Add cron job
echo "* * * * * cd /var/www/BotSawer && php schedule.php" | sudo crontab -
```

### 7. Bot Configuration
```bash
# Set Telegram webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yourdomain.com/public/webhook.php?secret=key"
```

## 🔧 Configuration Files

### .env Production Settings
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_HOST=localhost
DB_NAME=botsawer
DB_USER=botsawer
DB_PASSWORD=your_secure_password

TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_ID=123456789
```

## 🧪 Testing

```bash
# Health check
curl https://yourdomain.com/public/health.php

# Database test
cd /var/www/BotSawer && php test.php

# Web app access
# https://yourdomain.com/public/webapp/
```

## 📊 Monitoring

- **Health Check**: `/public/health.php`
- **Logs**: `logs/app.log`, `logs/errors.log`
- **Cron Logs**: `/var/log/botsawer_cron.log`

## 🚨 Troubleshooting

### Common Issues
1. **500 Error**: Check PHP logs, file permissions
2. **Database Error**: Verify connection settings
3. **Webhook Failed**: Check SSL and URL format
4. **Cron Issues**: Check `/var/log/syslog` for cron errors

### Performance Tuning
```bash
# PHP OPcache
echo "opcache.enable=1" >> /etc/php/8.1/apache2/php.ini
sudo systemctl restart apache2
```

## 🔒 Security

- Enable firewall: `sudo ufw enable`
- SSL certificate required
- File permissions: 644 files, 755 directories
- Database user with minimal privileges
- PHP disable_functions configured

## 📞 Support

For deployment issues:
- Check logs in `logs/` directory
- Verify server requirements
- Test with `php test.php`
- Check GitHub repository for updates

---

**🎯 Deployment selesai? BotSawer siap production!**
