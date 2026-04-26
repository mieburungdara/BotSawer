const db = require('../src/services/database');

async function migrate() {
    console.log('Starting migration: Ads Table...');
    try {
        const hasTable = await db.schema.hasTable('ads');
        if (!hasTable) {
            await db.schema.createTable('ads', table => {
                table.increments('id').primary();
                table.string('sponsor_name').notNullable();
                table.text('content').notNullable();
                table.text('image_url').nullable();
                table.string('action_url').nullable();
                table.integer('is_active').defaultTo(1);
                table.timestamp('created_at').defaultTo(db.fn.now());
            });
            console.log('Created ads table.');
        } else {
            console.log('Table ads already exists.');
        }
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

migrate();
