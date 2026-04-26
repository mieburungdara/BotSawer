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
  async processDonation(senderId, receiverId, amount, contentId = null, message = null) {
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

      // 5. Update receiver's donation goal progress if goal exists
      const receiver = await trx('users').where('telegram_id', receiverId).select('donation_goal').first();
      if (receiver && receiver.donation_goal > 0) {
        await trx('users').where('telegram_id', receiverId).update({
          donation_goal_current: db.raw('donation_goal_current + ?', [amount])
        });
      }

      // 6. Record Transaction for sender
      await trx('transactions').insert({
        user_id: senderId,
        media_id: contentId,
        type: 'donation_sent',
        amount: -amount,
        status: 'success',
        message: message,
        description: `Donasi untuk kreator${contentId ? ' (Post #' + contentId + ')' : ''}`
      });

      // 7. Record Transaction for receiver
      await trx('transactions').insert({
        user_id: receiverId,
        from_user_id: senderId,
        media_id: contentId,
        type: 'donation',
        amount: amount,
        status: 'success',
        message: message,
        description: `Donasi masuk dari user ${senderId}`
      });

      // 8. Update Donation Streak
      await this.updateDonationStreak(trx, senderId);

      return true;
    });
  }

  /**
   * Update donation streak for a user
   */
  async updateDonationStreak(trx, userId) {
    const user = await trx('users').where('telegram_id', userId).first();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    let newStreak = user.donation_streak || 0;
    const lastDate = user.last_donation_date ? new Date(user.last_donation_date).toISOString().split('T')[0] : null;

    if (lastDate === today) {
      // Already donated today, streak stays the same
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    await trx('users').where('telegram_id', userId).update({
      donation_streak: newStreak,
      last_donation_date: today
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
