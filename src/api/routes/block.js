const express = require('express');
const router = express.Router();
const blockService = require('../../services/block');
const auth = require('../../services/auth');

/**
 * Block API
 */
router.post('/block', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { action, targetId } = req.body;

    if (!targetId) throw new Error('Target ID diperlukan');

    // 1. BLOCK
    if (action === 'block') {
      const result = await blockService.blockUser(user.telegram_id, targetId);
      return res.json(result);
    }

    // 2. UNBLOCK
    if (action === 'unblock') {
      const result = await blockService.unblockUser(user.telegram_id, targetId);
      return res.json(result);
    }

    // 3. STATUS
    if (action === 'status') {
      const result = await blockService.getBlockStatus(user.telegram_id, targetId);
      return res.json({ success: true, data: result });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
