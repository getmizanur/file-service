// application/service/domain/folder-permission-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');

class FolderPermissionService extends AbstractDomainService {
  constructor() {
    super();
  }

  /**
   * Grant or update a user's role on a folder.
   * @param {string} tenantId
   * @param {string} folderId
   * @param {string} userId
   * @param {string} role - 'owner'|'editor'|'commenter'|'viewer'
   * @param {string} grantedBy - user_id of the actor
   * @param {boolean} inheritToChildren
   * @returns {FolderPermissionEntity|null}
   */
  async grant(tenantId, folderId, userId, role, grantedBy, inheritToChildren = true) {
    const table = this.getTable('FolderPermissionTable');
    return table.upsertPermission(tenantId, folderId, userId, role, grantedBy, inheritToChildren);
  }

  /**
   * Revoke a user's permission on a folder.
   * @param {string} tenantId
   * @param {string} folderId
   * @param {string} userId
   */
  async revoke(tenantId, folderId, userId) {
    const table = this.getTable('FolderPermissionTable');
    return table.deletePermission(tenantId, folderId, userId);
  }

  /**
   * Get all people with access to a folder (with user details).
   * @param {string} tenantId
   * @param {string} folderId
   * @returns {FolderPermissionUserDTO[]}
   */
  async getPeopleWithAccess(tenantId, folderId) {
    const table = this.getTable('FolderPermissionTable');
    return table.fetchPeopleWithAccess(tenantId, folderId);
  }

  /**
   * Get a specific user's permission entity for a folder.
   * @param {string} tenantId
   * @param {string} folderId
   * @param {string} userId
   * @returns {FolderPermissionEntity|null}
   */
  async getUserPermission(tenantId, folderId, userId) {
    const table = this.getTable('FolderPermissionTable');
    return table.fetchByUserAndFolder(tenantId, folderId, userId);
  }

  /**
   * Check whether a user can edit a folder.
   * @param {string} tenantId
   * @param {string} folderId
   * @param {string} userId
   * @returns {boolean}
   */
  async canEdit(tenantId, folderId, userId) {
    const permission = await this.getUserPermission(tenantId, folderId, userId);
    return permission ? permission.canEdit() : false;
  }
}

module.exports = FolderPermissionService;
