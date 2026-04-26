const db = require('../src/services/database');

async function seed() {
    console.log('Seeding dummy ad...');
    try {
        await db('ads').insert({
            sponsor_name: 'Vesper Premium',
            content: 'Upgrade to Vesper Premium today and unlock exclusive creator tools, advanced analytics, and zero platform fees! 🚀',
            image_url: 'https://ui-avatars.com/api/?name=Premium&background=FFD700&color=000',
            action_url: 'https://t.me/Mieburungdara',
            is_active: 1
        });
        console.log('Dummy ad inserted successfully.');
    } catch (e) {
        console.error('Seeding failed:', e);
    } finally {
        await db.destroy();
    }
}

seed();
