const { Telegram } = require('telegraf');
const db = require('./database');

class NotificationService {
  constructor() {
    this.telegram = null;
  }

  /**
   * Initialize Telegram instance with the first active bot token
   */
  async init() {
    if (this.telegram) return;

    const bot = await db('bots').where('is_active', 1).first();
    if (bot) {
      this.telegram = new Telegram(bot.token);
    }
  }

  /**
   * Send generic message to user
   */
  async sendToUser(telegramId, message) {
    try {
      await this.init();
      if (!this.telegram) return false;

      await this.telegram.sendMessage(telegramId, message, { parse_mode: 'HTML' });
      return true;
    } catch (error) {
      console.error(`Failed to send notification to ${telegramId}:`, error.message);
      return false;
    }
  }

  /**
   * Notify user about approved top-up
   */
  async notifyTopupApproved(telegramId, amount) {
    const formattedAmount = new Intl.NumberFormat('id-ID').format(amount);
    const message = `✅ <b>Topup Berhasil!</b>\n\n` +
                    `💰 Jumlah: Rp ${formattedAmount}\n` +
                    `📅 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
                    `Saldo Anda telah bertambah. Terima kasih!`;

    await this.sendToUser(telegramId, message);
  }

  /**
   * Notify creator about received donation
   */
  async notifyCreatorDonation(telegramId, amount, shortId, donorName = 'Anonymous', donorMessage = '') {
    const formattedAmount = new Intl.NumberFormat('id-ID').format(amount);
    
    // Get bot username for link
    const bot = await db('bots').where('is_active', 1).first();
    const botUsername = bot ? bot.username : 'VesperAppBot';

    let message = `🎉 <b>Anda Menerima Donasi!</b>\n\n` +
                  `💰 Jumlah: <b>Rp ${formattedAmount}</b>\n` +
                  `👤 Dari: <i>${donorName}</i>\n` +
                  (shortId ? `📱 Content ID: #${shortId}\n` : '');

    if (donorMessage) {
      message += `\n💬 <b>Pesan:</b>\n<i>"${donorMessage}"</i>\n`;
    }

    message += `\n📅 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
               `Terima kasih atas konten Anda! 🎨`;

    const buttonText = shortId ? '🖼️ Lihat Konten' : '💰 Buka Dompet';
    const startParam = shortId ? `content_${shortId}` : 'wallet';

    const keyboard = {
      inline_keyboard: [[{ text: buttonText, url: `https://t.me/${botUsername}/webapp?startapp=${startParam}` }]]
    };

    try {
      await this.init();
      if (!this.telegram) return false;
      await this.telegram.sendMessage(telegramId, message, { 
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return true;
    } catch (error) {
      console.error(`Failed to send donation notification to ${telegramId}:`, error.message);
      return false;
    }
  }

  /**
   * Notify creator that they are now verified
   */
  async notifyCreatorVerified(telegramId) {
    const message = `🎊 <b>Selamat! Akun Kreator Anda Sudah Diverifikasi</b>\n\n` +
                    `✅ Anda sekarang bisa upload konten\n` +
                    `📤 Kirim foto/video untuk mulai posting\n` +
                    `💰 Mulai terima donasi dari penggemar\n\n` +
                    `Selamat berkarya! 🎨`;

    await this.sendToUser(telegramId, message);
  }

  /**
   * Broadcast to all users
   */
  async broadcastToAll(message, excludeIds = []) {
    const users = await db('users').where('is_banned', 0).whereNotIn('telegram_id', excludeIds);
    let sent = 0;
    
    for (const user of users) {
      if (await this.sendToUser(user.telegram_id, message)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Forward media to backup channel and return message ID
   */
  async forwardToBackup(mediaInfo, user, shortId, mediaDbId) {
    try {
      await this.init();
      if (!this.telegram) return;

      const settingsRows = await db('settings').where('key', 'backup_channel').first();
      const backupChannel = settingsRows ? settingsRows.value : null;
      if (!backupChannel) return;

      const adminCaption = `📁 <b>MEDIA BACKUP</b>\n\n` +
                           `🆔 ID: #${shortId}\n` +
                           `👤 User: ${user.first_name} ${user.last_name || ''} (@${user.username || 'n/a'})\n` +
                           `🎨 Creator: ${user.display_name || 'Anonim'}\n` +
                           `📎 Type: ${mediaInfo.type}\n` +
                           `📅 Time: ${new Date().toLocaleString('id-ID')}`;

      let sentMsg = null;
      if (mediaInfo.type === 'photo') {
        sentMsg = await this.telegram.sendPhoto(backupChannel, mediaInfo.file_id, { caption: adminCaption, parse_mode: 'HTML' });
      } else if (mediaInfo.type === 'video') {
        sentMsg = await this.telegram.sendVideo(backupChannel, mediaInfo.file_id, { caption: adminCaption, parse_mode: 'HTML' });
      }

      if (sentMsg && sentMsg.message_id) {
        await db('media_files').where('id', mediaDbId).update({
            backup_message_id: sentMsg.message_id
        });
      }
    } catch (error) {
      console.error('Backup forward failed:', error.message);
    }
  }
}

module.exports = new NotificationService();
