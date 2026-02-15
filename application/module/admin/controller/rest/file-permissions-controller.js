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

      const [permissions, publicLink] = await Promise.all([
        service.getFilePermissions(fileId),
        service.getActivePublicLink(fileId)
      ]);

      return this.ok({
        success: true,
        data: {
          permissions,
          publicLink: publicLink ? {
            token: publicLink.token_hash,
            role: publicLink.role,
            expires_dt: publicLink.expires_dt
          } : null
        }
      });
    } catch (e) {
      console.error('FilePermissionsController Error Stack:', e.stack); // Log stack!
      return this.handleException(e);
    }
  }
}

module.exports = FilePermissionsController;
