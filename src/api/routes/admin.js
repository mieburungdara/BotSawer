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
        const { token, type } = req.body;
        if (!token) throw new Error('Bot token wajib diisi');
        
        // Fetch bot info from Telegram
        try {
            const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
            if (!response.data.ok) throw new Error('Token tidak valid');
            
            const botInfo = response.data.result;
            const [botId] = await db('bots').insert({ 
                name: botInfo.first_name, 
                username: botInfo.username, 
                token, 
                type: type || 'public',
                is_active: 1 
            });
            
            await audit.logAdminAction('add_bot', { name: botInfo.first_name, username: botInfo.username }, user.telegram_id, 'bot', botId);
            return res.json({ success: true, message: `Bot @${botInfo.username} berhasil ditambahkan` });
        } catch (e) {
            throw new Error('Gagal mengambil info bot: ' + (e.response?.data?.description || e.message));
        }
    }

    if (action === 'toggle_bot') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { bot_id, is_active } = req.body;
        await db('bots').where('id', bot_id).update({ is_active: is_active ? 1 : 0 });
        
        await audit.logAdminAction('toggle_bot', { bot_id, is_active }, user.telegram_id, 'bot', bot_id);
        return res.json({ success: true, message: `Bot berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
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
        
        await audit.logAdminAction('set_webhook', { bot_id, url: webhookUrl }, user.telegram_id, 'bot', bot_id);
        return res.json({ success: true, data: response.data });
    }

    if (action === 'delete_webhook') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { bot_id } = req.body;
        const botData = await db('bots').where('id', bot_id).first();
        if (!botData) throw new Error('Bot tidak ditemukan');

        const response = await axios.get(`https://api.telegram.org/bot${botData.token}/deleteWebhook`);
        
        await audit.logAdminAction('delete_webhook', { bot_id }, user.telegram_id, 'bot', bot_id);
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

    if (action === 'update_bot_info') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { bot_id } = req.body;
        const botData = await db('bots').where('id', bot_id).first();
        if (!botData) throw new Error('Bot tidak ditemukan');

        try {
            const response = await axios.get(`https://api.telegram.org/bot${botData.token}/getMe`);
            if (!response.data.ok) throw new Error('Token tidak valid');
            
            const botInfo = response.data.result;
            await db('bots').where('id', bot_id).update({ 
                name: botInfo.first_name, 
                username: botInfo.username 
            });
            
            await audit.logAdminAction('update_bot_info', { name: botInfo.first_name, username: botInfo.username }, user.telegram_id, 'bot', bot_id);
            return res.json({ success: true, message: `Info bot @${botInfo.username} berhasil diperbarui` });
        } catch (e) {
            throw new Error('Gagal memperbarui info bot: ' + (e.response?.data?.description || e.message));
        }
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

            await audit.logAdminAction('approve_topup', { payment_id, amount: payment.amount }, user.telegram_id, 'payment', payment_id);
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

    // 6. CHANNEL MANAGEMENT
    if (action === 'get_channels') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const channels = await db('channels').orderBy('created_at', 'desc');
        return res.json({ success: true, data: channels });
    }

    if (action === 'toggle_channel') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { channel_id, is_active } = req.body;
        await db('channels').where('id', channel_id).update({ is_active: is_active ? 1 : 0 });
        
        await audit.logAdminAction('toggle_channel', { channel_id, is_active }, user.telegram_id, 'channel', channel_id);
        return res.json({ success: true, message: `Channel berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
    }

    if (action === 'add_channel') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { name, username, description, category, type } = req.body;
        
        if (!name || !username) throw new Error('Nama dan Username wajib diisi');

        const [id] = await db('channels').insert({
            name,
            username: username.startsWith('@') ? username : `@${username}`,
            description,
            category,
            type: type || 'public',
            is_active: 1
        });

        await audit.logAdminAction('add_channel', { name, username }, user.telegram_id, 'channel', id);
        return res.json({ success: true, message: `Channel ${name} berhasil ditambahkan`, channel_id: id });
    }

    if (action === 'update_channel') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { id, name, username, description, category, type } = req.body;
        
        if (!id || !name || !username) throw new Error('ID, Nama, dan Username wajib diisi');

        await db('channels').where('id', id).update({
            name,
            username: username.startsWith('@') ? username : `@${username}`,
            description,
            category,
            type: type || 'public'
        });

        await audit.logAdminAction('update_channel', { name, username }, user.telegram_id, 'channel', id);
        return res.json({ success: true, message: `Channel ${name} berhasil diperbarui` });
    }

    if (action === 'delete_channel') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { channel_id } = req.body;
        if (!channel_id) throw new Error('ID Channel wajib diisi');

        const channel = await db('channels').where('id', channel_id).first();
        if (!channel) throw new Error('Channel tidak ditemukan');

        await db('channels').where('id', channel_id).delete();
        
        await audit.logAdminAction('delete_channel', { name: channel.name, username: channel.username }, user.telegram_id, 'channel', channel_id);
        return res.json({ success: true, message: `Channel ${channel.name} berhasil dihapus` });
    }

    if (action === 'check_channel_admin') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { channel_id } = req.body;
        
        const channel = await db('channels').where('id', channel_id).first();
        if (!channel) throw new Error('Channel tidak ditemukan');

        const activeBots = await db('bots').where('is_active', 1);
        let adminFound = false;
        let adminBotUsername = '';

        for (const bot of activeBots) {
            try {
                // Get bot info first to get its ID
                const meRes = await axios.get(`https://api.telegram.org/bot${bot.token}/getMe`);
                const botId = meRes.data.result.id;

                const resMember = await axios.get(`https://api.telegram.org/bot${bot.token}/getChatMember`, {
                    params: { chat_id: channel.username, user_id: botId }
                });

                const status = resMember.data.result.status;
                if (status === 'administrator' || status === 'creator') {
                    adminFound = true;
                    adminBotUsername = bot.username;
                    break;
                }
            } catch (e) {
                // Skip if bot fails or is not in channel
                continue;
            }
        }

        if (adminFound) {
            return res.json({ success: true, message: `Bot @${adminBotUsername} terdeteksi sebagai Admin di channel ini.` });
        } else {
            return res.json({ success: false, message: 'Tidak ada bot yang terdeteksi sebagai Admin. Pastikan salah satu bot Anda sudah ditambahkan ke channel sebagai Administrator.' });
        }
    }

    if (action === 'get_channel_info') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { channel_id } = req.body;
        
        const channel = await db('channels').where('id', channel_id).first();
        if (!channel) throw new Error('Channel tidak ditemukan');

        const activeBots = await db('bots').where('is_active', 1);
        if (activeBots.length === 0) throw new Error('Tidak ada bot aktif untuk mengecek data');

        const bot = activeBots[0]; // Use first active bot
        try {
            const resChat = await axios.get(`https://api.telegram.org/bot${bot.token}/getChat`, {
                params: { chat_id: channel.username }
            });

            const resCount = await axios.get(`https://api.telegram.org/bot${bot.token}/getChatMemberCount`, {
                params: { chat_id: channel.username }
            });

            const chat = resChat.data.result;
            const memberCount = resCount.data.result;

            return res.json({ 
                success: true, 
                data: {
                    title: chat.title,
                    username: chat.username,
                    description: chat.description || 'Tidak ada deskripsi',
                    member_count: memberCount,
                    invite_link: chat.invite_link,
                    type: chat.type,
                    photo: chat.photo ? chat.photo.small_file_id : null
                } 
            });
        } catch (e) {
            throw new Error('Gagal mengambil data dari Telegram. Pastikan username benar dan bot ada di channel.');
        }
    }

    if (action === 'get_channel_bot_admins') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { channel_id } = req.body;
        
        const channel = await db('channels').where('id', channel_id).first();
        if (!channel) throw new Error('Channel tidak ditemukan');

        const activeBots = await db('bots').where('is_active', 1);
        const adminBots = [];

        for (const bot of activeBots) {
            try {
                const meRes = await axios.get(`https://api.telegram.org/bot${bot.token}/getMe`);
                const botId = meRes.data.result.id;

                const resMember = await axios.get(`https://api.telegram.org/bot${bot.token}/getChatMember`, {
                    params: { chat_id: channel.username, user_id: botId }
                });

                const status = resMember.data.result.status;
                if (status === 'administrator' || status === 'creator') {
                    adminBots.push({
                        id: bot.id,
                        username: bot.username,
                        name: bot.name,
                        status: status
                    });
                }
            } catch (e) {
                continue;
            }
        }

        return res.json({ success: true, data: adminBots });
    }

    if (action === 'channel_bot_action') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { bot_id, channel_id, action_type, params } = req.body;

        const bot = await db('bots').where('id', bot_id).first();
        const channel = await db('channels').where('id', channel_id).first();
        
        if (!bot || !channel) throw new Error('Bot atau Channel tidak ditemukan');

        try {
            if (action_type === 'send_message') {
                await axios.post(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
                    chat_id: channel.username,
                    text: params.text,
                    parse_mode: 'HTML'
                });
            } else if (action_type === 'pin_message') {
                await axios.post(`https://api.telegram.org/bot${bot.token}/pinChatMessage`, {
                    chat_id: channel.username,
                    message_id: params.message_id
                });
            }
            // Add more actions as needed

            return res.json({ success: true, message: 'Aksi berhasil dijalankan oleh bot' });
        } catch (e) {
            throw new Error('Gagal menjalankan aksi via bot: ' + (e.response?.data?.description || e.message));
        }
    }

    // 7. USER MANAGEMENT
    if (action === 'get_users') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { search, filter, sort, offset = 0, limit = 20 } = req.body;
        
        let query = db('users');

        if (search) {
            query = query.where(function() {
                this.where('first_name', 'like', `%${search}%`)
                    .orWhere('last_name', 'like', `%${search}%`)
                    .orWhere('username', 'like', `%${search}%`)
                    .orWhere('telegram_id', 'like', `%${search}%`);
            });
        }

        if (filter === 'creator') query = query.where('is_creator', 1);
        if (filter === 'banned') query = query.where('is_banned', 1);
        if (filter === 'verified') query = query.where('is_verified', 1);

        if (sort === 'newest') query = query.orderBy('created_at', 'desc');
        else if (sort === 'oldest') query = query.orderBy('created_at', 'asc');
        else if (sort === 'streak') query = query.orderBy('donation_streak', 'desc');
        else query = query.orderBy('created_at', 'desc');

        const [countResult] = await query.clone().count('id as total');
        const usersList = await query.limit(limit).offset(offset);

        return res.json({ 
            success: true, 
            data: { 
                list: usersList, 
                total: countResult.total 
            } 
        });
    }

    if (action === 'toggle_ban_user') {
        if (!await admin.isSuperAdmin(user.telegram_id)) throw new Error('Akses ditolak');
        const { target_telegram_id, is_banned } = req.body;
        
        await db('users').where('telegram_id', target_telegram_id).update({ is_banned: is_banned ? 1 : 0 });
        
        await audit.logAdminAction('toggle_ban', { target_telegram_id, is_banned }, user.telegram_id, 'user', target_telegram_id);
        return res.json({ success: true, message: `User berhasil ${is_banned ? 'dibanned' : 'diunbanned'}` });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
