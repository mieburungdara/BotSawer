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
    if (data.ewallet_type !== undefined) updateData.ewallet_type = data.ewallet_type;
    if (data.ewallet_number !== undefined) updateData.ewallet_number = data.ewallet_number;
    if (data.ewallet_name !== undefined) updateData.ewallet_name = data.ewallet_name;

    if (Object.keys(updateData).length === 0) return true;

    const affected = await db('users').where('telegram_id', telegramId).update(updateData);
    return affected > 0;
  }

  /**
   * Get all creators (Explore)
   */
  async getAllCreators(limit = 20, offset = 0) {
    const totalResult = await db('users')
      .where('is_private', 0)
      .where('is_creator', 1)
      .count('telegram_id as total')
      .first();

    const list = await db('users')
      .where('is_private', 0)
      .where('is_creator', 1)
      .select('telegram_id', 'display_name', 'username', 'first_name', 'last_name', 'bio', 'photo_url', 'is_verified')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { list, total: parseInt(totalResult.total || 0) };
  }

  /**
   * Search creators
   */
  async searchCreators(query, limit = 20, offset = 0) {
    const searchTerm = `%${query}%`;
    const baseQuery = db('users')
      .where('is_private', 0)
      .where('is_creator', 1)
      .andWhere((builder) => {
        builder.where('display_name', 'like', searchTerm)
          .orWhere('username', 'like', searchTerm)
          .orWhere('first_name', 'like', searchTerm);
      });

    const totalResult = await baseQuery.clone().count('telegram_id as total').first();
    const list = await baseQuery.select('telegram_id', 'display_name', 'username', 'first_name', 'last_name', 'bio', 'photo_url', 'is_verified')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { list, total: parseInt(totalResult.total || 0) };
  }

  /**
   * Get Creator Stats
   */
  async getStats(telegramId) {
    const user = await db('users').where('telegram_id', telegramId).select('is_verified').first();
    
    const stats = await db('contents')
        .where('user_id', telegramId)
        .whereNot('status', 'deleted')
        .count('id as total_media')
        .first();
        
    const earnings = await db('transactions')
        .where('user_id', telegramId)
        .where('type', 'donation')
        .where('status', 'success')
        .select(db.raw('COUNT(id) as total_donations, COALESCE(SUM(amount), 0) as total_earnings'))
        .first();

    const streakData = await this.getStreakData(telegramId);
    
    const totalEarnings = parseFloat(earnings.total_earnings || 0);
    const totalDonations = parseInt(earnings.total_donations || 0);
    const currentStreak = streakData.current_streak || 0;

    // Calculate Badges
    const badges = [];
    if (user?.is_verified) badges.push({ id: 'verified', icon: '✅', color: 'bg-blue-500' });
    if (totalEarnings >= 100000) badges.push({ id: 'top_creator', icon: '👑', color: 'bg-yellow-500' });
    if (currentStreak >= 30) badges.push({ id: 'streak_master', icon: '🔥', color: 'bg-orange-600' });
    if (totalDonations >= 10) badges.push({ id: 'rising_star', icon: '⭐', color: 'bg-purple-500' });
    if (totalDonations >= 50) badges.push({ id: 'superstar', icon: '💎', color: 'bg-cyan-500' });
    if (parseInt(stats.total_media || 0) >= 20) badges.push({ id: 'active_creator', icon: '📸', color: 'bg-emerald-500' });

    return {
      total_media: parseInt(stats.total_media || 0),
      total_earnings: totalEarnings,
      total_donations: totalDonations,
      badges,
      ...streakData
    };
  }

  /**
   * Calculate Streaks
   */
  async getStreakData(telegramId) {
    const publishDatesRows = await db('contents')
      .where('user_id', telegramId)
      .where('status', 'posted')
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

  /**
   * Get all public contents (Explore - Content/Post)
   */
  async getAllContents(limit = 20, offset = 0) {
    const totalResult = await db('contents as c')
      .join('users as u', 'c.user_id', 'u.telegram_id')
      .where('c.status', 'posted')
      .count('c.id as total')
      .first();

    const list = await db('contents as c')
      .join('users as u', 'c.user_id', 'u.telegram_id')
      .where('c.status', 'posted')
      .select(
        'c.short_id', 
        'c.caption', 
        'c.created_at', 
        'u.display_name', 
        'u.username', 
        'u.photo_url',
        'u.is_verified'
      )
      .orderBy('c.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { list, total: parseInt(totalResult.total || 0) };
  }

  /**
   * Search public contents
   */
  async searchContents(query, limit = 20, offset = 0) {
    const searchTerm = `%${query}%`;
    const baseQuery = db('contents as c')
      .join('users as u', 'c.user_id', 'u.telegram_id')
      .where('c.status', 'posted')
      .andWhere('c.caption', 'like', searchTerm);

    const totalResult = await baseQuery.clone().count('c.id as total').first();
    const list = await baseQuery.select(
        'c.short_id', 
        'c.caption', 
        'c.created_at', 
        'u.display_name', 
        'u.username', 
        'u.photo_url',
        'u.is_verified'
      )
      .orderBy('c.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { list, total: parseInt(totalResult.total || 0) };
  }

  /**
   * Get Trending Creators (Explore)
   */
  async getTrendingCreators(limit = 10) {
    // Try to get by earnings first
    let trending = await db('users as u')
      .leftJoin('transactions as t', function() {
        this.on('u.telegram_id', '=', 't.user_id')
            .andOn('t.type', '=', db.raw("'donation'"))
            .andOn('t.status', '=', db.raw("'success'"))
      })
      .where('u.is_creator', 1)
      .where('u.is_private', 0)
      .select('u.telegram_id', 'u.display_name', 'u.username', 'u.photo_url', 'u.is_verified', 'u.bio')
      .count('t.id as total_donations')
      .sum('t.amount as total_earnings')
      .groupBy('u.telegram_id')
      .orderBy('total_earnings', 'desc')
      .limit(limit);

    // If no earnings yet, fallback to newest verified or just newest
    if (trending.length === 0 || !trending[0].total_earnings) {
        trending = await db('users')
            .where('is_creator', 1)
            .where('is_private', 0)
            .select('telegram_id', 'display_name', 'username', 'photo_url', 'is_verified', 'bio')
            .orderBy('is_verified', 'desc')
            .orderBy('created_at', 'desc')
            .limit(limit);
    }

    return trending;
  }
}

module.exports = new CreatorService();
