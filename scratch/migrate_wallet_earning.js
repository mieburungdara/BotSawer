const db = require('../src/services/database');

async function migrate() {
  console.log('Adding total_earning column to wallets table...');
  try {
    const hasColumn = await db.schema.hasColumn('wallets', 'total_earning');
    if (!hasColumn) {
      await db.schema.table('wallets', (table) => {
        table.decimal('total_earning', 15, 2).defaultTo(0).after('total_withdraw');
      });
      console.log('Column total_earning added.');
    } else {
      console.log('Column already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
