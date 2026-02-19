const AbstractService = require('./abstract-service');

class FileStarService extends AbstractService {

  getFileStarTable() {
    return this.getServiceManager().get('FileStarTable');
  }
  
  /**
   * Helper: Resolve User and Tenant IDs from Email
   * @param {string} email
   * @returns {Promise<{user_id: string, tenant_id: string}>}
   */
  async _resolveUser(email) {
    return this.getServiceManager().get('AppUserTable').resolveByEmail(email);
  }

  /**
   * Star a file
   * @param {string} fileId
   * @param {string} userEmail
   */
  async starFile(fileId, userEmail) {
    const { user_id, tenant_id } = await this._resolveUser(userEmail);
    const table = this.getFileStarTable();

    try {
      await table.add(tenant_id, fileId, user_id);
      return true;
    } catch (e) {
      if (e.message.includes('unique') || e.code === '23505') {
        return true;
      }
      throw e;
    }
  }

  /**
   * Toggle star status
   * @param {string} fileId
   * @param {string} userEmail
   */
  async toggleStar(fileId, userEmail) {
    const { user_id, tenant_id } = await this._resolveUser(userEmail);
    const table = this.getFileStarTable();

    const isStarred = await table.check(tenant_id, fileId, user_id);

    if (isStarred) {
      await table.remove(tenant_id, fileId, user_id);
      return false;
    } else {
      await table.add(tenant_id, fileId, user_id);
      return true;
    }
  }

  /**
   * Check if file is starred by user
   * @param {string} fileId
   * @param {string} userEmail
   */
  async isStarred(fileId, userEmail) {
    const { user_id, tenant_id } = await this._resolveUser(userEmail);
    return this.getFileStarTable().check(tenant_id, fileId, user_id);
  }

  /**
   * Get all starred files for a user
   * @param {string} userEmail
   */
  async getStarredFiles(userEmail) {
    const { user_id, tenant_id } = await this._resolveUser(userEmail);
    return this.getFileStarTable().fetchByUser(tenant_id, user_id);
  }
}

module.exports = FileStarService;
