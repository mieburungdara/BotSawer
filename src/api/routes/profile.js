const express = require('express');
const router = express.Router();
const creator = require('../../services/creator');
const auth = require('../../services/auth');
const db = require('../../services/database');

const followService = require('../../services/follow');
const blockService = require('../../services/block');

/**
 * Profile API
 */
router.post('/profile', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { action, profile_data } = req.body;

    // 1. GET PROFILE
    if (action === 'get') {
      const targetId = req.body.targetId || user.telegram_id;
      
      let profileUser = user;
      if (req.body.targetId && req.body.targetId !== user.telegram_id) {
          profileUser = await db('users').where('telegram_id', req.body.targetId).first();
          if (!profileUser) throw new Error('Profil tidak ditemukan');
      }

      const stats = await creator.getStats(targetId);
      const isFollowing = await followService.isFollowing(user.telegram_id, targetId);
      
      // BLOCK CHECK
      const blockStatus = await blockService.getBlockStatus(user.telegram_id, targetId);
      
      if (blockStatus.blockedByThem && user.telegram_id !== targetId) {
          throw new Error('Profil tidak tersedia.');
      }

      let contentsWithMedia = [];
      if (!blockStatus.blockedByMe) {
        // Get recent contents with media
        const contentsQuery = db('contents')
          .where('user_id', targetId)
          .whereNot('status', 'deleted');

        // Privacy Filter
        if (user.telegram_id !== targetId) {
            if (isFollowing) {
                contentsQuery.whereIn('privacy', ['public', 'followers_only']);
            } else {
                contentsQuery.where('privacy', 'public');
            }
        }

        const contents = await contentsQuery
          .select(
            'contents.*',
            db.raw('(SELECT message FROM transactions WHERE media_id = contents.id AND type = "donation" AND message IS NOT NULL ORDER BY created_at DESC LIMIT 1) as latest_donation_message')
          )
          .orderBy('created_at', 'desc')
          .limit(20);

        contentsWithMedia = await Promise.all(contents.map(async (content) => {
          const media = await db('media_files_raw').where('content_id', content.id);
          return { ...content, media };
        }));
      }

      return res.json({ 
        success: true, 
        data: {
          ...profileUser,
          stats,
          contents: contentsWithMedia,
          is_own: user.telegram_id === targetId,
          is_following: isFollowing,
          is_blocked: blockStatus.blockedByMe
        } 
      });
    }

    // 2. UPDATE PROFILE
    if (action === 'update') {
        const success = await creator.updateProfile(user.telegram_id, profile_data || {});
        return res.json({ success: true, data: { success } });
    }

    // 3. UPDATE GOAL
    if (action === 'update_goal') {
        const { title, goal, reset } = req.body;
        const updateData = {
            donation_goal: goal,
            donation_goal_title: title
        };
        
        if (reset) {
            updateData.donation_goal_current = 0;
        }

        await db('users').where('telegram_id', user.telegram_id).update(updateData);
        return res.json({ success: true, message: 'Goal updated successfully' });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
