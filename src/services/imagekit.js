const ImageKit = require('imagekit');
const db = require('./database');

class ImageKitService {
  /**
   * Get an active ImageKit account. Uses random rotation.
   */
  async getAccount() {
    const accounts = await db('imagekit_accounts').where('is_active', 1);

    if (accounts.length === 0) {
      throw new Error('Tidak ada akun ImageKit yang aktif.');
    }

    // Random rotation
    const account = accounts[Math.floor(Math.random() * accounts.length)];

    // Increment usage count
    await db('imagekit_accounts').where('id', account.id).increment('usage_count', 1);

    return account;
  }

  /**
   * Get a specific account by parsing the URL
   */
  async getAccountByUrl(fullUrl) {
    try {
      const url = new URL(fullUrl);
      const pathParts = url.pathname.split('/').filter(p => p !== '');
      const ikIdInUrl = pathParts[0];

      if (!ikIdInUrl) return null;

      const account = await db('imagekit_accounts')
        .where('imagekit_id', ikIdInUrl)
        .orWhere('url_endpoint', 'like', `%${ikIdInUrl}%`)
        .first();

      return account;
    } catch (e) {
      return null;
    }
  }

  /**
   * Generate a signed URL for security
   */
  async signUrl(fullUrl, transformations = [], expiry = 3600) {
    try {
      const account = await this.getAccountByUrl(fullUrl);
      if (!account) return fullUrl;

      const url = new URL(fullUrl);
      const pathParts = url.pathname.split('/').filter(p => p !== '');
      // Reconstruct path excluding the first part (imagekit_id)
      const filePath = '/' + pathParts.slice(1).join('/');

      const ik = new ImageKit({
        publicKey: account.public_key,
        privateKey: account.private_key,
        urlEndpoint: account.url_endpoint
      });

      return ik.url({
        path: filePath,
        transformation: transformations,
        signed: true,
        expireSeconds: expiry
      });
    } catch (e) {
      return fullUrl;
    }
  }

  /**
   * Upload a file from a URL to ImageKit
   */
  async uploadFromUrl(telegramUrl, fileName) {
    const account = await this.getAccount();

    const ik = new ImageKit({
      publicKey: account.public_key,
      privateKey: account.private_key,
      urlEndpoint: account.url_endpoint
    });

    const response = await ik.upload({
      file: telegramUrl,
      fileName: fileName,
      folder: '/VesperApp_media/',
      useUniqueFileName: false
    });

    return {
      url: response.url,
      fileId: response.fileId
    };
  }
}

module.exports = new ImageKitService();
