const express = require('express');
const router = express.Router();
const creator = require('../../services/creator');
const auth = require('../../services/auth');

/**
 * Explore API
 */
router.post('/explore', async (req, res) => {
  try {
    // Authentication is optional for explore, but we use it if available for context
    let user = null;
    try {
        user = await auth.authenticate(req.body);
    } catch (e) {}

    const { action, query, offset } = req.body;

    // 1. GET ALL CREATORS (USER)
    if (action === 'get_creators') {
      const list = await creator.getAllCreators(20, offset || 0);
      return res.json({ success: true, data: list });
    }

    // 2. SEARCH CREATORS (USER)
    if (action === 'search_creators') {
        const list = await creator.searchCreators(query || '', 20, offset || 0);
        return res.json({ success: true, data: list });
    }

    // 3. GET ALL CONTENTS / POSTS
    if (action === 'get_contents' || action === 'get_posts') {
        const list = await creator.getAllContents(20, offset || 0);
        return res.json({ success: true, data: list });
    }

    // 4. SEARCH CONTENTS / POSTS
    if (action === 'search_contents' || action === 'search_posts') {
        const list = await creator.searchContents(query || '', 20, offset || 0);
        return res.json({ success: true, data: list });
    }

    // 5. MENFESS (Placeholder - Table not yet exist)
    if (action === 'get_menfess' || action === 'search_menfess') {
        return res.json({ success: true, data: { list: [], total: 0 } });
    }

    // 6. GET TRENDING CREATORS
    if (action === 'get_trending') {
        const list = await creator.getTrendingCreators(10);
        return res.json({ success: true, data: list });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
