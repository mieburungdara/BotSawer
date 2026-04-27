const db = require('../services/database');
const wallet = require('../services/wallet');
const notifications = require('../services/notifications');
const { extractMediaInfo, generateShortId } = require('./utils');

const creator = require('../services/creator');

// Store debounce timers in memory
const debounceTimers = new Map();

/**
 * Handle Start Command (Deep Links & Welcome)
 */
const handleStart = async (ctx, botData) => {
    try {
        const startParam = ctx.startPayload;
        
        // Ensure user is registered/updated
        const telegramId = ctx.from.id;
        let user = await db('users').where('telegram_id', telegramId).first();
        if (!user) {
            await db('users').insert({
                telegram_id: telegramId,
                first_name: ctx.from.first_name,
                last_name: ctx.from.last_name || null,
                username: ctx.from.username || null,
                language_code: ctx.from.language_code || 'id'
            });
            user = { telegram_id: telegramId };

            // Auto-create wallet for new user
            const walletExists = await db('wallets').where('user_id', telegramId).first();
            if (!walletExists) {
                await db('wallets').insert({ user_id: telegramId, balance: 0 });
            }
        }

        if (!startParam) {
            // Welcome Message with Streak Data
            let streak = { current_streak: 0, streak_badge: 'Belum mulai' };
            try {
                streak = await creator.getStreakData(telegramId);
            } catch (streakErr) {
                console.error('[handleStart] getStreakData error:', streakErr.message);
            }

            const botName = botData.name || 'VesperApp';
            const botUsername = botData.username || '';

            const message = `✨ <b>Selamat Datang di ${botName}!</b> ✨\n\n` +
                            `🚀 <i>Platform donasi sukarela terbaik untuk kreator konten hebat seperti Anda.</i>\n\n` +
                            `🔹 <b>Panduan Cepat:</b>\n` +
                            `💰 <b>/saldo</b> - Cek pundi-pundi rupiahmu\n` +
                            `📤 <b>Kirim Foto/Video</b> - Mulai kumpulkan dukungan\n` +
                            `💸 <b>Sawer</b> - Melalui link di channel publik\n\n` +
                            `🔥 <b>Statistik Streak Anda:</b>\n` +
                            `📈 Current Streak: <b>${streak.current_streak} Hari</b>\n` +
                            `🏅 Badge: <b>${streak.streak_badge}</b>\n` +
                            `<i>Jaga api semangatmu, teruslah berkarya!</i> 🎨\n\n` +
                            `❓ Butuh bantuan? Ketik <b>/help</b>`;

            const inlineButtons = [];
            if (botUsername) {
                inlineButtons.push([{ text: '🖥️ Buka Dashboard WebApp', url: `https://t.me/${botUsername}/webapp` }]);
            }
            inlineButtons.push([
                { text: '💳 Topup Saldo', callback_data: 'topup_info' },
                { text: '👥 Komunitas', url: 'https://t.me/vesperapp_community' }
            ]);

            const keyboard = { inline_keyboard: inlineButtons };

            return ctx.replyWithHTML(message, { reply_markup: keyboard });
        }

        // Deep-link handling
        if (startParam.startsWith('content_')) {
            const shortId = startParam.replace('content_', '');
            const content = await db('contents').where('short_id', shortId).first();
            if (!content) return ctx.reply('Konten tidak ditemukan.');

            // Get media files
            const mediaFiles = await db('media_files').where('content_id', content.id);
            if (mediaFiles.length === 0) return ctx.reply('Media tidak ditemukan.');

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '💸 100', callback_data: `sawer_100_${shortId}` },
                        { text: '💸 500', callback_data: `sawer_500_${shortId}` },
                        { text: '💸 1K', callback_data: `sawer_1000_${shortId}` },
                        { text: '💸 2K', callback_data: `sawer_2000_${shortId}` }
                    ],
                    [
                        { text: '💸 5K', callback_data: `sawer_5000_${shortId}` },
                        { text: '💸 10K', callback_data: `sawer_10000_${shortId}` },
                        { text: '💸 20K', callback_data: `sawer_20000_${shortId}` },
                        { text: '💸 50K', callback_data: `sawer_50000_${shortId}` }
                    ]
                ]
            };

            const caption = `${content.caption || 'Konten dari kreator'}\n\n🆔 ID: #${shortId}`;

            const settingsRows = await db('settings').where('key', 'backup_channel').first();
            const backupChannel = settingsRows ? settingsRows.value : null;

            if (mediaFiles.length === 1) {
                const media = mediaFiles[0];
                
                if (media.backup_message_id && backupChannel) {
                    await ctx.telegram.copyMessage(ctx.chat.id, backupChannel, media.backup_message_id, {
                        caption: caption,
                        reply_markup: keyboard
                    });
                } else {
                    if (media.file_type === 'photo') {
                        await ctx.replyWithPhoto(media.telegram_file_id, { caption, reply_markup: keyboard });
                    } else if (media.file_type === 'video') {
                        await ctx.replyWithVideo(media.telegram_file_id, { caption, reply_markup: keyboard });
                    }
                }
            } else {
                const mediaGroup = mediaFiles.map((m, i) => ({
                    type: m.file_type === 'photo' ? 'photo' : 'video',
                    media: m.telegram_file_id,
                    caption: i === 0 ? caption : ''
                }));
                await ctx.replyWithMediaGroup(mediaGroup);
                await ctx.reply('Pilih jumlah donasi:', { reply_markup: keyboard });
            }
        }
    } catch (error) {
        console.error('[handleStart] Uncaught error:', error);
        try { ctx.reply('Terjadi kesalahan. Silakan coba lagi.'); } catch (_) {}
    }
};

