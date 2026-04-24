const express = require('express');
const router = express.Router();
const creator = require('../../services/creator');
const auth = require('../../services/auth');
const db = require('../../services/database');

/**
 * Profile API
 */
router.post('/profile.php', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { action, profile_data } = req.body;

    // 1. GET PROFILE
    if (action === 'get') {
      const stats = await creator.getStats(user.telegram_id);
      return res.json({ 
        success: true, 
        data: {
          ...user,
          stats
        } 
      });
    }

    // 2. UPDATE PROFILE
    if (action === 'update') {
        const success = await creator.updateProfile(user.telegram_id, profile_data || {});
        return res.json({ success: true, data: { success } });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
