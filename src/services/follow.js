const db = require('./database');

class FollowService {
  /**
   * Follow a user
   */
  async follow(followerId, followedId) {
    if (followerId === followedId) throw new Error('Anda tidak bisa mengikuti diri sendiri');
    
    // Check if target user exists
    const target = await db('users').where('telegram_id', followedId).first();
    if (!target) throw new Error('Pengguna tidak ditemukan');

    try {
        await db('follows').insert({
            follower_id: followerId,
            followed_id: followedId
        });
        return { success: true, message: 'Berhasil mengikuti' };
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY' || e.message.includes('unique')) {
            return { success: true, message: 'Sudah mengikuti' };
        }
        throw e;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollow(followerId, followedId) {
    await db('follows')
      .where({
        follower_id: followerId,
        followed_id: followedId
      })
      .delete();
    
    return { success: true, message: 'Berhasil berhenti mengikuti' };
  }

  /**
   * Get Followers List
   */
  async getFollowers(userId, limit = 20, offset = 0) {
    const list = await db('follows as f')
      .join('users as u', 'f.follower_id', '=', 'u.telegram_id')
      .where('f.followed_id', userId)
      .select('u.telegram_id', 'u.display_name', 'u.username', 'u.photo_url', 'u.is_verified', 'u.bio')
      .limit(limit)
      .offset(offset);

    const totalResult = await db('follows').where('followed_id', userId).count('id as total').first();
    
    return { list, total: parseInt(totalResult.total || 0) };
  }

  /**
   * Get Following List
   */
  async getFollowing(userId, limit = 20, offset = 0) {
    const list = await db('follows as f')
      .join('users as u', 'f.followed_id', '=', 'u.telegram_id')
      .where('f.follower_id', userId)
      .select('u.telegram_id', 'u.display_name', 'u.username', 'u.photo_url', 'u.is_verified', 'u.bio')
      .limit(limit)
      .offset(offset);

    const totalResult = await db('follows').where('follower_id', userId).count('id as total').first();
    
    return { list, total: parseInt(totalResult.total || 0) };
  }

  /**
   * Check if following
   */
  async isFollowing(followerId, followedId) {
    const follow = await db('follows')
      .where({
        follower_id: followerId,
        followed_id: followedId
      })
      .first();
    
    return !!follow;
  }

  /**
   * Get Follow Stats
   */
  async getFollowStats(userId) {
    const followers = await db('follows').where('followed_id', userId).count('id as total').first();
    const following = await db('follows').where('follower_id', userId).count('id as total').first();
    
    return {
      followers: parseInt(followers.total || 0),
      following: parseInt(following.total || 0)
    };
  }
}

module.exports = new FollowService();
