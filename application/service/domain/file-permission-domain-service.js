// application/service/domain/file-permission-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');

class FilePermissionService extends AbstractDomainService {
  constructor() {
    super();
  }

  /**
   * Grant or update a user's role on a file.
   * @param {string} tenantId
   * @param {string} fileId
   * @param {string} userId
   * @param {string} role - 'owner'|'editor'|'commenter'|'viewer'
   * @param {string} grantedBy - user_id of the actor
   * @returns {FilePermissionEntity|null}
   */
  async grant(tenantId, fileId, userId, role, grantedBy) {
    const table = this.getTable('FilePermissionTable');
    return table.upsertPermission(tenantId, fileId, userId, role, grantedBy);
  }

  /**
   * Revoke a user's permission on a file.
   * @param {string} tenantId
   * @param {string} fileId
   * @param {string} userId
   */
  async revoke(tenantId, fileId, userId) {
    const table = this.getTable('FilePermissionTable');
    return table.deleteByFileAndUser(tenantId, fileId, userId);
  }

  /**
   * Get all people with access to a file (with user details).
   * @param {string} tenantId
   * @param {string} fileId
   * @returns {FilePermissionUserDTO[]}
   */
  async getPeopleWithAccess(tenantId, fileId) {
    const table = this.getTable('FilePermissionTable');
    return table.fetchPeopleWithAccess(tenantId, fileId);
  }

  /**
   * Get a specific user's permission entity for a file.
   * @param {string} tenantId
   * @param {string} fileId
   * @param {string} userId
   * @returns {FilePermissionEntity|null}
   */
  async getUserPermission(tenantId, fileId, userId) {
    const table = this.getTable('FilePermissionTable');
    return table.fetchByUserAndFile(tenantId, fileId, userId);
  }

  /**
   * Check whether a user has any access to a file.
   * @param {string} tenantId
   * @param {string} fileId
   * @param {string} userId
   * @returns {boolean}
   */
  async hasAccess(tenantId, fileId, userId) {
    const permission = await this.getUserPermission(tenantId, fileId, userId);
    return !!permission;
  }
}

module.exports = FilePermissionService;
