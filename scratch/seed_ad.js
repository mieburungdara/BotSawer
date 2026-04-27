const db = require('../src/services/database');

async function seed() {
    console.log('Seeding ads pool...');
    try {
        // Clear existing ads to start fresh (optional, but good for clean seeding)
        // await db('ads').del();

        const ads = [
            {
                sponsor_name: 'Vesper Premium',
                content: 'Upgrade to Vesper Premium today and unlock exclusive creator tools, advanced analytics, and zero platform fees! 🚀',
                image_url: 'https://ui-avatars.com/api/?name=Premium&background=FFD700&color=000',
                action_url: 'https://t.me/Mieburungdara',
                is_active: 1,
                // Expires in 7 days
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            },
            {
                sponsor_name: 'Creator Coffee',
                content: 'Support your favorite creators with a virtual coffee. Simple, fast, and heartfelt. ☕',
                image_url: 'https://ui-avatars.com/api/?name=Coffee&background=8B4513&color=fff',
                action_url: 'https://t.me/Mieburungdara',
                is_active: 1,
                // Expires in 1 day
                expires_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
            },
            {
                sponsor_name: 'Vesper Analytics',
                content: 'Deep dive into your audience metrics. Know who supports you and why. 📊',
                image_url: 'https://ui-avatars.com/api/?name=Stats&background=0000FF&color=fff',
                action_url: 'https://t.me/Mieburungdara',
                is_active: 1,
                // Already expired for testing
                expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ];

        for (const ad of ads) {
            await db('ads').insert(ad);
            console.log(`Inserted ad: ${ad.sponsor_name}`);
        }
        
        console.log('Seeding completed successfully.');
    } catch (e) {
        console.error('Seeding failed:', e);
    } finally {
        await db.destroy();
    }
}

seed();
