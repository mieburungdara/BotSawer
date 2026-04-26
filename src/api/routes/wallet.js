const express = require('express');
const router = express.Router();
const wallet = require('../../services/wallet');
const auth = require('../../services/auth');
const db = require('../../services/database');

/**
 * Wallet API
 */
router.post('/wallet', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { action } = req.body;

    // 1. GET BALANCE
    if (action === 'get_balance') {
      const balance = await wallet.getBalance(user.telegram_id);
      return res.json({ success: true, data: { balance } });
    }

    // 2. GET HISTORY
    if (action === 'get_history') {
        const history = await db('transactions')
            .where('user_id', user.telegram_id)
            .orderBy('id', 'desc')
            .limit(20);
            
        return res.json({ success: true, data: history });
    }

    // 3. PROCESS DONATION
    if (action === 'donate') {
        const { receiverId, amount, contentId, message } = req.body;
        if (!receiverId || !amount) throw new Error('Receiver ID dan jumlah harus diisi');
        
        await wallet.processDonation(user.telegram_id, receiverId, amount, contentId, message);
        const newBalance = await wallet.getBalance(user.telegram_id);
        
        return res.json({ 
            success: true, 
            message: 'Donasi berhasil dikirim!',
            data: { balance: newBalance }
        });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
