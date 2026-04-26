const db = require('../src/services/database');

async function migrate() {
  console.log('Starting migration: Direct Message Tables...\n');

  // Tabel 1: direct_conversations
  const hasConversations = await db.schema.hasTable('direct_conversations');
  if (!hasConversations) {
    console.log('Creating direct_conversations table...');
    await db.schema.createTable('direct_conversations', (table) => {
      table.increments('id').primary();
      table.string('user1_id', 20).notNullable(); // telegram_id user (lebih kecil secara string sort)
      table.string('user2_id', 20).notNullable(); // telegram_id user (lebih besar)
      table.timestamp('last_message_at').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.unique(['user1_id', 'user2_id']);
      table.index(['user1_id']);
      table.index(['user2_id']);
    });
    console.log('✅ direct_conversations created.');
  } else {
    console.log('ℹ️  direct_conversations already exists, skipping.');
  }

  // Tabel 2: direct_messages
  const hasMessages = await db.schema.hasTable('direct_messages');
  if (!hasMessages) {
    console.log('Creating direct_messages table...');
    await db.schema.createTable('direct_messages', (table) => {
      table.increments('id').primary();
      table.integer('conversation_id').unsigned().notNullable()
        .references('id').inTable('direct_conversations').onDelete('CASCADE');
      table.string('sender_id', 20).notNullable(); // telegram_id pengirim
      table.text('content').notNullable();
      table.boolean('is_read').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.index(['conversation_id']);
      table.index(['sender_id']);
      table.index(['is_read']);
    });
    console.log('✅ direct_messages created.');
  } else {
    console.log('ℹ️  direct_messages already exists, skipping.');
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
