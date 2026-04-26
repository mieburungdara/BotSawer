const db = require('../src/services/database');

async function migrate() {
  console.log('Updating transactions table type enum...');
  try {
    await db.raw("ALTER TABLE transactions MODIFY COLUMN type ENUM('deposit', 'withdraw', 'donation', 'commission', 'refund', 'donation_sent', 'subscription') NOT NULL");
    console.log('Enum updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
