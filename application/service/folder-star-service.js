const AbstractService = require('./abstract-service');

class FolderStarService extends AbstractService {

  /**
   * Get FolderStarTable from ServiceManager
   */
  getFolderStarTable() {
    const sm = this.getServiceManager();
    if (!sm) {
      throw new Error('ServiceManager not available in FolderStarService');
    }
    return sm.get('FolderStarTable');
  }

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

    const table = this.getFolderStarTable();

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
    const table = this.getFolderStarTable();
    return table.fetchWithFolderDetails(tenantId, userId);
  }
}

module.exports = FolderStarService;