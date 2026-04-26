const express = require('express');
const router = express.Router();
const dmService = require('../../services/direct_message');
const auth = require('../../services/auth');

/**
 * Direct Message API
 * POST /direct_message
 */
router.post('/direct_message', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { action, targetId, conversationId, content, limit, offset } = req.body;

    // 1. AMBIL DAFTAR PERCAKAPAN
    if (action === 'get_conversations') {
      const data = await dmService.getConversationList(user.telegram_id);
      return res.json({ success: true, data });
    }

    // 2. MULAI / BUKA PERCAKAPAN DENGAN USER TERTENTU
    if (action === 'get_or_create') {
      if (!targetId) throw new Error('targetId diperlukan.');
      const conversation = await dmService.getOrCreateConversation(user.telegram_id, targetId);
      return res.json({ success: true, data: conversation });
    }

    // 3. AMBIL PESAN DALAM PERCAKAPAN
    if (action === 'get_messages') {
      if (!conversationId) throw new Error('conversationId diperlukan.');
      const data = await dmService.getMessages(conversationId, limit || 50, offset || 0);
      return res.json({ success: true, data });
    }

    // 4. KIRIM PESAN
    if (action === 'send_message') {
      if (!conversationId) throw new Error('conversationId diperlukan.');
      if (!content) throw new Error('content diperlukan.');
      const message = await dmService.sendMessage(conversationId, user.telegram_id, content);
      return res.json({ success: true, data: message });
    }

    // 5. TANDAI SUDAH DIBACA
    if (action === 'mark_read') {
      if (!conversationId) throw new Error('conversationId diperlukan.');
      await dmService.markAsRead(conversationId, user.telegram_id);
      return res.json({ success: true });
    }

    // 6. HITUNG UNREAD (untuk badge di nav)
    if (action === 'get_unread_count') {
      const count = await dmService.getUnreadCount(user.telegram_id);
      return res.json({ success: true, data: { count } });
    }

    throw new Error('Action tidak dikenal.');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
