const db = require('../src/services/database');

async function migrate() {
    console.log('Starting migration: Add Social Links to Users...');
    try {
        const hasInstagram = await db.schema.hasColumn('users', 'instagram_url');
        
        await db.schema.alterTable('users', table => {
            if (!hasInstagram) {
                table.string('instagram_url').nullable();
                table.string('tiktok_url').nullable();
                table.string('portfolio_url').nullable();
                console.log('Added instagram_url, tiktok_url, and portfolio_url to users table.');
            } else {
                console.log('Social link columns already exist.');
            }
        });
        
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
