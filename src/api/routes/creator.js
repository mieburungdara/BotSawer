const express = require('express');
const router = express.Router();
const db = require('../../services/database');
const auth = require('../../services/auth');

/**
 * Creator API
 */
router.post('/creator.php', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { action } = req.body;

    // 1. CONFIRM CONTENT
    if (action === 'confirm_content') {
      const { contentId, caption } = req.body;
      
      const content = await db('contents')
        .where('short_id', contentId)
        .where('user_id', user.id)
        .first();

      if (!content) throw new Error('Konten tidak ditemukan');

      await db('contents').where('id', content.id).update({
        caption: caption,
        status: 'queued' // or 'published' based on your logic
      });

      return res.json({ success: true, data: { message: 'Konten berhasil dipublikasikan' } });
    }

    // 2. GET CREATOR CONTENTS
    if (action === 'get_contents') {
        const contents = await db('contents')
            .where('user_id', user.id)
            .whereNot('status', 'deleted')
            .orderBy('id', 'desc');
            
        return res.json({ success: true, data: contents });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
