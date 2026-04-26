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

        // Privacy Filter - Removed restriction, let's return all but flag access
        const isSubscribed = await db('subscriptions')
            .where('subscriber_uuid', user.telegram_id)
            .where('creator_uuid', targetId)
            .where('status', 'active')
            .first();
        
        const theyFollowMe = await followService.isFollowing(targetId, user.telegram_id);
        
        const checkAccess = (p) => {
            if (user.telegram_id === targetId) return true;
            if (p === 'public') return true;
            if (p === 'followers_only' && isFollowing) return true;
            if (p === 'subscribers_only' && isSubscribed) return true;
            if (p === 'followed_only' && theyFollowMe) return true;
            return false;
        };

        const contents = await contentsQuery
          .select(
            'contents.*',
            db.raw('(SELECT message FROM transactions WHERE media_id = contents.id AND type = "donation" AND message IS NOT NULL ORDER BY created_at DESC LIMIT 1) as latest_donation_message')
          )
          .orderBy('created_at', 'desc')
          .limit(20);

        contentsWithMedia = await Promise.all(contents.map(async (content) => {
          const media = await db('media_files_raw').where('content_id', content.id);
          const hasAccess = checkAccess(content.privacy);
          
          return { 
              ...content, 
              media: media.map(m => ({
                  ...m,
                  // If no access and it's a photo, we'll blur it on the frontend via ImageKit transform if possible
                  // For now we just flag it
              })),
              has_access: hasAccess
          };
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
          is_blocked: blockStatus.blockedByMe,
          subscription: await db('subscriptions')
            .where('subscriber_uuid', user.telegram_id)
            .where('creator_uuid', targetId)
            .where('status', 'active')
            .first()
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

    // 4. UPDATE SUBSCRIPTION PRICE
    if (action === 'update_subscription_price') {
        const { price } = req.body;
        await db('users').where('telegram_id', user.telegram_id).update({ monthly_subscription_price: price });
        return res.json({ success: true, message: 'Harga langganan berhasil diperbarui' });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
