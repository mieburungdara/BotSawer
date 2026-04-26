const db = require('../src/services/database');

async function migrate() {
    console.log('Starting migration: Feedback Table...');
    try {
        const hasTable = await db.schema.hasTable('feedbacks');
        if (!hasTable) {
            await db.schema.createTable('feedbacks', table => {
                table.increments('id').primary();
                table.string('user_id').notNullable();
                table.string('type').notNullable(); // bug, suggestion, other
                table.text('content').notNullable();
                table.text('screenshot_url').nullable();
                table.integer('is_resolved').defaultTo(0);
                table.timestamp('created_at').defaultTo(db.fn.now());
            });
            console.log('Created feedbacks table.');
        } else {
            console.log('Table feedbacks already exists.');
        }
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

migrate();
