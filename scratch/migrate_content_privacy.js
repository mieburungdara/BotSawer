const db = require('../src/services/database');

async function migrate() {
  console.log('Updating privacy column in contents table...');
  try {
    const hasColumn = await db.schema.hasColumn('contents', 'privacy');
    if (!hasColumn) {
      await db.schema.table('contents', (table) => {
        table.enum('privacy', ['public', 'followers_only', 'subscribers_only', 'followed_only']).defaultTo('public').after('status');
      });
      console.log('Column privacy added to contents table.');
    } else {
      // Update existing enum if possible (MySQL specific)
      await db.raw("ALTER TABLE contents MODIFY COLUMN privacy ENUM('public', 'followers_only', 'subscribers_only', 'followed_only') DEFAULT 'public'");
      console.log('Column privacy enum updated.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
