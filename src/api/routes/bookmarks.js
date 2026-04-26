const express = require('express');
const router = express.Router();
const db = require('../../services/database');
const auth = require('../../services/auth');

/**
 * Toggle Bookmark
 */
router.post('/bookmarks/toggle', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { content_id } = req.body;

    if (!content_id) {
      return res.json({ success: false, message: 'Content ID required' });
    }

    // Check if already bookmarked
    const existing = await db('bookmarks')
      .where({ user_id: user.telegram_id, content_id })
      .first();

    if (existing) {
      await db('bookmarks')
        .where({ user_id: user.telegram_id, content_id })
        .del();
      return res.json({ success: true, is_bookmarked: false });
    } else {
      await db('bookmarks').insert({
        user_id: user.telegram_id,
        content_id,
        created_at: db.fn.now()
      });
      return res.json({ success: true, is_bookmarked: true });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

/**
 * List Bookmarks
 */
router.post('/bookmarks/list', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    
    // Fetch bookmarked contents with user info
    const bookmarks = await db('bookmarks as b')
      .join('contents as c', 'b.content_id', 'c.id')
      .join('users as u', 'c.user_id', 'u.telegram_id')
      .where('b.user_id', user.telegram_id)
      .select(
        'c.id',
        'c.short_id',
        'c.caption',
        'c.created_at',
        'u.display_name',
        'u.username',
        'u.photo_url',
        'u.is_verified'
      )
      .orderBy('b.created_at', 'desc');

    // Add is_bookmarked flag (always true for this list)
    const list = bookmarks.map(item => ({ ...item, is_bookmarked: true }));

    return res.json({ success: true, data: list });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
