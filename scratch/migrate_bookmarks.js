const db = require('../src/services/database');

async function migrate() {
    console.log('Starting migration: Bookmarks Table...');
    try {
        const hasTable = await db.schema.hasTable('bookmarks');
        if (!hasTable) {
            await db.schema.createTable('bookmarks', table => {
                table.increments('id').primary();
                table.string('user_id').notNullable(); // telegram_id
                table.integer('content_id').unsigned().notNullable();
                table.timestamp('created_at').defaultTo(db.fn.now());
                
                // Indexing for faster lookups
                table.index(['user_id', 'content_id']);
                
                // Foreign keys (optional but recommended if DB supports)
                // table.foreign('user_id').references('telegram_id').inTable('users').onDelete('CASCADE');
                // table.foreign('content_id').references('id').inTable('contents').onDelete('CASCADE');
            });
            console.log('Created bookmarks table.');
        } else {
            console.log('Table bookmarks already exists.');
        }
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

migrate();
