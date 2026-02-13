const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));

class FileController extends Controller {

  async deleteAction() {
    let fileId = null;
    let parentFolderId = null;
    try {
      fileId = this.getRequest().getQuery('id');
      const userEmail = 'admin@dailypolitics.com'; // Hardcoded

      if (!fileId) throw new Error('File ID is required');

      const fileService = this.getServiceManager().get('FileMetadataService');

      // Get file to know parent folder (if any) for redirect
      // Assuming fetchById is available via service or table
      // Service doesn't expose getFileById yet, but we can usage table or just delete.
      // If we delete, we might lose parent info.
      // Let's trust we are deleting from a list view where we know the context OR we fetch it.
      // FileMetadataService.deleteAction logic implementation...

      // Actually, let's just delete. If we don't know parent, we go to root.
      // But wait, the user might be deep in a folder tree.
      // We should try to find where we were.
      // Referer header? Or fetch file first.

      const table = await fileService.getFileMetadataTable();
      const file = await table.fetchById(fileId);

      if (file) {
        parentFolderId = file.getFolderId(); // Assuming getter exists
        await fileService.deleteFile(fileId, userEmail);
        console.log(`[FileController] Deleted file: ${fileId}`);
      }

      // Redirect to parent or root
      const queryParams = {};

      if (!parentFolderId) {
        try {
          // We need FolderService to get root
          const folderService = this.getServiceManager().get('FolderService');
          const rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
          if (rootFolder) {
            parentFolderId = rootFolder.folder_id;
          }
        } catch (err) {
          console.warn('[FileController] Failed to resolve root folder for redirect:', err.message);
        }
      }

      if (parentFolderId) {
        queryParams.id = parentFolderId;
      }
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: queryParams });

    } catch (e) {
      console.error('[FileController] Delete Error:', e.message);
      const queryParams = {};
      if (parentFolderId) {
        queryParams.id = parentFolderId;
      }
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: queryParams });
    }
  }

  async starAction() {
    try {
      const fileId = this.getRequest().getQuery('id');
      const userEmail = 'admin@dailypolitics.com'; // Hardcoded

      console.log(`[FileController] Star Action for ${fileId}`);

      if (!fileId) throw new Error('File ID is required');

      const sm = this.getServiceManager();
      const fileStarService = sm.get('FileStarService');
      const fileService = sm.get('FileMetadataService');

      // Check if file exists and get parent folder for redirect
      const table = await fileService.getFileMetadataTable();
      const file = await table.fetchById(fileId);

      let parentFolderId = null;
      if (file) {
        parentFolderId = file.getFolderId();
      }

      await fileStarService.toggleStar(fileId, userEmail);

      // Redirect back
      const queryParams = {};

      // If we don't have parent, try to resolve root
      if (!parentFolderId) {
        try {
          const folderService = sm.get('FolderService');
          const rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
          if (rootFolder) parentFolderId = rootFolder.folder_id;
        } catch (e) {
          console.warn('Failed to resolve root', e);
        }
      }

      if (parentFolderId) {
        queryParams.id = parentFolderId;
      }

      return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: queryParams.id } });

      return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: this.getRequest().getQuery('folder_id') } });
    } catch (e) {
      console.error(`[FileController] Star/Toggle Error:`, e.message);
      // Fallback redirect
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: this.getRequest().getQuery('folder_id') } });
    }
  }

  async uploadAction() {
    const start = Date.now();
    let fileId = null;
    let tenantId = null;
    let userId = null;

    try {
      const req = this.getRequest();
      const expressReq = req.getExpressRequest(); // We need raw request for piping
      const query = req.getQuery();

      // 1. Resolve User (Hardcoded for now as per other methods)
      const userEmail = 'admin@dailypolitics.com';
      const sm = this.getServiceManager();

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
      const { v4: uuidv4 } = require('uuid');
      fileId = uuidv4();

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
      const writeResult = await storageServiceInstance.write(expressReq, localBackend, objectKey);

      // 7. Finalize Upload
      await fileMetadataService.finalizeUpload(fileId, tenantId, {
        size_bytes: writeResult.size,
        // checksum_sha256: ... // not calculating yet for speed
        user_id: userId
      });

      // 8. Respond
      return this.plugin('json').send({
        status: 'success',
        data: {
          file_id: fileId,
          size: writeResult.size
        }
      });

    } catch (e) {
      console.error('[FileController] Upload Error:', e);

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

      return this.plugin('json').status(500).send({
        status: 'error',
        message: e.message
      });
    }
  }

  async updateAction() {
    try {
      const fileId = this.getRequest().getPost('file_id');
      const name = this.getRequest().getPost('name');
      const userEmail = 'admin@dailypolitics.com'; // Hardcoded

      if (!fileId || !name) {
        throw new Error('File ID and Name are required');
      }

      const fileService = this.getServiceManager().get('FileMetadataService');
      await fileService.updateFile(fileId, name, userEmail);

      console.log(`[FileController] Renamed file ${fileId} to ${name}`);

      this.plugin('json').send({
        success: true,
        message: 'File renamed successfully'
      });

    } catch (e) {
      console.error('[FileController] Rename Error:', e.message);
      this.plugin('json').send({
        success: false,
        message: e.message
      });
    }
  }
}

module.exports = FileController;
