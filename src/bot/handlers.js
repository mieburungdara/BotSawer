const db = require('../services/database');
const { extractMediaInfo, generateShortId } = require('./utils');

// Store debounce timers in memory
const debounceTimers = new Map();

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
      const [newUserId] = await db('users').insert({
        telegram_id: telegramId,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        username: ctx.from.username,
        language_code: ctx.from.language_code || 'id'
      });
      user = { telegram_id: telegramId };
    }

    // 2. Draft Session Logic
    // Find latest DRAFT for this user
    let content = await db('contents')
      .where('user_id', user.telegram_id)
      .where('status', 'draft')
      .orderBy('id', 'desc')
      .first();

    let shortId;
    if (!content) {
      shortId = generateShortId();
      const [newContentId] = await db('contents').insert({
        bot_id: botData.bot_id,
        user_id: user.telegram_id,
        short_id: shortId,
        caption: mediaInfo.caption || '',
        status: 'draft'
      });
      content = { id: newContentId, short_id: shortId };
    } else {
      shortId = content.short_id;
    }

    // 3. Save media file
    await db('media_files').insert({
      content_id: content.id,
      telegram_file_id: mediaInfo.file_id,
      file_unique_id: mediaInfo.file_unique_id,
      thumb_file_id: mediaInfo.thumb_file_id,
      file_type: mediaInfo.type
    });

    // 4. Debounce Logic (Wait 5 seconds of silence)
    if (debounceTimers.has(user.telegram_id)) {
      clearTimeout(debounceTimers.get(user.telegram_id));
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(user.telegram_id);
      
      // Get current media count for this content
      const mediaCount = await db('media_files').where('content_id', content.id).count('id as total').first();

      const message = `📸 Media Berhasil Diunggah!\n\n` +
                      `🆔 Content ID: #${shortId}\n` +
                      `📎 Total Media: ${mediaCount.total} file\n` +
                      `⚠️ *Status: Draft*\n\n` +
                      `Silakan klik tombol di bawah untuk melengkapi caption dan mengonfirmasi agar konten masuk ke antrean posting.`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '⚙️ Lengkapi & Konfirmasi', url: `https://t.me/${botData.username}/webapp?startapp=content_${shortId}` }
          ]
        ]
      };

      await ctx.replyWithMarkdown(message, { reply_markup: keyboard });
    }, 5000); // 5 seconds debounce

    debounceTimers.set(user.telegram_id, timer);

  } catch (error) {
    console.error('Error in handleMedia:', error);
    await ctx.reply('❌ Terjadi kesalahan saat menyimpan media.');
  }
};

module.exports = {
  handleMedia
};
