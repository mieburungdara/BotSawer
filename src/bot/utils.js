/**
 * Extract media info from Telegram message
 */
const extractMediaInfo = (ctx) => {
  const message = ctx.message;
  let type = null;
  let fileId = null;
  let fileUniqueId = null;
  let thumbFileId = null;
  let caption = message.caption || '';

  if (message.photo) {
    type = 'photo';
    const photo = message.photo[message.photo.length - 1]; // Get largest
    fileId = photo.file_id;
    fileUniqueId = photo.file_unique_id;
  } else if (message.video) {
    type = 'video';
    fileId = message.video.file_id;
    fileUniqueId = message.video.file_unique_id;
    thumbFileId = message.video.thumb ? message.video.thumb.file_id : null;
  } else if (message.document) {
    type = 'document';
    fileId = message.document.file_id;
    fileUniqueId = message.document.file_unique_id;
    thumbFileId = message.document.thumb ? message.document.thumb.file_id : null;
  }

  if (!type) return null;

  return {
    type,
    file_id: fileId,
    file_unique_id: fileUniqueId,
    thumb_file_id: thumbFileId,
    caption,
    media_group_id: message.media_group_id || null
  };
};

/**
 * Generate unique short ID
 */
const generateShortId = (length = 5) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  extractMediaInfo,
  generateShortId
};
