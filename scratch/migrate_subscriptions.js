const db = require('../src/services/database');

async function migrate() {
  console.log('Starting migration: Subscriptions...');
  try {
    // 1. Create Subscriptions Table
    const tableExists = await db.schema.hasTable('subscriptions');
    if (!tableExists) {
      await db.schema.createTable('subscriptions', (table) => {
        table.increments('id').primary();
        table.string('subscriber_uuid').notNullable(); // UUID of subscriber
        table.string('creator_uuid').notNullable();    // UUID of creator
        table.decimal('amount', 15, 2).notNullable();
        table.enum('status', ['active', 'cancelled', 'expired']).defaultTo('active');
        table.timestamp('next_billing_at').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.index(['subscriber_uuid', 'creator_uuid']);
        table.index('next_billing_at');
        table.index('status');
      });
      console.log('Table "subscriptions" created.');
    } else {
      console.log('Table "subscriptions" already exists.');
    }

    // 2. Add monthly_subscription_price to users table
    const columnExists = await db.schema.hasColumn('users', 'monthly_subscription_price');
    if (!columnExists) {
      await db.schema.table('users', (table) => {
        table.decimal('monthly_subscription_price', 15, 2).defaultTo(0);
      });
      console.log('Column "monthly_subscription_price" added to users table.');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
