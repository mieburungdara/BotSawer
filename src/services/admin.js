const db = require('./database');

class AdminService {
  static ROLES = {
    SUPER_ADMIN: 'super_admin',
    MODERATOR: 'moderator',
    FINANCE: 'finance'
  };

  /**
   * Check if user is admin
   */
  async isAdmin(telegramId) {
    const admin = await db('admins').where('telegram_id', telegramId).where('is_active', 1).first();
    return !!admin;
  }

  /**
   * Get admin info
   */
  async getAdmin(telegramId) {
    return await db('admins').where('telegram_id', telegramId).where('is_active', 1).first();
  }

  /**
   * Check if user has specific role
   */
  async hasRole(telegramId, role) {
    const admin = await this.getAdmin(telegramId);
    if (!admin) return false;
    return admin.role === role || admin.role === AdminService.ROLES.SUPER_ADMIN;
  }

  /**
   * Permissions
   */
  async canModerate(telegramId) {
    return await this.hasRole(telegramId, AdminService.ROLES.MODERATOR);
  }

  async canHandleFinance(telegramId) {
    return await this.hasRole(telegramId, AdminService.ROLES.FINANCE);
  }

  async isSuperAdmin(telegramId) {
    return await this.hasRole(telegramId, AdminService.ROLES.SUPER_ADMIN);
  }

  /**
   * Get System Stats for Admin Dashboard
   */
  async getSystemStats() {
    const [userCount] = await db('users').count('id as total');
    const [botCount] = await db('bots').count('id as total');
    const [contentCount] = await db('contents').whereNot('status', 'deleted').count('id as total');
    const [donationStats] = await db('contents').select(db.raw('SUM(total_donations) as total_amount, SUM(donation_count) as total_count'));

    return {
      total_users: userCount.total,
      total_bots: botCount.total,
      total_contents: contentCount.total,
      total_donations_amount: parseFloat(donationStats.total_amount || 0),
      total_donations_count: parseInt(donationStats.total_count || 0)
    };
  }

  /**
   * Get all admins
   */
  async getAllAdmins() {
    return await db('admins').orderBy('created_at', 'desc');
  }

  /**
   * Update last login
   */
  async updateLastLogin(telegramId) {
    await db('admins').where('telegram_id', telegramId).update({ last_login: new Date() });
  }
}

module.exports = new AdminService();
