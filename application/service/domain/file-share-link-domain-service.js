// application/service/domain/file-share-link-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');
const crypto = require('crypto');

class FileShareLinkService extends AbstractDomainService {
  constructor() {
    super();
  }

  /**
   * Create a new share link for a file.
   * @param {Object} data
   * @returns {ShareLinkEntity|null}
   */
  async create(data) {
    const table = this.getTable('ShareLinkTable');
    return table.create(data);
  }

  /**
   * Revoke all active share links for a file.
   * @param {string} tenantId
   * @param {string} fileId
   */
  async revoke(tenantId, fileId) {
    const table = this.getTable('ShareLinkTable');
    return table.revoke(tenantId, fileId);
  }

  /**
   * Fetch a share link entity by its ID.
   * @param {string} shareId
   * @returns {ShareLinkEntity|null}
   */
  async getById(shareId) {
    const table = this.getTable('ShareLinkTable');
    return table.fetchById(shareId);
  }

  /**
   * Fetch a share link entity by its token hash.
   * @param {string} tokenHash
   * @returns {ShareLinkEntity|null}
   */
  async getByToken(tokenHash) {
    const table = this.getTable('ShareLinkTable');
    return table.fetchByToken(tokenHash);
  }

  /**
   * Get all share links for a file.
   * @param {string} fileId
   * @returns {ShareLinkEntity[]}
   */
  async getByFileId(fileId) {
    const table = this.getTable('ShareLinkTable');
    return table.fetchByFileId(fileId);
  }

  /**
   * Get the currently active (non-revoked, non-expired) link for a file.
   * @param {string} fileId
   * @returns {ShareLinkEntity|null}
   */
  async getActiveByFileId(fileId) {
    const table = this.getTable('ShareLinkTable');
    return table.fetchActiveByFileId(fileId);
  }

  /**
   * Resolve a raw token to a valid, active share link.
   * Tries SHA-256 hash first, then raw token as fallback for pre-hashed tokens.
   * @param {string} token - raw token from the URL
   * @returns {ShareLinkEntity}
   * @throws {Error} if not found, revoked, or expired
   */
  async resolveToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    let shareLink = await this.getByToken(tokenHash);

    if (!shareLink && /^[a-f0-9]{64}$/i.test(token)) {
      shareLink = await this.getByToken(token);
    }

    if (!shareLink) throw new Error('Link not found or invalid');
    if (shareLink.revoked_dt) throw new Error('Link revoked');
    if (shareLink.expires_dt && new Date(shareLink.expires_dt) < new Date()) throw new Error('Link expired');

    return shareLink;
  }
}

module.exports = FileShareLinkService;
