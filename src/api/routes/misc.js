const express = require('express');
const router = express.Router();
const auth = require('../../services/auth');
const db = require('../../services/database');

/**
 * Dashboard API
 */
router.post('/dashboard.php', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);

    const announcements = await db('announcements')
        .where('is_active', 1)
        .orderBy('created_at', 'desc')
        .limit(3);

    const wallet = await db('wallets').where('user_id', user.telegram_id).first();
    const earnings = await db('transactions')
        .where('user_id', user.telegram_id)
        .where('type', 'donation')
        .where('status', 'success')
        .sum('amount as total')
        .first();

    const contents = await db('contents')
        .where('user_id', user.telegram_id)
        .whereNot('status', 'deleted')
        .count('id as total')
        .first();

    return res.json({
        success: true,
        data: {
            announcements,
            stats: {
                balance: parseFloat(wallet ? wallet.balance : 0),
                total_earnings: parseFloat(earnings.total || 0),
                active_contents: parseInt(contents.total || 0)
            }
        }
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

/**
 * Ecosystem API
 */
router.post('/ecosystem.php', async (req, res) => {
    try {
        const bots = await db('bots').where('is_active', 1).where('type', 'public');
        const channels = await db('channels').where('is_active', 1);
        const groups = await db('groups').where('is_active', 1);

        return res.json({
            success: true,
            data: { bots, channels, groups }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * Config API
 */
router.post('/config.php', async (req, res) => {
    try {
        const settingsRows = await db('settings').select('key', 'value');
        const settings = {};
        settingsRows.forEach(row => settings[row.key] = row.value);

        let botUsername = 'linkzipbot';
        if (req.body.botId) {
            const bot = await db('bots').where('bot_id', req.body.botId).first();
            if (bot) botUsername = bot.username;
        }

        return res.json({
            success: true,
            data: {
                app_name: settings['app_name'] || 'Vesper',
                app_version: settings['app_version'] || '1.0.0',
                bot_username: botUsername,
                min_withdraw: parseInt(settings['min_withdraw'] || 50000),
                platform_commission: parseInt(settings['platform_commission'] || 10)
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

module.exports = router;
