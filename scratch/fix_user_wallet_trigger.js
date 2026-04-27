/**
 * Diagnostic & Fix Script: users table trigger conflict with wallets FK
 *
 * Problem: ER_NO_REFERENCED_ROW_2 when inserting into `users`
 * Cause:   A BEFORE INSERT trigger on `users` tries to insert into `wallets`
 *          before the user row exists, causing FK violation.
 *
 * Fix:     Drop problematic trigger(s) on `users`.
 *          App code (auth.js + handlers.js) handles wallet creation AFTER user insert.
 */

require('dotenv').config();
const db = require('../src/services/database');

async function run() {
  console.log('🔍 Checking triggers on users table...\n');

  // List all triggers on users table
  const triggers = await db.raw(`
    SELECT TRIGGER_NAME, EVENT_MANIPULATION, ACTION_TIMING, ACTION_STATEMENT
    FROM information_schema.TRIGGERS
    WHERE EVENT_OBJECT_TABLE = 'users'
      AND TRIGGER_SCHEMA = DATABASE()
  `);

  const rows = triggers[0];
  if (rows.length === 0) {
    console.log('✅ No triggers found on users table.');
    console.log('   The issue might be something else. Check wallets table triggers:\n');

    const walletTriggers = await db.raw(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, ACTION_TIMING, ACTION_STATEMENT
      FROM information_schema.TRIGGERS
      WHERE EVENT_OBJECT_TABLE = 'wallets'
        AND TRIGGER_SCHEMA = DATABASE()
    `);
    const walletRows = walletTriggers[0];
    if (walletRows.length === 0) {
      console.log('  No triggers on wallets table either.');
    } else {
      walletRows.forEach(t => {
        console.log(`  [${t.ACTION_TIMING} ${t.EVENT_MANIPULATION}] ${t.TRIGGER_NAME}`);
        console.log(`  Statement: ${t.ACTION_STATEMENT.substring(0, 200)}\n`);
      });
    }
  } else {
    console.log(`Found ${rows.length} trigger(s) on users table:\n`);
    rows.forEach(t => {
      console.log(`  [${t.ACTION_TIMING} ${t.EVENT_MANIPULATION}] ${t.TRIGGER_NAME}`);
      console.log(`  Statement: ${t.ACTION_STATEMENT.substring(0, 300)}\n`);
    });

    // Drop BEFORE INSERT triggers that reference wallets
    for (const t of rows) {
      const isProblematic = 
        t.ACTION_TIMING === 'BEFORE' && 
        t.EVENT_MANIPULATION === 'INSERT' &&
        t.ACTION_STATEMENT.toLowerCase().includes('wallets');

      if (isProblematic) {
        console.log(`🗑️  Dropping problematic trigger: ${t.TRIGGER_NAME}`);
        await db.raw(`DROP TRIGGER IF EXISTS \`${t.TRIGGER_NAME}\``);
        console.log(`   ✅ Dropped.\n`);
      }
    }

    // Also drop AFTER INSERT triggers if they insert wallet (app handles it now)
    for (const t of rows) {
      const isAfterInsertWallet =
        t.ACTION_TIMING === 'AFTER' &&
        t.EVENT_MANIPULATION === 'INSERT' &&
        t.ACTION_STATEMENT.toLowerCase().includes('wallets');

      if (isAfterInsertWallet) {
        console.log(`🗑️  Dropping AFTER INSERT wallet trigger: ${t.TRIGGER_NAME}`);
        await db.raw(`DROP TRIGGER IF EXISTS \`${t.TRIGGER_NAME}\``);
        console.log(`   ✅ Dropped. (App code now handles wallet creation)\n`);
      }
    }
  }

  // Verify no orphaned users (users without wallets) and fix them
  console.log('🔍 Checking for users without wallets...');
  const orphaned = await db('users as u')
    .leftJoin('wallets as w', 'u.telegram_id', 'w.user_id')
    .whereNull('w.id')
    .select('u.telegram_id', 'u.first_name', 'u.username');

  if (orphaned.length === 0) {
    console.log('✅ All users have wallets.\n');
  } else {
    console.log(`⚠️  Found ${orphaned.length} user(s) without wallets. Creating wallets...\n`);
    for (const u of orphaned) {
      try {
        await db('wallets').insert({ user_id: u.telegram_id, balance: 0 });
        console.log(`   ✅ Created wallet for user ${u.first_name} (@${u.username || 'n/a'}) [${u.telegram_id}]`);
      } catch (err) {
        console.log(`   ❌ Failed for user ${u.telegram_id}: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Done. Bot should now handle /start without FK errors.');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
