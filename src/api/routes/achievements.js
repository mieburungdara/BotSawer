const express = require('express');
const router = express.Router();
const auth = require('../../services/auth');
const db = require('../../services/database');

/**
 * Achievements API
 */
router.post('/achievements.php', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const telegramId = user.telegram_id;

    // 1. Calculate Metrics
    const donationStats = await db('transactions')
        .where('user_id', telegramId) // Note: in your PHP it was from_user_id, check your schema!
        .where('type', 'donation')
        .where('status', 'success')
        .select(db.raw('COUNT(id) as count, COALESCE(SUM(amount), 0) as total'))
        .first();

    const contentCount = await db('contents')
        .where('user_id', telegramId)
        .whereNot('status', 'deleted')
        .count('id as total')
        .first();

    const earnings = await db('transactions')
        .where('user_id', telegramId)
        .where('type', 'donation')
        .where('status', 'success')
        .sum('amount as total')
        .first();

    const levels = {
        donatur: {
            category: 'Dermawan',
            description: 'Banyaknya saweran yang kamu kirim',
            icon: 'heart',
            tiers: [
                { label: 'Bronze', value: 1 },
                { label: 'Silver', value: 10 },
                { label: 'Gold', value: 50 },
                { label: 'Platinum', value: 100 }
            ],
            current: parseInt(donationStats.count || 0)
        },
        sultan: {
            category: 'Sultan',
            description: 'Total Rupiah yang kamu sawerkan',
            icon: 'coins',
            tiers: [
                { label: 'Bronze', value: 10000 },
                { label: 'Silver', value: 100000 },
                { label: 'Gold', value: 1000000 },
                { label: 'Platinum', value: 10000000 }
            ],
            current: parseFloat(donationStats.total || 0)
        },
        kreator: {
            category: 'Kreator',
            description: 'Banyaknya konten yang kamu posting',
            icon: 'image',
            tiers: [
                { label: 'Bronze', value: 1 },
                { label: 'Silver', value: 10 },
                { label: 'Gold', value: 50 },
                { label: 'Platinum', value: 200 }
            ],
            current: parseInt(contentCount.total || 0)
        },
        earning: {
            category: 'Golden Star',
            description: 'Total penghasilan dari saweran',
            icon: 'star',
            tiers: [
                { label: 'Bronze', value: 100000 },
                { label: 'Silver', value: 1000000 },
                { label: 'Gold', value: 5000000 },
                { label: 'Platinum', value: 25000000 }
            ],
            current: parseFloat(earnings.total || 0)
        }
    };

    const categories = Object.keys(levels).map(key => {
        const group = levels[key];
        return {
            id: key,
            title: group.category,
            description: group.description,
            icon: group.icon,
            current: group.current,
            tiers: group.tiers.map(tier => ({
                ...tier,
                unlocked: group.current >= tier.value
            }))
        };
    });

    const special = [
        {
            id: 'early_bird',
            title: 'Early Bird',
            description: 'Salah satu dari 1.000 pengguna pertama',
            icon: 'bird',
            unlocked: parseInt(user.id) <= 1000,
            type: 'legacy'
        }
    ];

    return res.json({
        success: true,
        data: { categories, special }
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
