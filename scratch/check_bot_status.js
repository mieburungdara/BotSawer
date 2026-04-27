/**
 * Diagnostic Script: Check bot webhook status & polling readiness
 * Run: node scratch/check_bot_status.js
 */
require('dotenv').config();
const db = require('../src/services/database');
const axios = require('axios');

async function run() {
  console.log('🤖 Checking bot status in database...\n');

  const bots = await db('bots').select('*');
  if (bots.length === 0) {
    console.log('❌ No bots found in database! Add a bot first via Admin panel.');
    process.exit(1);
  }

  for (const bot of bots) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Bot: @${bot.username || '(no username)'} | Active: ${bot.is_active ? '✅' : '❌'}`);
    console.log(`Token: ${bot.token ? bot.token.substring(0, 10) + '...' : '(missing!)'}`);

    if (!bot.token) {
      console.log('❌ Bot has no token — skip');
      continue;
    }

    try {
      // 1. Check bot info from Telegram
      const meRes = await axios.get(`https://api.telegram.org/bot${bot.token}/getMe`);
      if (!meRes.data.ok) throw new Error('getMe failed');
      const me = meRes.data.result;
      console.log(`\n✅ Telegram confirmed: @${me.username} (id: ${me.id})`);
      
      // Update username in DB if different
      if (me.username !== bot.username) {
        await db('bots').where('id', bot.id).update({ username: me.username, name: me.first_name });
        console.log(`   ⚠️  Username updated in DB: ${bot.username} → ${me.username}`);
      }

      // 2. Check webhook status
      const whRes = await axios.get(`https://api.telegram.org/bot${bot.token}/getWebhookInfo`);
      const wh = whRes.data.result;
      
      console.log(`\n📡 Webhook Info:`);
      console.log(`   URL: ${wh.url || '(none)'}`);
      console.log(`   Pending updates: ${wh.pending_update_count}`);
      if (wh.last_error_message) {
        console.log(`   ⚠️  Last error: ${wh.last_error_message}`);
      }

      // 3. Fix: Delete webhook so polling can work
      if (wh.url) {
        console.log(`\n🗑️  Deleting webhook to enable polling...`);
        const delRes = await axios.post(`https://api.telegram.org/bot${bot.token}/deleteWebhook`, {
          drop_pending_updates: true
        });
        if (delRes.data.ok) {
          console.log(`   ✅ Webhook deleted. Polling will now work.`);
        } else {
          console.log(`   ❌ Failed to delete webhook: ${JSON.stringify(delRes.data)}`);
        }
      } else {
        console.log(`\n✅ No webhook registered. Polling is ready.`);
      }

      // 4. Test: Try to get updates
      const updRes = await axios.get(`https://api.telegram.org/bot${bot.token}/getUpdates?limit=1&timeout=0`);
      if (updRes.data.ok) {
        console.log(`\n✅ getUpdates works! Bot can receive messages via polling.`);
      }

    } catch (err) {
      const errMsg = err.response?.data?.description || err.message;
      console.log(`❌ Error: ${errMsg}`);
      if (errMsg.includes('Unauthorized')) {
        console.log(`   → Bot token is INVALID or revoked. Update it in the database.`);
      }
    }
  }

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Done. If webhook was deleted, restart PM2: pm2 restart server.js`);
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
