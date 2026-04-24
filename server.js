const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./src/services/database');
const { Telegraf } = require('telegraf');
const { setupBot } = require('./src/bot');
const scheduler = require('./src/services/scheduler');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const domain = process.env.WEBHOOK_DOMAIN; // e.g. https://yourdomain.com

// Middleware
app.use(morgan('dev'));
app.use(express.json());

// Static Files (WebApp)
app.use(express.static(path.join(__dirname, 'public/webapp')));

// API Routes
const contentRoutes = require('./src/api/routes/content');
const creatorRoutes = require('./src/api/routes/creator');
const walletRoutes = require('./src/api/routes/wallet');
const exploreRoutes = require('./src/api/routes/explore');
const profileRoutes = require('./src/api/routes/profile');
const adminRoutes = require('./src/api/routes/admin');
const achievementsRoutes = require('./src/api/routes/achievements');
const miscRoutes = require('./src/api/routes/misc');

app.use('/api', contentRoutes);
app.use('/api', creatorRoutes);
app.use('/api', walletRoutes);
app.use('/api', exploreRoutes);
app.use('/api', profileRoutes);
app.use('/api', adminRoutes);
app.use('/api', achievementsRoutes);
app.use('/api', miscRoutes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', project: 'VesperApp' }));

// Bot Initialization
const initBots = async () => {
  const bots = await db('bots').where('is_active', 1);
  console.log(`Initializing ${bots.length} bots...`);
  
  for (const botData of bots) {
    const bot = new Telegraf(botData.token);
    setupBot(bot, botData);
    
    if (domain && process.env.APP_ENV === 'production') {
      // WEBHOOK MODE (Production)
      const webhookPath = `/webhook/${botData.token}`;
      app.use(bot.webhookCallback(webhookPath));
      
      bot.telegram.setWebhook(`${domain}${webhookPath}`).then(() => {
        console.log(`Webhook set for ${botData.username} at ${domain}${webhookPath}`);
      }).catch(err => {
        console.error(`Failed to set webhook for ${botData.username}:`, err);
      });
    } else {
      // POLLING MODE (Development)
      bot.launch().then(() => {
        console.log(`Bot ${botData.username} is running (Polling).`);
      }).catch(err => {
        console.error(`Failed to launch bot ${botData.username}:`, err);
      });
    }

    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }
};

app.listen(port, () => {
  console.log(`VesperApp API listening at http://localhost:${port}`);
  initBots().catch(console.error);
  scheduler.start().catch(console.error);
});
