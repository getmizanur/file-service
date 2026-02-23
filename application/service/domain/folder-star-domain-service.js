// application/service/domain/folder-star-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');

class FolderStarService extends AbstractDomainService {

  /**
   * Toggle star by email
   */
  async toggleStarByEmail(folderId, email) {
    const { user_id, tenant_id } = await this.getServiceManager().get('AppUserTable').resolveByEmail(email);
    return this.toggleStar(tenant_id, folderId, user_id);
  }

  /**
   * Toggle star status
   */
  async toggleStar(tenantId, folderId, userId) {

    const table = this.getTable('FolderStarTable');

    const isStarred = await table.check(tenantId, folderId, userId);

    if (isStarred) {
      await table.remove(tenantId, folderId, userId);
      return { starred: false };
    }

    try {
      await table.add(tenantId, folderId, userId);
      return { starred: true };
    } catch (e) {
      // Unique violation safety (Postgres 23505)
      if (e.code === '23505') {
        return { starred: true };
      }
      throw e;
    }
  }

  /**
   * List starred folders
   */
  async listStarred(tenantId, userId) {
    const table = this.getTable('FolderStarTable');
    return table.fetchWithFolderDetails(tenantId, userId);
  }
}

module.exports = FolderStarService;