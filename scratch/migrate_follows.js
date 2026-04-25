const db = require('../src/services/database');

async function migrateFollows() {
    console.log('Creating follows table...');
    try {
        const hasTable = await db.schema.hasTable('follows');
        if (!hasTable) {
            await db.schema.createTable('follows', (table) => {
                table.increments('id').primary();
                table.string('follower_id').notNullable();
                table.string('followed_id').notNullable();
                table.timestamp('created_at').defaultTo(db.fn.now());
                
                table.index(['follower_id']);
                table.index(['followed_id']);
                table.unique(['follower_id', 'followed_id']);
            });
            console.log('Table follows created successfully.');
        } else {
            console.log('Table follows already exists.');
        }
    } catch (error) {
        console.error('Error creating follows table:', error);
    } finally {
        process.exit();
    }
}

migrateFollows();
