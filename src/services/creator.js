const db = require('./database');

class CreatorService {
  /**
   * Register a new creator
   */
  async register(telegramId, displayName, bio = null, bankAccount = null) {
    const user = await db('users').where('telegram_id', telegramId).first();
    if (!user) throw new Error('User not found');

    await db('users').where('telegram_id', telegramId).update({
      display_name: displayName,
      bio: bio,
      bank_account: bankAccount,
      is_creator: 1,
      is_verified: 0
    });

    return true;
  }

  /**
   * Update creator profile
   */
  async updateProfile(telegramId, data) {
    const updateData = {};
    if (data.display_name !== undefined) updateData.display_name = data.display_name;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.bank_account !== undefined) updateData.bank_account = data.bank_account;
    if (data.is_private !== undefined) updateData.is_private = data.is_private;

    if (Object.keys(updateData).length === 0) return true;

    const affected = await db('users').where('telegram_id', telegramId).update(updateData);
    return affected > 0;
  }

  /**
   * Get all creators (Explore)
   */
  async getAllCreators(limit = 50, offset = 0) {
    return await db('users')
      .where('is_private', 0)
      .where('is_creator', 1)
      .select('telegram_id', 'display_name', 'username', 'first_name', 'last_name', 'bio', 'photo_url', 'is_verified')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Search creators
   */
  async searchCreators(query, limit = 20) {
    const searchTerm = `%${query}%`;
    return await db('users')
      .where('is_private', 0)
      .where('is_creator', 1)
      .andWhere((builder) => {
        builder.where('display_name', 'like', searchTerm)
          .orWhere('username', 'like', searchTerm)
          .orWhere('first_name', 'like', searchTerm);
      })
      .select('telegram_id', 'display_name', 'username', 'first_name', 'last_name', 'bio', 'photo_url', 'is_verified')
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  /**
   * Get Creator Stats
   */
  async getStats(telegramId) {
    const stats = await db('media_files')
        .where('user_id', telegramId)
        .count('id as total_media')
        .first();
        
    const earnings = await db('transactions')
        .where('user_id', telegramId)
        .where('type', 'donation')
        .where('status', 'success')
        .select(db.raw('COUNT(id) as total_donations, COALESCE(SUM(amount), 0) as total_earnings'))
        .first();

    const streakData = await this.getStreakData(telegramId);

    return {
      total_media: parseInt(stats.total_media || 0),
      total_earnings: parseFloat(earnings.total_earnings || 0),
      total_donations: parseInt(earnings.total_donations || 0),
      ...streakData
    };
  }

  /**
   * Calculate Streaks
   */
  async getStreakData(telegramId) {
    const publishDatesRows = await db('media_files')
      .where('user_id', telegramId)
      .select(db.raw('DISTINCT DATE(created_at) as publish_date'))
      .orderBy('publish_date', 'desc');

    const publishDates = publishDatesRows.map(r => {
        // Handle both string and date object
        const d = new Date(r.publish_date);
        return d.toISOString().split('T')[0];
    });

    if (publishDates.length === 0) {
      return { current_streak: 0, max_streak: 0, streak_badge: 'Belum mulai' };
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    let currentStreak = 0;
    const lastPublishDate = publishDates[0];

    if (lastPublishDate === today || lastPublishDate === yesterday) {
      currentStreak = 1;
      let checkDate = new Date(lastPublishDate);
      
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const dateStr = checkDate.toISOString().split('T')[0];
        if (publishDates.includes(dateStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Max Streak calculation
    let maxStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < publishDates.length; i++) {
        const prevDate = new Date(publishDates[i-1]);
        prevDate.setDate(prevDate.getDate() - 1);
        if (publishDates[i] === prevDate.toISOString().split('T')[0]) {
            tempStreak++;
            maxStreak = Math.max(maxStreak, tempStreak);
        } else {
            tempStreak = 1;
        }
    }

    let streakBadge = 'Belum mulai';
    if (currentStreak >= 1) streakBadge = 'Pemula';
    if (currentStreak >= 3) streakBadge = 'Rutin';
    if (currentStreak >= 7) streakBadge = 'Ahli';
    if (currentStreak >= 14) streakBadge = 'Master';
    if (currentStreak >= 30) streakBadge = 'Legenda';

    return {
      current_streak: currentStreak,
      max_streak: maxStreak,
      streak_badge: streakBadge,
      last_publish_date: lastPublishDate
    };
  }
}

module.exports = new CreatorService();
