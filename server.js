const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./src/services/database');
const { Telegraf } = require('telegraf');
const { setupBot } = require('./src/bot');
const scheduler = require('./src/services/scheduler');
const logger = require('./src/services/logger');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const domain = process.env.WEBHOOK_DOMAIN; // e.g. https://yourdomain.com

// Middleware
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json());

// Logging Middleware (Debug cPanel paths)
app.use((req, res, next) => {
  logger.info(`[INCOMING] ${req.method} ${req.url} (Original: ${req.originalUrl})`);
  next();
});

// Static Files (WebApp) - Moved down to be handled by subfolder logic if needed
// app.use(express.static(path.join(__dirname, 'public/webapp')));

// API Routes Definition
const contentRoutes = require('./src/api/routes/content');
const creatorRoutes = require('./src/api/routes/creator');
const walletRoutes = require('./src/api/routes/wallet');
const exploreRoutes = require('./src/api/routes/explore');
const profileRoutes = require('./src/api/routes/profile');
const adminRoutes = require('./src/api/routes/admin');
const achievementsRoutes = require('./src/api/routes/achievements');
const withdrawalRoutes = require('./src/api/routes/withdrawal');
const followRoutes = require('./src/api/routes/follow');
const miscRoutes = require('./src/api/routes/misc');
const directMessageRoutes = require('./src/api/routes/direct_message');
const blockRoutes = require('./src/api/routes/block');

const apiRouter = express.Router();
apiRouter.use(contentRoutes);
apiRouter.use(creatorRoutes);
apiRouter.use(walletRoutes);
apiRouter.use(exploreRoutes);
apiRouter.use(profileRoutes);
apiRouter.use(adminRoutes);
apiRouter.use(achievementsRoutes);
apiRouter.use(withdrawalRoutes);
apiRouter.use(followRoutes);
apiRouter.use(directMessageRoutes);
apiRouter.use(blockRoutes);
apiRouter.use(miscRoutes); // miscRoutes has /dashboard, /ecosystem, /config

// Catch-all API 404 to return JSON instead of HTML
apiRouter.use((req, res) => {
  logger.warn(`[API 404] ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false, 
    message: `API endpoint not found: ${req.url}`,
    hint: 'Check if the route is defined without .php suffix'
  });
});

// Mount API Router to both possible paths
app.use('/api', apiRouter);
app.use('/vesper/api', apiRouter);

// Health Check (also at root and subfolder)
const healthHandler = (req, res) => res.json({ status: 'ok', project: 'VesperApp' });
app.get('/health', healthHandler);
app.get('/vesper/health', healthHandler);

// WebApp Serving Logic
app.get(['/', '/vesper', '/vesper/*', '/botsawer/public/webapp*'], (req, res) => {
  // If it's an API request, let the API router handle it (this is a fallback)
  if (req.url.startsWith('/api') || req.url.startsWith('/vesper/api')) return;
  
  const indexPath = path.join(__dirname, 'public/webapp/index.html');
  res.sendFile(indexPath);
});

// Static files (with subfolder support)
app.use('/vesper', express.static(path.join(__dirname, 'public/webapp')));
app.use(express.static(path.join(__dirname, 'public/webapp')));


// Bot Initialization
const initBots = async () => {
  const bots = await db('bots').where('is_active', 1);
  logger.info(`Initializing ${bots.length} bots...`);
  
  for (const botData of bots) {
    const bot = new Telegraf(botData.token);
    setupBot(bot, botData);
    
    if (domain && process.env.APP_ENV === 'production') {
      const webhookPath = `/webhook/${botData.token}`;
      app.use(bot.webhookCallback(webhookPath));
      logger.info(`[BOT] Webhook path registered: ${webhookPath}`);
    } else {
      logger.info(`[BOT] Starting Polling for ${botData.username}...`);
      bot.launch().catch(err => logger.error(`Polling error: ${err.message}`));
    }

    // Graceful stop
    process.once('SIGINT', () => { if (bot && bot.polling) bot.stop('SIGINT') });
    process.once('SIGTERM', () => { if (bot && bot.polling) bot.stop('SIGTERM') });
  }
};

app.listen(port, '0.0.0.0', () => {
  logger.info(`VesperApp API listening at http://localhost:${port}`);
  initBots().catch(err => logger.error(`Bot Init Error: ${err.message}`));
  scheduler.start().catch(err => logger.error(`Scheduler Error: ${err.message}`));
});
