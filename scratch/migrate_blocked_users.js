const db = require('../src/services/database');

async function migrate() {
  console.log('Starting migration: Blocked Users Table...\n');

  const hasTable = await db.schema.hasTable('blocked_users');
  if (!hasTable) {
    console.log('Creating blocked_users table...');
    await db.schema.createTable('blocked_users', (table) => {
      table.increments('id').primary();
      table.string('blocker_id', 20).notNullable(); // telegram_id yang memblokir
      table.string('blocked_id', 20).notNullable(); // telegram_id yang diblokir
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.unique(['blocker_id', 'blocked_id']);
      table.index(['blocker_id']);
      table.index(['blocked_id']);
    });
    console.log('✅ blocked_users created.');
  } else {
    console.log('ℹ️  blocked_users already exists, skipping.');
  }

  console.log('\nMigration complete.');
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err.message);
  })
  .finally(() => {
    db.destroy();
  });
