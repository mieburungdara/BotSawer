const db = require('./database');
const { Telegram } = require('telegraf');

class SchedulerService {
  constructor() {
    this.interval = null;
  }

  /**
   * Start the scheduler
   */
  async start() {
    console.log('Scheduler Service started...');
    this.interval = setInterval(async () => {
      try {
        await this.processScheduledMedia();
      } catch (err) {
        console.error('Scheduler processing error:', err.message);
      }
    }, 60000); // Every 1 minute
  }

  /**
   * Process and post scheduled media
   */
  async processScheduledMedia() {
    const now = new Date();

    // 1. Find media scheduled for posting
    const mediaToPost = await db('contents')
      .where('status', 'queued') // Assuming queued means ready to post
      // .where('scheduled_at', '<=', now) // If you use scheduled_at
      .orderBy('id', 'asc')
      .first();

    if (!mediaToPost) return;

    // 2. Lock for processing
    const updated = await db('contents')
        .where('id', mediaToPost.id)
        .where('status', 'queued')
        .update({ status: 'posted' }); // Simple status update for now

    if (updated === 0) return;

    console.log(`Processing content ID: ${mediaToPost.id}`);

    // 3. Get Public Channel & Bot
    const settingsRows = await db('settings').select('key', 'value');
    const settings = {};
    settingsRows.forEach(row => settings[row.key] = row.value);

    const publicChannel = settings['public_channel'];
    if (!publicChannel) {
        console.error('Public channel not configured');
        return;
    }

    const botData = await db('bots').where('is_active', 1).first();
    if (!botData) {
        console.error('No active bot found for posting');
        return;
    }

    const telegram = new Telegram(botData.token);

    // 4. Create Deeplink
    const botIdentifier = botData.username || `bot${botData.id}`;
    const deeplink = `https://t.me/${botIdentifier}?start=content_${mediaToPost.short_id}`;

    // 5. Create Caption
    let caption = mediaToPost.caption || 'Konten baru dari kreator';
    caption += `\n\n💸 Sawer → ${deeplink}`;

    try {
        // Post to channel
        await telegram.sendMessage(publicChannel, caption, { parse_mode: 'HTML' });
        
        // Update status and timestamp
        await db('contents').where('id', mediaToPost.id).update({
            posted_at: new Date()
        });

        // Notify Creator
        await telegram.sendMessage(mediaToPost.user_id, `✅ Konten Anda telah diposting ke channel publik!\n\nID: #${mediaToPost.short_id}`);
        
        console.log(`Successfully posted content ${mediaToPost.short_id} to ${publicChannel}`);
    } catch (error) {
        console.error(`Failed to post content ${mediaToPost.short_id}:`, error.message);
        // Revert status for retry
        await db('contents').where('id', mediaToPost.id).update({ status: 'queued' });
    }
  }
}

module.exports = new SchedulerService();
