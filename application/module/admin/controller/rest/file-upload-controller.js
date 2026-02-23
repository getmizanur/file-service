// application/module/admin/controller/rest/file-upload-controller.js
const AdminRestController = require('./admin-rest-controller');
const uuid = require('uuid');

class FileUploadController extends AdminRestController {

  /**
   * POST /api/file/upload
   * Query: folder_id, filename, content_type, size
   * Body: Binary File Content
   */
  async postAction() {
    let fileId = null;
    let tenantId = null;
    let userId = null;

    try {
      const { email, user_id, tenant_id } = await this.requireUserContext();
      userId = user_id;
      tenantId = tenant_id;

      const req = this.getRequest();
      const query = req.getQuery();

      const folderId = query.folder_id;
      const filename = query.filename;
      const contentType = query.content_type || req.getHeader('content-type') || 'application/octet-stream';
      const sizeBytes = parseInt(query.size || req.getHeader('content-length') || 0);

      if (!folderId) throw new Error('Folder ID is required');
      if (!filename) throw new Error('Filename is required');

      const sm = this.getSm();
      fileId = uuid.v4();

      // Lookup storage backend
      const storageService = sm.get('StorageService');
      const localBackend = await storageService.findBackendByProvider('local_fs');
      if (!localBackend) throw new Error('No enabled local_fs storage backend found');

      const objectKey = `tenants/${tenantId}/folders/${folderId}/${fileId}/${filename}`;

      // Prepare Upload (DB)
      const fileMetadataService = sm.get('FileMetadataService');
      await fileMetadataService.prepareUpload({
        file_id: fileId,
        tenant_id: tenantId,
        folder_id: folderId,
        storage_backend_id: localBackend.storage_backend_id,
        original_filename: filename,
        content_type: contentType,
        size_bytes: sizeBytes,
        object_key: objectKey,
        user_id: userId,
      });

      // Write to Storage
      const writeResult = await storageService.write(req, localBackend, objectKey);

      // Finalize Upload
      await fileMetadataService.finalizeUpload(fileId, tenantId, {
        size_bytes: writeResult.size,
        user_id: userId
      });

      return this.ok({
        status: 'success',
        data: { file_id: fileId, size: writeResult.size }
      });

    } catch (e) {
      console.error('[FileUploadController] Upload Error:', e);

      if (fileId && tenantId && userId) {
        try {
          await this.getSm().get('FileMetadataService').failUpload(fileId, tenantId, userId);
        } catch (cleanupErr) {
          console.error('Failed to mark upload as failed', cleanupErr);
        }
      }

      return this.handleException(e);
    }
  }
}

module.exports = FileUploadController;
