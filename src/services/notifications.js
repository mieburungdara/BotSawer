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
    let message = `🎉 <b>Anda Menerima Donasi!</b>\n\n` +
                  `💰 Jumlah: <b>Rp ${formattedAmount}</b>\n` +
                  `👤 Dari: <i>${donorName}</i>\n` +
                  `📱 Content ID: #${shortId}\n`;

    if (donorMessage) {
      message += `\n💬 <b>Pesan:</b>\n<i>"${donorMessage}"</i>\n`;
    }

    message += `\n📅 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
               `Terima kasih atas konten Anda! 🎨`;

    await this.sendToUser(telegramId, message);
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
}

module.exports = new NotificationService();
