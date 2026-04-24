const db = require('./database');

class AuditService {
  /**
   * Log administrative action
   */
  async logAdminAction(action, metadata = {}, adminTelegramId) {
    try {
      await db('audit_logs').insert({
        admin_id: adminTelegramId,
        action: action,
        metadata: JSON.stringify(metadata),
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to log audit action:', error.message);
    }
  }
}

module.exports = new AuditService();
