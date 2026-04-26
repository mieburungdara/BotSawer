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
   * Process donation from one user to another
   */
  async processDonation(senderId, receiverId, amount, contentId = null) {
    if (amount <= 0) throw new Error('Jumlah nominal harus lebih besar dari 0');
    if (String(senderId) === String(receiverId)) throw new Error('Anda tidak bisa memberikan donasi kepada diri sendiri');

    return await db.transaction(async (trx) => {
      // 1. Check sender balance
      const senderWallet = await trx('wallets').where('user_id', senderId).forUpdate().first();
      if (!senderWallet || parseFloat(senderWallet.balance) < amount) {
        throw new Error('Saldo Anda tidak mencukupi untuk memberikan donasi ini');
      }

      // 2. Check receiver wallet
      const receiverWallet = await trx('wallets').where('user_id', receiverId).forUpdate().first();
      if (!receiverWallet) throw new Error('Wallet kreator tujuan tidak ditemukan');

      // 3. Deduct from sender
      await trx('wallets').where('user_id', senderId).update({
        balance: db.raw('balance - ?', [amount])
      });

      // 4. Add to receiver
      await trx('wallets').where('user_id', receiverId).update({
        balance: db.raw('balance + ?', [amount]),
        total_earning: db.raw('total_earning + ?', [amount])
      });

      // 5. Record Transaction for sender
      await trx('transactions').insert({
        user_id: senderId,
        media_id: contentId,
        type: 'donation_sent',
        amount: -amount,
        status: 'success',
        description: `Donasi untuk kreator${contentId ? ' (Post #' + contentId + ')' : ''}`
      });

      // 6. Record Transaction for receiver
      await trx('transactions').insert({
        user_id: receiverId,
        from_user_id: senderId,
        media_id: contentId,
        type: 'donation',
        amount: amount,
        status: 'success',
        description: `Donasi masuk dari user ${senderId}`
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
