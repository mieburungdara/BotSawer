/**
 * Activate all bots in database
 * Run: node scratch/activate_bots.js
 */
require('dotenv').config();
const db = require('../src/services/database');

async function run() {
  const bots = await db('bots').select('id', 'username', 'is_active');
  console.log(`Found ${bots.length} bot(s):\n`);

  for (const bot of bots) {
    console.log(`  @${bot.username || '(no username)'} — is_active: ${bot.is_active}`);
    if (!bot.is_active) {
      await db('bots').where('id', bot.id).update({ is_active: 1 });
      console.log(`  → ✅ Activated`);
    } else {
      console.log(`  → Already active`);
    }
  }

  console.log('\n✅ Done. Deploy/restart server to load bots via polling.');
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
