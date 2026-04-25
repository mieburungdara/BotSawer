const db = require('../src/services/database');

async function migrate() {
  console.log('Migrating users table to add wallet fields...');
  try {
    const hasEwalletType = await db.schema.hasColumn('users', 'ewallet_type');
    if (!hasEwalletType) {
      await db.schema.table('users', (table) => {
        table.string('ewallet_type', 50).nullable();
        table.string('ewallet_number', 50).nullable();
        table.string('ewallet_name', 255).nullable();
      });
      console.log('Added ewallet_type, ewallet_number, and ewallet_name columns.');
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
