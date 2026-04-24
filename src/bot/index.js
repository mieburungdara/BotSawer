const { handleMedia } = require('./handlers');

const setupBot = (bot, botData) => {
  // Start command
  bot.start((ctx) => {
    ctx.reply(`Halo ${ctx.from.first_name}! Selamat datang di ${botData.name}.\n\nKirimkan foto atau video untuk mulai menjual konten Anda.`);
  });

  // Handle Media
  bot.on(['photo', 'video', 'document'], (ctx) => handleMedia(ctx, botData));

  // Help command
  bot.help((ctx) => ctx.reply('Kirimkan foto atau video, lalu buka WebApp untuk melengkapi data konten.'));
};

module.exports = { setupBot };
