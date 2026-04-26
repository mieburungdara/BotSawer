const db = require('./database');
const followService = require('./follow');

class BlockService {
  /**
   * Block a user
   */
  async blockUser(blockerId, blockedId) {
    if (blockerId === blockedId) throw new Error('Anda tidak bisa memblokir diri sendiri');

    // Check if target user exists
    const target = await db('users').where('telegram_id', blockedId).first();
    if (!target) throw new Error('Pengguna tidak ditemukan');

    try {
      // 1. Insert into blocked_users
      await db('blocked_users').insert({
        blocker_id: blockerId,
        blocked_id: blockedId
      });

      // 2. Unfollow both ways (automatic cleanup)
      await followService.unfollow(blockerId, blockedId);
      await followService.unfollow(blockedId, blockerId);

      return { success: true, message: 'Berhasil memblokir pengguna' };
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY' || e.message.includes('unique')) {
        return { success: true, message: 'Sudah diblokir' };
      }
      throw e;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId, blockedId) {
    await db('blocked_users')
      .where({
        blocker_id: blockerId,
        blocked_id: blockedId
      })
      .delete();

    return { success: true, message: 'Berhasil membuka blokir' };
  }

  /**
   * Get block status between two users
   */
  async getBlockStatus(userId, targetId) {
    const blockedByMe = await db('blocked_users')
      .where({ blocker_id: userId, blocked_id: targetId })
      .first();
    
    const blockedByThem = await db('blocked_users')
      .where({ blocker_id: targetId, blocked_id: userId })
      .first();

    return {
      blockedByMe: !!blockedByMe,
      blockedByThem: !!blockedByThem,
      isAnyBlocked: !!blockedByMe || !!blockedByThem
    };
  }

  /**
   * Quick check for interaction permission
   */
  async canInteract(userId, targetId) {
    const status = await this.getBlockStatus(userId, targetId);
    return !status.isAnyBlocked;
  }
}

module.exports = new BlockService();
