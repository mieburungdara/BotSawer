const db = require('../src/services/database');

async function migrate() {
    console.log('Starting migration: Add Social Links to Users...');
    try {
        const hasInstagram = await db.schema.hasColumn('users', 'instagram_url');
        const hasFacebook = await db.schema.hasColumn('users', 'facebook_url');
        
        await db.schema.alterTable('users', table => {
            if (!hasInstagram) {
                table.string('instagram_url').nullable();
                table.string('tiktok_url').nullable();
                table.string('portfolio_url').nullable();
                console.log('Added instagram_url, tiktok_url, and portfolio_url to users table.');
            }
            if (!hasFacebook) {
                table.string('facebook_url').nullable();
                console.log('Added facebook_url to users table.');
            }
        });
        
        console.log('Migration complete.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

migrate();
