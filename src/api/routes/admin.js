const express = require('express');
const router = express.Router();
const admin = require('../../services/admin');
const auth = require('../../services/auth');
const db = require('../../services/database');
const wallet = require('../../services/wallet');
const notifications = require('../../services/notifications');
const audit = require('../../services/audit');
const axios = require('axios');

/**
 * Admin API
 */
router.post('/admin', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    
    // Authorization Check
    const adminUser = await admin.getAdmin(user.telegram_id);
    if (!adminUser) {
      throw new Error('Anda tidak memiliki akses admin');
    }

    const { action } = req.body;

    // 1. DASHBOARD STATS
    if (action === 'stats') {
      const stats = await admin.getSystemStats();
      const pendingTopups = await db('payment_proofs').where('status', 'pending').count('id as total').first();
      
      return res.json({ 
        success: true, 
        data: {
          ...stats,
          pending_topups: parseInt(pendingTopups.total || 0)
        } 
      });
    }

    // 2. BOT MANAGEMENT (Super Admin only)
    if (action === 'get_bots') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const bots = await db('bots').select('*');
        return res.json({ success: true, data: bots });
    }

    if (action === 'add_bot') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { name, username, token, type } = req.body;
        if (!name || !username || !token) throw new Error('Data tidak lengkap');
        
        await db('bots').insert({ 
            name, 
            username, 
            token, 
            type: type || 'public',
            is_active: 1 
        });
        
        await audit.logAdminAction('add_bot', { name, username }, user.telegram_id);
        return res.json({ success: true, message: 'Bot berhasil ditambahkan' });
    }

    if (action === 'set_webhook') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { bot_id } = req.body;
        const botData = await db('bots').where('id', bot_id).first();
        if (!botData) throw new Error('Bot tidak ditemukan');

        const domain = process.env.WEBHOOK_DOMAIN;
        if (!domain) throw new Error('WEBHOOK_DOMAIN belum dikonfigurasi di server');
        
        const webhookUrl = `${domain}/webhook/${botData.token}`;
        const response = await axios.get(`https://api.telegram.org/bot${botData.token}/setWebhook?url=${webhookUrl}&allowed_updates=["message","callback_query"]`);
        
        await audit.logAdminAction('set_webhook', { bot_id, url: webhookUrl }, user.telegram_id);
        return res.json({ success: true, data: response.data });
    }

    if (action === 'delete_webhook') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { bot_id } = req.body;
        const botData = await db('bots').where('id', bot_id).first();
        if (!botData) throw new Error('Bot tidak ditemukan');

        const response = await axios.get(`https://api.telegram.org/bot${botData.token}/deleteWebhook`);
        
        await audit.logAdminAction('delete_webhook', { bot_id }, user.telegram_id);
        return res.json({ success: true, data: response.data });
    }

    if (action === 'webhook_info') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { bot_id } = req.body;
        const botData = await db('bots').where('id', bot_id).first();
        if (!botData) throw new Error('Bot tidak ditemukan');

        const response = await axios.get(`https://api.telegram.org/bot${botData.token}/getWebhookInfo`);
        return res.json({ success: true, data: response.data });
    }

    // 3. GET PENDING PAYMENTS
    if (action === 'get_pending_payments') {
        if (!await admin.hasRole(user.telegram_id, 'finance')) throw new Error('Akses ditolak');
        
        const payments = await db('payment_proofs as p')
            .join('users as u', 'p.user_id', '=', 'u.telegram_id')
            .where('p.status', 'pending')
            .select('p.*', 'u.display_name', 'u.username')
            .orderBy('p.created_at', 'desc');
            
        return res.json({ success: true, data: payments });
    }

    // 4. APPROVE PAYMENT
    if (action === 'approve_payment') {
        if (!await admin.hasRole(user.telegram_id, 'finance')) throw new Error('Akses ditolak');
        
        const { payment_id, payment_type } = req.body;
        
        if (payment_type === 'topup') {
            const payment = await db('payment_proofs').where('id', payment_id).where('status', 'pending').first();
            if (!payment) throw new Error('Pembayaran tidak ditemukan');

            await db.transaction(async (trx) => {
                await trx('payment_proofs').where('id', payment_id).update({
                    status: 'approved',
                    admin_id: user.telegram_id,
                    processed_at: new Date()
                });
                
                await wallet.addBalance(payment.user_id, payment.amount, 'Topup disetujui oleh admin');
            });

            await audit.logAdminAction('approve_topup', { payment_id, amount: payment.amount }, user.telegram_id);
            await notifications.notifyTopupApproved(payment.user_id, payment.amount);
            
            return res.json({ success: true, data: { message: 'Pembayaran disetujui' } });
        }
    }

    // 5. GET ADMINS (Super Admin only)
    if (action === 'get_admins') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const admins = await db('admins').orderBy('created_at', 'desc');
        return res.json({ success: true, data: admins });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
