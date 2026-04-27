const db = require('../src/services/database');

async function migrate() {
    console.log('Starting migration: Adding expiration to Ads Table...');
    try {
        const hasColumn = await db.schema.hasColumn('ads', 'expires_at');
        if (!hasColumn) {
            await db.schema.table('ads', table => {
                table.timestamp('expires_at').nullable();
            });
            console.log('Added expires_at column to ads table.');
        } else {
            console.log('Column expires_at already exists in ads table.');
        }
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

migrate();
