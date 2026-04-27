const db = require('./database');

class AuditService {
  /**
   * Log administrative action
   */
  async logAdminAction(action, metadata = {}, adminTelegramId, entityType = 'system', entityId = 0) {
    try {
      // Check if metadata contains entity info
      const eType = metadata.entity_type || entityType;
      const eId = metadata.entity_id || entityId;

      await db('audit_logs').insert({
        user_id: adminTelegramId,
        action: action,
        entity_type: eType,
        entity_id: eId,
        new_data: JSON.stringify(metadata),
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to log audit action:', error.message);
    }
  }
}

module.exports = new AuditService();
