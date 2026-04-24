const crypto = require('crypto');
const db = require('./database');

class AuthService {
  /**
   * Validate Telegram initData
   */
  validateInitData(initData, botToken) {
    if (!initData) return false;

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const params = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(params)
      .digest('hex');

    return calculatedHash === hash;
  }

  /**
   * Authenticate and get/create user
   */
  async authenticate(input) {
    const { initData, botId } = input;
    
    const bot = await db('bots').where('bot_id', botId).first();
    if (!bot) throw new Error('Bot tidak valid');

    if (!this.validateInitData(initData, bot.token)) {
      throw new Error('Invalid request signature');
    }

    const urlParams = new URLSearchParams(initData);
    const userData = JSON.parse(urlParams.get('user'));
    const telegramId = userData.id;

    let user = await db('users').where('telegram_id', telegramId).first();
    
    if (!user) {
        // This should normally be handled by the bot when user starts it
        throw new Error('User tidak ditemukan. Silakan mulai bot terlebih dahulu.');
    }

    return user;
  }
}

module.exports = new AuthService();
