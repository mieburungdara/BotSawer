const express = require('express');
const router = express.Router();
const auth = require('../../services/auth');
const db = require('../../services/database');
const dmService = require('../../services/direct_message');

const ADMIN_ID = "7602143247"; // Admin Vesper

/**
 * Feedback & Bug Report API
 */
router.post('/feedback', async (req, res) => {
    try {
        const user = await auth.authenticate(req.body);
        const { type, content, screenshot_url } = req.body;

        if (!content) throw new Error('Konten feedback tidak boleh kosong');

        // 1. Save to feedbacks table
        await db('feedbacks').insert({
            user_id: String(user.telegram_id),
            type: type || 'suggestion',
            content,
            screenshot_url: screenshot_url || null,
            created_at: new Date()
        });

        // 2. Send DM to Admin to initiate conversation
        try {
            const conversation = await dmService.getOrCreateConversation(user.telegram_id, ADMIN_ID);
            
            let message = `📝 *FEEDBACK BARU (${(type || 'suggestion').toUpperCase()})*\n\n${content}`;
            if (screenshot_url) {
                message += `\n\n🖼️ [Ada Lampiran Screenshot]`;
            }
            
            await dmService.sendMessage(conversation.id, user.telegram_id, message);
        } catch (dmError) {
            console.error("Gagal mengirim DM feedback ke admin:", dmError);
            // Tetap sukses karena data feedback sudah tersimpan di DB
        }

        res.json({ success: true, message: 'Feedback berhasil dikirim! Admin akan segera meninjau.' });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

module.exports = router;