/**
 * Handle Saldo Command
 */
const handleSaldo = async (ctx) => {
    const balance = await wallet.getBalance(ctx.from.id);
    const message = `💼 <b>INFORMASI SALDO ANDA</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `💰 Saldo Tersedia: <b>Rp ${new Intl.NumberFormat('id-ID').format(balance)}</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `💡 Gunakan saldo ini untuk sawer kreator favoritmu!\n` +
                    `👉 Ketik /topup untuk isi saldo.`;
    await ctx.replyWithHTML(message);
};

/**
 * Handle Topup Command
 */
const handleTopup = async (ctx) => {
    const admins = await db('admins').where('is_active', 1).whereIn('role', ['super_admin', 'finance']);
    const keyboard = {
        inline_keyboard: admins.filter(a => a.telegram_username).map((a, i) => ([
            { text: `👨‍💼 Contact Admin ${i + 1}`, url: `https://t.me/${a.telegram_username.replace('@', '')}` }
        ]))
    };

    if (keyboard.inline_keyboard.length === 0) {
        keyboard.inline_keyboard.push([{ text: '👨‍💼 Contact Admin', url: 'https://t.me/fernathan' }]);
    }

    const message = `💳 <b>TOPUP SALDO</b>\n\n` +
                    `Kirim bukti transfer beserta nominal ke admin.\n` +
                    `Admin akan memverifikasi dan menambah saldo Anda.\n\n` +
                    `💰 Minimal topup: <b>Rp 10.000</b>`;
    
    await ctx.replyWithHTML(message, { reply_markup: keyboard });
};

/**
 * Handle Callback Queries (Donations)
 */
