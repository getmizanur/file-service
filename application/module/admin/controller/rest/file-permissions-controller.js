const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));

class FilePermissionsController extends RestController {

  /**
   * GET /admin/file/permissions/:id
   */
  async getAction() {
    try {
      console.log('FilePermissionsController.getAction called');
      // Hybrid approach: Check route param OR query param to support generic clients
      const id = this.getParam('id') || this.getQuery('id');
      console.log('Resolved ID:', id);

      const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));
      console.log('InputFilter loaded');

      const filter = InputFilter.factory({
        id: {
          required: true
        }
      });
      console.log('Filter created');

      filter.setData({ id });
      console.log('Data set');

      if (!filter.isValid()) {
        console.log('Filter invalid');
        throw new Error('File ID required'); // Custom error
      }
      console.log('Filter valid');

      const fileId = filter.getValue('id');

      const service = this.getServiceManager().get('FileMetadataService');

      // We need tenantId? The service method uses it?
      // The `getFileSharingStatus` I wrote only uses `fileId` in the WHERE clause, 
      const user = this.getUser();
      if (!user) throw new Error('User not found');

      const folderService = this.getServiceManager().get('FolderService');
      const rootFolder = await folderService.getRootFolderByUserEmail(user.email);
      const tenantId = rootFolder.getTenantId();

      const [permissions, shareStatus] = await Promise.all([
        service.getFilePermissions(fileId, tenantId),
        service.getFileSharingStatus(fileId) // This returns { general_access, share_id, token_hash, ... }
      ]);

      return this.ok({
        success: true,
        data: {
          permissions,
          // Construct publicLink object matching admin.js expectations but enriched
          publicLink: shareStatus ? {
            general_access: shareStatus.general_access, // PASSED!
            token: shareStatus.token_hash,
            role: shareStatus.role,
            expires_dt: shareStatus.expires_dt,
            revoked_dt: shareStatus.revoked_dt, // Should be null if active, but good to pass
            share_id: shareStatus.share_id,
            isActive: !!shareStatus.share_id // Flag for UI convenience
          } : {
            general_access: 'restricted', // Default if not found (should not happen if file exists)
            isActive: false
          }
        }
      });
    } catch (e) {
      console.error('FilePermissionsController Error Stack:', e.stack); // Log stack!
      return this.handleException(e);
    }
  }
}

module.exports = FilePermissionsController;
