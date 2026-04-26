const express = require('express');
const router = express.Router();
const creator = require('../../services/creator');
const auth = require('../../services/auth');

/**
 * Feed API
 */
router.post('/feed', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { offset } = req.body;

    const result = await creator.getFollowedContents(user.telegram_id, 20, offset || 0);
    
    // Mark as owner
    result.list = result.list.map(item => ({
        ...item,
        is_owner: parseInt(item.creator_id) === parseInt(user.telegram_id)
    }));

    return res.json({ success: true, data: result });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
