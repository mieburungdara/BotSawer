const db = require('./database');
const blockService = require('./block');

class DirectMessageService {

  /**
   * Mendapatkan atau membuat percakapan antara dua user.
   * Selalu menyimpan user_id terkecil di user1_id untuk konsistensi.
   */
  async getOrCreateConversation(userIdA, userIdB) {
    if (String(userIdA) === String(userIdB)) {
      throw new Error('Tidak bisa mengirim pesan ke diri sendiri.');
    }

    const [id1, id2] = [String(userIdA), String(userIdB)].sort();

    // Check block status
    const blockStatus = await blockService.getBlockStatus(userIdA, userIdB);
    if (blockStatus.isAnyBlocked) {
      throw new Error('Tidak bisa memulai percakapan karena ada blokir aktif.');
    }

    let conversation = await db('direct_conversations')
      .where({ user1_id: id1, user2_id: id2 })
      .first();

    if (!conversation) {
      const [newId] = await db('direct_conversations').insert({
        user1_id: id1,
        user2_id: id2,
        last_message_at: new Date()
      });
      conversation = await db('direct_conversations').where('id', newId).first();
    }

    return conversation;
  }

  /**
   * Mengirim pesan baru.
   */
  async sendMessage(conversationId, senderId, content) {
    if (!content || content.trim() === '') {
      throw new Error('Isi pesan tidak boleh kosong.');
    }
    if (content.length > 2000) {
      throw new Error('Pesan terlalu panjang (maksimal 2000 karakter).');
    }

    // Check block status before sending
    const conv = await db('direct_conversations').where('id', conversationId).first();
    if (!conv) throw new Error('Percakapan tidak ditemukan.');

    const partnerId = String(conv.user1_id) === String(senderId) ? conv.user2_id : conv.user1_id;
    const canInteract = await blockService.canInteract(senderId, partnerId);
    if (!canInteract) {
      throw new Error('Gagal mengirim pesan. Pengguna ini telah memblokir Anda atau Anda telah memblokir mereka.');
    }

    const [newId] = await db('direct_messages').insert({
      conversation_id: conversationId,
      sender_id: String(senderId),
      content: content.trim(),
      is_read: 0,
      created_at: new Date()
    });

    // Update timestamp percakapan
    await db('direct_conversations')
      .where('id', conversationId)
      .update({ last_message_at: new Date() });

    return await db('direct_messages').where('id', newId).first();
  }

  /**
   * Mengambil riwayat pesan dalam suatu percakapan.
   */
  async getMessages(conversationId, limit = 50, offset = 0) {
    const messages = await db('direct_messages as m')
      .join('users as u', 'm.sender_id', '=', db.raw('CAST(u.telegram_id AS CHAR)'))
      .where('m.conversation_id', conversationId)
      .select(
        'm.id',
        'm.conversation_id',
        'm.sender_id',
        'm.content',
        'm.is_read',
        'm.created_at',
        'u.display_name as sender_name',
        'u.username as sender_username',
        'u.photo_url as sender_photo'
      )
      .orderBy('m.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return messages.reverse();
  }

  /**
   * Mengambil daftar semua percakapan milik seorang user,
   * beserta pesan terakhir dan info lawan bicara.
   */
  async getConversationList(userId) {
    const conversations = await db('direct_conversations as c')
      .where('c.user1_id', String(userId))
      .orWhere('c.user2_id', String(userId))
      .orderBy('c.last_message_at', 'desc')
      .select('c.*');

    const results = [];

    for (const conv of conversations) {
      const partnerId = String(conv.user1_id) === String(userId)
        ? conv.user2_id
        : conv.user1_id;

      const partner = await db('users')
        .where(db.raw('CAST(telegram_id AS CHAR)'), String(partnerId))
        .select('telegram_id', 'display_name', 'username', 'photo_url', 'is_verified')
        .first();

      const lastMessage = await db('direct_messages')
        .where('conversation_id', conv.id)
        .orderBy('created_at', 'desc')
        .first();

      const unreadCount = await db('direct_messages')
        .where('conversation_id', conv.id)
        .where('is_read', 0)
        .where('sender_id', '!=', String(userId))
        .count('id as total')
        .first();

      results.push({
        conversation_id: conv.id,
        partner,
        last_message: lastMessage || null,
        unread_count: parseInt(unreadCount?.total || 0),
        last_message_at: conv.last_message_at
      });
    }

    return results;
  }

  /**
   * Menandai semua pesan dalam percakapan sebagai sudah dibaca.
   */
  async markAsRead(conversationId, userId) {
    await db('direct_messages')
      .where('conversation_id', conversationId)
      .where('sender_id', '!=', String(userId))
      .where('is_read', 0)
      .update({ is_read: 1 });

    return { success: true };
  }

  /**
   * Menghitung total pesan belum dibaca untuk seorang user (untuk badge notifikasi).
   */
  async getUnreadCount(userId) {
    // Ambil semua conversation ID yang melibatkan user ini
    const conversations = await db('direct_conversations')
      .where('user1_id', String(userId))
      .orWhere('user2_id', String(userId))
      .pluck('id');

    if (!conversations.length) return 0;

    const result = await db('direct_messages')
      .whereIn('conversation_id', conversations)
      .where('sender_id', '!=', String(userId))
      .where('is_read', 0)
      .count('id as total')
      .first();

    return parseInt(result?.total || 0);
  }
}

module.exports = new DirectMessageService();
