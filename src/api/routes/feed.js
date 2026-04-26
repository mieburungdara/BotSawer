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

    const list = await creator.getFollowedContents(user.telegram_id, 20, offset || 0);
    return res.json({ success: true, data: list });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
