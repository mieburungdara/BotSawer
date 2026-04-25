const express = require('express');
const router = express.Router();
const auth = require('../../services/auth');
const wallet = require('../../services/wallet');
const db = require('../../services/database');

/**
 * Withdrawal API
 */
router.post('/withdrawal', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { amount, admin_fee, commission_fee, net_amount, ewallet_info } = req.body;

    if (!amount || amount < 50000) {
        throw new Error('Minimal penarikan adalah Rp 50.000');
    }

    const currentBalance = await wallet.getBalance(user.telegram_id);
    if (currentBalance < amount) {
        throw new Error('Saldo tidak mencukupi');
    }

    // Get Payment Method Config from DB (Security)
    const method = await db('payment_methods').where('code', ewallet_info.type).first();
    if (!method) throw new Error('Metode pembayaran tidak valid');

    const admin_fee = method.admin_fee;
    const commission_fee = Math.round(amount * parseFloat(method.commission_rate));
    const net_amount = amount - admin_fee - commission_fee;

    // Process Withdrawal
    await db.transaction(async (trx) => {
        // 1. Deduct full amount from balance
        await trx('wallets').where('user_id', user.telegram_id).update({
            balance: db.raw('balance - ?', [amount]),
            total_withdraw: db.raw('total_withdraw + ?', [amount])
        });

        // 2. Create withdrawal record (type: withdrawal)
        await trx('transactions').insert({
            user_id: user.telegram_id,
            type: 'withdrawal',
            amount: -amount, // Negative for balance history
            status: 'pending',
            description: `Penarikan via ${ewallet_info.type} (${ewallet_info.number})`,
            metadata: JSON.stringify({
                account_name: ewallet_info.name,
                admin_fee,
                commission_fee,
                net_amount,
                ewallet_type: ewallet_info.type,
                ewallet_number: ewallet_info.number,
                ewallet_name: ewallet_info.name
            })
        });
    });

    res.json({ success: true, message: 'Permintaan penarikan berhasil dikirim' });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
