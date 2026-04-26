const db = require('../src/services/database');

async function migrate() {
  console.log('Adding privacy column to contents table...');
  try {
    const hasColumn = await db.schema.hasColumn('contents', 'privacy');
    if (!hasColumn) {
      await db.schema.table('contents', (table) => {
        table.enum('privacy', ['public', 'followers_only']).defaultTo('public').after('status');
      });
      console.log('Column privacy added to contents table.');
    } else {
      console.log('Column privacy already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
