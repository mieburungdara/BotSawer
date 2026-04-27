const express = require('express');
const router = express.Router();
const db = require('../../services/database');
const auth = require('../../services/auth');
const ik = require('../../services/imagekit');

/**
 * Main Content API
 */
router.post('/content', async (req, res) => {
  try {
    const user = await auth.authenticate(req.body);
    const { action, short_id } = req.body;

    // 1. GET Content Detail
    if (action === 'get') {
      const content = await db('contents').where('short_id', short_id).whereNot('status', 'deleted').first();
      if (!content) throw new Error('Konten tidak ditemukan');

      const isOwner = parseInt(content.user_id) === parseInt(user.telegram_id);
      
      if (content.status === 'draft' && !isOwner) {
        throw new Error('Konten ini belum dipublikasikan oleh kreator');
      }

      const creator = await db('users').where('telegram_id', content.user_id).first() || {};
      const mediaFiles = await db('media_files').where('content_id', content.id);

      // ACCESS CHECK
      let hasAccess = isOwner;
      if (!isOwner) {
          if (content.privacy === 'public') {
              hasAccess = true;
          } else if (content.privacy === 'followers_only') {
              const follow = await db('follows').where('follower_id', user.telegram_id).where('followed_id', content.user_id).first();
              if (follow) hasAccess = true;
          } else if (content.privacy === 'subscribers_only') {
              const sub = await db('subscriptions').where('subscriber_uuid', user.telegram_id).where('creator_uuid', content.user_id).where('status', 'active').first();
              if (sub) hasAccess = true;
          } else if (content.privacy === 'followed_only') {
              // Author follows requester
              const follow = await db('follows').where('follower_id', content.user_id).where('followed_id', user.telegram_id).first();
              if (follow) hasAccess = true;
          }
      }

      const mediaList = await Promise.all(mediaFiles.map(async (media) => {
        let imagekitUrl = media.imagekit_url;
        if (imagekitUrl) {
          const transformations = [];
          if (!hasAccess) {
            transformations.push({ blur: '80' }); // Stronger blur if no access
          }
          imagekitUrl = await ik.signUrl(imagekitUrl, transformations);
        }

        return {
          id: media.id,
          file_type: media.file_type,
          imagekit_url: imagekitUrl,
          has_access: hasAccess,
          has_thumbnail_source: (media.file_type === 'photo' && media.telegram_file_id) || media.thumb_file_id
        };
      }));

      return res.json({
        success: true,
        data: {
          is_owner: isOwner,
          short_id: content.short_id,
          status: content.status,
          privacy: content.privacy,
          caption: content.caption,
          created_at: content.created_at,
          creator_id: creator.uuid || 'Anonim',
          creator_name: creator.display_name,
          creator_username: creator.username,
          creator_photo: creator.photo_url,
          media_list: mediaList,
          total_donations: isOwner ? parseFloat(content.total_donations || 0) : undefined,
          donation_count: isOwner ? parseInt(content.donation_count || 0) : undefined
        }
      });
    }

    // 1.5. LIST MY CONTENT
    if (action === 'list_my_content') {
      const contents = await db('contents')
        .where('user_id', user.telegram_id)
        .whereNot('status', 'deleted')
        .orderBy('created_at', 'desc')
        .select('id', 'short_id', 'status', 'privacy', 'caption', 'created_at', 'total_donations', 'donation_count');

      const list = await Promise.all(contents.map(async (content) => {
        const media = await db('media_files').where('content_id', content.id).first();
        
        let thumbUrl = null;
        if (media && media.imagekit_url) {
            thumbUrl = await ik.signUrl(media.imagekit_url, [{ width: '100' }]);
        }

        return {
          id: content.id,
          short_id: content.short_id,
          status: content.status,
          privacy: content.privacy,
          caption: content.caption,
          created_at: content.created_at,
          total_donations: parseFloat(content.total_donations || 0),
          donation_count: parseInt(content.donation_count || 0),
          thumb_url: thumbUrl
        };
      }));

      return res.json({ success: true, data: list });
    }

    // 2. GENERATE THUMBNAIL
    if (action === 'generate_thumbnail') {
      const content = await db('contents').where('short_id', short_id).where('user_id', user.telegram_id).first();
      if (!content) throw new Error('Konten tidak ditemukan atau Anda bukan pemiliknya');

      const mediaFiles = await db('media_files').where('content_id', content.id).whereNull('imagekit_url');
      if (mediaFiles.length === 0) throw new Error('Tidak ada thumbnail baru yang perlu di-generate.');

      const bot = await db('bots').where('bot_id', req.body.botId).first();
      
      let successCount = 0;
      for (const media of mediaFiles) {
        const fileId = media.file_type === 'photo' ? media.telegram_file_id : media.thumb_file_id;
        if (!fileId) continue;

        try {
          const tgFileRes = await fetch(`https://api.telegram.org/bot${bot.token}/getFile?file_id=${fileId}`);
          const tgFileData = await tgFileRes.json();

          if (tgFileData.ok) {
            const filePath = tgFileData.result.file_path;
            const directUrl = `https://api.telegram.org/file/bot${bot.token}/${filePath}`;
            
            const upload = await ik.uploadFromUrl(directUrl, `${content.short_id}_${media.id}_thumb`);
            
            await db('media_files').where('id', media.id).update({
              imagekit_file_id: upload.fileId,
              imagekit_url: upload.url
            });
            successCount++;
          }
        } catch (err) {
          console.error(`Failed thumbnail for media ${media.id}:`, err);
        }
      }

      return res.json({
        success: true,
        data: { message: `Thumbnail berhasil dibuat untuk ${successCount} file.` }
      });
    }

    // 3. DELETE CONTENT
    if (action === 'delete_content') {
        await db('contents').where('short_id', short_id).where('user_id', user.telegram_id).update({ status: 'deleted' });
        return res.json({ success: true, data: { message: 'Konten berhasil dihapus' } });
    }

    // 4. UPDATE PRIVACY
    if (action === 'update_privacy') {
        const { privacy } = req.body;
        const allowed = ['public', 'followers_only', 'subscribers_only', 'followed_only'];
        if (!allowed.includes(privacy)) {
            throw new Error('Tipe privacy tidak valid');
        }
        await db('contents').where('short_id', short_id).where('user_id', user.telegram_id).update({ privacy });
        return res.json({ success: true, data: { message: 'Privacy konten berhasil diperbarui' } });
    }

    // 5. PUBLISH CONTENT
    if (action === 'publish_content') {
        const content = await db('contents').where('short_id', short_id).where('user_id', user.telegram_id).first();
        if (!content) throw new Error('Konten tidak ditemukan');
        if (content.status !== 'draft') throw new Error('Konten sudah dipublikasikan');
        
        await db('contents').where('short_id', short_id).where('user_id', user.telegram_id).update({ 
            status: 'posted',
            posted_at: db.fn.now()
        });
        return res.json({ success: true, data: { message: 'Konten berhasil dipublikasikan' } });
    }

    throw new Error('Action tidak dikenal');

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
