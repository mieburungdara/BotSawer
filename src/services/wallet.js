const db = require('./database');

class WalletService {
  /**
   * Add balance to user
   */
  async addBalance(telegramId, amount, description = '') {
    if (amount <= 0) throw new Error('Jumlah nominal harus lebih besar dari 0');

    return await db.transaction(async (trx) => {
      const wallet = await trx('wallets').where('user_id', telegramId).forUpdate().first();
      if (!wallet) throw new Error('Wallet pengguna tidak ditemukan');

      await trx('wallets').where('user_id', telegramId).update({
        balance: db.raw('balance + ?', [amount]),
        total_deposit: db.raw('total_deposit + ?', [amount])
      });

      await trx('transactions').insert({
        user_id: telegramId,
        type: 'deposit',
        amount: amount,
        status: 'success',
        description: description
      });

      return true;
    });
  }

  /**
   * Deduct balance from user
   */
  async deductBalance(telegramId, amount, description = '') {
    if (amount <= 0) throw new Error('Jumlah nominal harus lebih besar dari 0');

    return await db.transaction(async (trx) => {
      const wallet = await trx('wallets').where('user_id', telegramId).forUpdate().first();
      if (!wallet) throw new Error('Wallet pengguna tidak ditemukan');

      if (wallet.balance < amount) {
        throw new Error('Saldo tidak mencukupi');
      }

      await trx('wallets').where('user_id', telegramId).update({
        balance: db.raw('balance - ?', [amount]),
        total_withdraw: db.raw('total_withdraw + ?', [amount])
      });

      await trx('transactions').insert({
        user_id: telegramId,
        type: 'withdraw',
        amount: amount,
        status: 'success',
        description: description
      });

      return true;
    });
  }

  /**
   * Get current balance
   */
  async getBalance(telegramId) {
    const wallet = await db('wallets').where('user_id', telegramId).first();
    return wallet ? parseFloat(wallet.balance) : 0;
  }
}

module.exports = new WalletService();
