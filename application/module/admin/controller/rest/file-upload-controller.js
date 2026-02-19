const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));
const uuid = require('uuid');

class FileUploadController extends RestController {

  /**
   * POST /admin/file/upload
   * Query: folder_id, filename, content_type, size
   * Body: Binary File Content
   */
  async postAction() {
    const start = Date.now();
    let fileId = null;
    let tenantId = null;
    let userId = null;

    try {
      const req = this.getRequest();
      const query = req.getQuery();

      // 1. Resolve User (Hardcoded for now as per other methods)
      const sm = this.getServiceManager();
      const authService = sm.get('AuthenticationService');
      const userEmail = authService.getIdentity().email;

      const userService = sm.get('UserService');
      const userRow = await userService.getUserWithTenantByEmail(userEmail);

      if (!userRow) throw new Error('User not found');

      userId = userRow.user_id;
      tenantId = userRow.tenant_id;

      // 2. Validate Parameters
      const folderId = query.folder_id;
      const filename = query.filename;
      const contentType = query.content_type || req.getHeader('content-type') || 'application/octet-stream';
      const sizeBytes = parseInt(query.size || req.getHeader('content-length') || 0);

      if (!folderId) throw new Error('Folder ID is required');
      if (!filename) throw new Error('Filename is required');

      // 3. Generate IDs
      fileId = uuid.v4();

      // Lookup the backend ID by provider 'local_fs'
      const storageService = sm.get('StorageService');
      const localBackend = await storageService.findBackendByProvider('local_fs');

      if (!localBackend) throw new Error('No enabled local_fs storage backend found');

      // 4. Object Key
      const objectKey = `tenants/${tenantId}/folders/${folderId}/${fileId}/${filename}`;

      // 5. Prepare Upload (DB)
      const fileMetadataService = sm.get('FileMetadataService');

      const metadata = {
        file_id: fileId,
        tenant_id: tenantId,
        folder_id: folderId,
        storage_backend_id: localBackend.storage_backend_id,
        original_filename: filename,
        content_type: contentType,
        size_bytes: sizeBytes,
        object_key: objectKey,
        user_id: userId,
        // defaults handled in service
      };

      await fileMetadataService.prepareUpload(metadata);

      // 6. Write to Storage
      const storageServiceInstance = sm.get('StorageService');
      const writeResult = await storageServiceInstance.write(req, localBackend, objectKey);

      // 7. Finalize Upload
      await fileMetadataService.finalizeUpload(fileId, tenantId, {
        size_bytes: writeResult.size,
        // checksum_sha256: ... // not calculating yet for speed
        user_id: userId
      });

      // 8. Respond
      return this.ok({
        status: 'success',
        data: {
          file_id: fileId,
          size: writeResult.size
        }
      });

    } catch (e) {
      console.error('[FileUploadController] Upload Error:', e);

      // Try to mark failed if we have IDs
      if (fileId && tenantId && userId) {
        try {
          const sm = this.getServiceManager();
          const fileMetadataService = sm.get('FileMetadataService');
          await fileMetadataService.failUpload(fileId, tenantId, userId);
        } catch (cleanupErr) {
          console.error('Failed to mark upload as failed', cleanupErr);
        }
      }

      return this.handleException(e);
    }
  }
}

module.exports = FileUploadController;
