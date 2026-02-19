const AbstractService = require('./abstract-service');

class FolderShareLinkService extends AbstractService {
  constructor() {
    super();
  }

  getFolderShareLinkTable() {
    return this.getServiceManager().get('FolderShareLinkTable');
  }

  /**
   * Create a new share link for a folder.
   * @param {string} tenantId
   * @param {string} folderId
   * @param {string} tokenHash - pre-hashed token
   * @param {object} options
   * @param {Date|null} options.expiresDt
   * @param {string|null} options.passwordHash
   * @param {string|null} options.createdBy - user_id of the actor
   * @returns {FolderShareLinkEntity|null}
   */
  async create(tenantId, folderId, tokenHash, options = {}) {
    const table = this.getFolderShareLinkTable();
    return table.insertLink(tenantId, folderId, tokenHash, options);
  }

  /**
   * Revoke a share link (set revoked_dt).
   * @param {string} tenantId
   * @param {string} shareId
   */
  async revoke(tenantId, shareId) {
    const table = this.getFolderShareLinkTable();
    return table.revokeLink(tenantId, shareId);
  }

  /**
   * Permanently delete a share link.
   * @param {string} tenantId
   * @param {string} shareId
   */
  async delete(tenantId, shareId) {
    const table = this.getFolderShareLinkTable();
    return table.deleteLink(tenantId, shareId);
  }

  /**
   * Fetch a share link entity by its ID.
   * @param {string} shareId
   * @returns {FolderShareLinkEntity|null}
   */
  async getById(shareId) {
    const table = this.getFolderShareLinkTable();
    return table.fetchById(shareId);
  }

  /**
   * Fetch a share link entity by its token hash.
   * @param {string} tokenHash
   * @returns {FolderShareLinkEntity|null}
   */
  async getByToken(tokenHash) {
    const table = this.getFolderShareLinkTable();
    return table.fetchByToken(tokenHash);
  }

  /**
   * Get all share links for a folder.
   * @param {string} tenantId
   * @param {string} folderId
   * @returns {FolderShareLinkEntity[]}
   */
  async getByFolder(tenantId, folderId) {
    const table = this.getFolderShareLinkTable();
    return table.fetchByFolderId(tenantId, folderId);
  }

  /**
   * Get share links for a folder with folder name and creator details.
   * @param {string} tenantId
   * @param {string} folderId
   * @returns {FolderShareLinkDTO[]}
   */
  async getByFolderWithDetails(tenantId, folderId) {
    const table = this.getFolderShareLinkTable();
    return table.fetchByFolderWithDetails(tenantId, folderId);
  }

  /**
   * Verify whether a token resolves to an active (non-revoked, non-expired) link.
   * @param {string} tokenHash
   * @returns {FolderShareLinkEntity|null} the entity if active, null otherwise
   */
  async resolveActiveLink(tokenHash) {
    const link = await this.getByToken(tokenHash);
    if (!link || !link.isActive()) return null;
    return link;
  }
}

module.exports = FolderShareLinkService;