const handleCallbackQuery = async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('sawer_')) {
        const parts = data.split('_');
        const amount = parseInt(parts[1]);
        const shortId = parts[2];
        const donorId = ctx.from.id;

        try {
            const content = await db('contents').where('short_id', shortId).first();
            if (!content) return ctx.answerCbQuery('Konten tidak ditemukan.', { show_alert: true });

            if (content.user_id === donorId) {
                return ctx.answerCbQuery('Anda tidak bisa menyawer konten sendiri.', { show_alert: true });
            }

            await db.transaction(async (trx) => {
                // 1. Deduct from donor
                await wallet.deductBalance(donorId, amount, `Sawer konten #${shortId}`);
                
                // 2. Add to creator
                await wallet.addBalance(content.user_id, amount, `Terima sawer dari @${ctx.from.username || donorId}`);

                // 3. Update content stats
                await trx('contents').where('id', content.id).update({
                    total_donations: db.raw('total_donations + ?', [amount]),
                    donation_count: db.raw('donation_count + 1')
                });

                // 4. Record transaction in main table (wallet service already records it, but we can add meta)
            });

            await ctx.answerCbQuery(`✅ Berhasil menyawer Rp ${new Intl.NumberFormat('id-ID').format(amount)}!`, { show_alert: true });
            
            // Notify Creator
            await notifications.notifyCreatorDonation(content.user_id, amount, shortId, ctx.from.first_name, '');

        } catch (error) {
            ctx.answerCbQuery(`❌ Gagal: ${error.message}`, { show_alert: true });
        }
    }
};

/**
 * Handle incoming media
 */
const handleMedia = async (ctx, botData) => {
  const telegramId = ctx.from.id;
  const mediaInfo = extractMediaInfo(ctx);
  if (!mediaInfo) return;

  try {
    // 1. Get/Create User
    let user = await db('users').where('telegram_id', telegramId).first();
    if (!user) {
      await db('users').insert({
        telegram_id: telegramId,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        username: ctx.from.username,
        language_code: ctx.from.language_code || 'id'
      });
    }

    // 2. Draft Session Logic
    let content = await db('contents')
      .where('user_id', telegramId)
      .where('status', 'draft')
      .orderBy('id', 'desc')
      .first();

    let shortId;
    if (!content) {
      shortId = generateShortId();
      const [newContentId] = await db('contents').insert({
        bot_id: botData.bot_id,
        user_id: telegramId,
        short_id: shortId,
        caption: mediaInfo.caption || '',
        status: 'draft'
      });
      content = { id: newContentId, short_id: shortId };
    } else {
      shortId = content.short_id;
    }

    // 3. Save media file
    const [mediaId] = await db('media_files').insert({
      content_id: content.id,
      telegram_file_id: mediaInfo.file_id,
      file_unique_id: mediaInfo.file_unique_id,
      thumb_file_id: mediaInfo.thumb_file_id,
      file_type: mediaInfo.type
    });

    // 4. Forward to backup channel (Save message ID for cross-bot access)
    notifications.forwardToBackup(mediaInfo, user, shortId, mediaId);

    // 5. Debounce Logic (Wait 5 seconds of silence)
    if (debounceTimers.has(telegramId)) {
      clearTimeout(debounceTimers.get(telegramId));
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(telegramId);
      const mediaCount = await db('media_files').where('content_id', content.id).count('id as total').first();

      const message = `📸 <b>Media Berhasil Diunggah!</b>\n\n` +
                      `🆔 Content ID: #${shortId}\n` +
                      `📎 Total Media: ${mediaCount.total} file\n` +
                      `⚠️ <b>Status: Draft</b>\n\n` +
                      `Silakan buka WebApp untuk melengkapi caption dan konfirmasi.`;

      const keyboard = {
        inline_keyboard: [[
            { text: '⚙️ Lengkapi & Konfirmasi', url: `https://t.me/${botData.username}/webapp?startapp=content_${shortId}` }
        ]]
      };

      await ctx.replyWithHTML(message, { reply_markup: keyboard });
    }, 5000);

    debounceTimers.set(telegramId, timer);
  } catch (error) {
    console.error('Error in handleMedia:', error);
    await ctx.reply('❌ Terjadi kesalahan.');
  }
};

module.exports = {
  handleMedia,
  handleStart,
  handleSaldo,
  handleTopup,
  handleCallbackQuery
};
