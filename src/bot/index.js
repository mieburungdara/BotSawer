const { handleMedia, handleStart, handleSaldo, handleTopup, handleCallbackQuery } = require('./handlers');

const setupBot = (bot, botData) => {
  // Start command (handles Deep Links)
  bot.start((ctx) => handleStart(ctx, botData));

  // Saldo command
  bot.command('saldo', handleSaldo);

  // Topup command
  bot.command('topup', handleTopup);

  // Help command
  bot.help((ctx) => {
    const message = `🤖 <b>Bantuan Bot Sawer</b>\n\n` +
                    `📋 Perintah yang tersedia:\n` +
                    `/start - Mulai bot\n` +
                    `/saldo - Cek saldo Anda\n` +
                    `/topup - Cara isi saldo\n` +
                    `/help - Bantuan ini\n\n` +
                    `💡 Kirim foto/video untuk posting konten.\n` +
                    `💸 Klik tombol "Sawer" di channel untuk donasi.`;
    ctx.replyWithHTML(message);
  });

  // Handle Callback Queries (Donations)
  bot.on('callback_query', handleCallbackQuery);

  // Handle Incoming Media
  bot.on(['photo', 'video', 'document'], (ctx) => handleMedia(ctx, botData));
};

module.exports = { setupBot };
