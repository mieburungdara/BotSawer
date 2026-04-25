const express = require('express');
const router = express.Router();
const follow = require('../../services/follow');
const auth = require('../../services/auth');

/**
 * Follow API
 */
router.post('/follow', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { action, targetId, limit, offset } = req.body;

    // 1. FOLLOW
    if (action === 'follow') {
      const result = await follow.follow(user.telegram_id, targetId);
      return res.json(result);
    }

    // 2. UNFOLLOW
    if (action === 'unfollow') {
      const result = await follow.unfollow(user.telegram_id, targetId);
      return res.json(result);
    }

    // 3. GET FOLLOWERS
    if (action === 'get_followers') {
      const result = await follow.getFollowers(targetId || user.telegram_id, limit || 20, offset || 0);
      return res.json({ success: true, data: result });
    }

    // 4. GET FOLLOWING
    if (action === 'get_following') {
      const result = await follow.getFollowing(targetId || user.telegram_id, limit || 20, offset || 0);
      return res.json({ success: true, data: result });
    }

    // 5. GET STATS
    if (action === 'get_stats') {
      const result = await follow.getFollowStats(targetId || user.telegram_id);
      return res.json({ success: true, data: result });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
