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
    
    if (!initData) throw new Error('InitData diperlukan untuk otentikasi');

    let bot = null;
    if (botId) {
        bot = await db('bots').where('bot_id', botId).where('is_active', 1).first();
    }

    // If bot found, try to validate
    if (bot && this.validateInitData(initData, bot.token)) {
        // Signature valid for this bot
    } else {
        // If specific botId failed or was not provided, try all active bots
        const allBots = await db('bots').where('is_active', 1);
        let foundValid = false;
        
        for (const b of allBots) {
            if (this.validateInitData(initData, b.token)) {
                bot = b;
                foundValid = true;
                break;
            }
        }
        
        if (!foundValid) {
            throw new Error('Invalid request signature. Pastikan Anda membuka aplikasi melalui bot resmi.');
        }
    }

    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get('user');
    if (!userJson) throw new Error('Data user tidak ditemukan dalam initData');
    
    const userData = JSON.parse(userJson);
    const telegramId = userData.id;

    let user = await db('users').where('telegram_id', telegramId).first();
    
    if (!user) {
        // Create user if not exists (Telegram WebApp guarantees data is valid here)
        await db('users').insert({
            telegram_id: telegramId,
            first_name: userData.first_name || '',
            last_name: userData.last_name || null,
            username: userData.username || null,
            language_code: userData.language_code || 'id',
            is_creator: 0
        });

        // Auto-create wallet for new user
        const walletExists = await db('wallets').where('user_id', telegramId).first();
        if (!walletExists) {
            await db('wallets').insert({ user_id: telegramId, balance: 0 });
        }

        user = await db('users').where('telegram_id', telegramId).first();
    }

    // Return user with bot info for context
    return { ...user, active_bot: bot };
  }
}

module.exports = new AuthService();
