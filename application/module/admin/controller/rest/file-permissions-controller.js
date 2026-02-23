// application/module/admin/controller/rest/file-permissions-controller.js
const AdminRestController = require('./admin-rest-controller');

class FilePermissionsController extends AdminRestController {

  /**
   * GET /api/file/permissions/:id
   */
  async getAction() {
    try {
      const { user_id } = await this.requireUserContext();
      const tenantId = await this.requireTenantId();

      const { id: fileId } = this.validate(
        { id: { required: true } },
        { id: this.getParam('id') || this.getRequest().getQuery('id') }
      );

      const service = this.getSm().get('FileMetadataService');

      const [permissions, shareStatus] = await Promise.all([
        service.getFilePermissions(fileId, tenantId),
        service.getFileSharingStatus(fileId)
      ]);

      return this.ok({
        success: true,
        data: {
          permissions,
          currentUserId: user_id,
          publicLink: shareStatus ? {
            general_access: shareStatus.general_access,
            token: shareStatus.token_hash,
            role: shareStatus.role,
            expires_dt: shareStatus.expires_dt,
            revoked_dt: shareStatus.revoked_dt,
            share_id: shareStatus.share_id,
            isActive: !!shareStatus.share_id
          } : {
            general_access: 'restricted',
            isActive: false
          }
        }
      });
    } catch (e) {
      console.error('[FilePermissionsController] Error:', e.message);
      return this.handleException(e);
    }
  }
}

module.exports = FilePermissionsController;
