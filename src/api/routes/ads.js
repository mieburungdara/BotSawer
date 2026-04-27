const express = require('express');
const router = express.Router();
const db = require('../../services/database');

/**
 * Ads API
 */
router.get('/ads/random', async (req, res) => {
  try {
    // Get a random active ad
    // For SQLite/MySQL compatibility, we fetch active ads and pick one randomly in JS
    // If the table grows large, `ORDER BY RAND()` (MySQL) or `ORDER BY RANDOM()` (SQLite) should be used cautiously.
    const activeAds = await db('ads')
        .where('is_active', 1)
        .where(function() {
            this.whereNull('expires_at').orWhere('expires_at', '>', db.fn.now());
        });
    
    if (!activeAds || activeAds.length === 0) {
        return res.json({ success: true, data: null });
    }

    const randomAd = activeAds[Math.floor(Math.random() * activeAds.length)];
    
    // Format to match content schema roughly
    const formattedAd = {
        short_id: `ad_${randomAd.id}_${Date.now()}`, // pseudo id
        caption: randomAd.content,
        created_at: randomAd.created_at,
        display_name: randomAd.sponsor_name,
        username: 'sponsored',
        photo_url: randomAd.image_url || 'https://ui-avatars.com/api/?name=Ad&background=random',
        action_url: randomAd.action_url,
        is_verified: true, // blue tick for sponsor
        is_sponsored: true // flag for frontend
    };

    return res.json({ success: true, data: formattedAd });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
