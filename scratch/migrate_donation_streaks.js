const db = require('../src/services/database');

async function migrate() {
  console.log('Adding donation_streak column to users table...');
  try {
    const hasColumn = await db.schema.hasColumn('users', 'donation_streak');
    if (!hasColumn) {
      await db.schema.table('users', (table) => {
        table.integer('donation_streak').defaultTo(0).after('is_verified');
        table.date('last_donation_date').nullable().after('donation_streak');
      });
      console.log('Columns donation_streak and last_donation_date added to users table.');
    } else {
      console.log('Columns already exist.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
