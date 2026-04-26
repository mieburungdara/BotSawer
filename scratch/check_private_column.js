const db = require('../src/services/database');

async function migrate() {
    console.log('Starting migration: Add Private Mode to Users...');
    try {
        const hasPrivate = await db.schema.hasColumn('users', 'is_private');
        
        if (!hasPrivate) {
            await db.schema.alterTable('users', table => {
                table.integer('is_private').defaultTo(0);
            });
            console.log('Added is_private column to users table.');
        } else {
            console.log('Column is_private already exists.');
        }
        
        console.log('Migration complete.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

migrate();
