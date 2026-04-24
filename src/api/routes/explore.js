const express = require('express');
const router = express.Router();
const creator = require('../../services/creator');
const auth = require('../../services/auth');

/**
 * Explore API
 */
router.post('/explore.php', async (req, res) => {
  try {
    // Authentication is optional for explore, but we use it if available for context
    let user = null;
    try {
        user = await auth.authenticate(req.body);
    } catch (e) {}

    const { action, query, offset } = req.body;

    // 1. GET ALL CREATORS
    if (action === 'get_creators') {
      const list = await creator.getAllCreators(20, offset || 0);
      return res.json({ success: true, data: list });
    }

    // 2. SEARCH CREATORS
    if (action === 'search_creators') {
        const list = await creator.searchCreators(query || '', 20);
        return res.json({ success: true, data: list });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
