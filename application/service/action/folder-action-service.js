/* eslint-disable no-undef */
const AbstractActionService = require(global.applicationPath('/application/service/abstract-action-service'));

class FolderActionService extends AbstractActionService {

  /**
   * Create a new folder and return its ID.
   */
  async createFolder(parentFolderId, name, userEmail) {
    const sm = this.getServiceManager();

    if (parentFolderId) {
      const { tenant_id } = await this._resolveUser(userEmail);
      const parent = await sm.get('FolderService').getFolderById(parentFolderId);
      if (!parent || parent.getTenantId() !== tenant_id) throw new Error('Parent folder not found or access denied');
    }

    const newFolderId = await sm.get('FolderService').createFolder(userEmail, name, parentFolderId);
    return { newFolderId };
  }

  /**
   * Soft-delete a folder and return the parent folder ID for redirect.
   */
  async deleteFolder(folderId, userEmail) {
    const sm = this.getServiceManager();
    const folderService = sm.get('FolderService');
    const { tenant_id } = await this._resolveUser(userEmail);

    const folder = await folderService.getFolderById(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.getTenantId() !== tenant_id) throw new Error('Access denied');

    let parentFolderId = folder.getParentFolderId();
    await folderService.deleteFolder(folderId, userEmail);

    if (!parentFolderId) {
      try {
        const rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
        if (rootFolder) parentFolderId = rootFolder.getFolderId();
      } catch (e) {
        console.warn('[FolderActionService] Failed to resolve root folder for redirect:', e.message);
      }
    }

    return { parentFolderId };
  }

  /**
   * Fetch a folder and all its file streams, ready for zip assembly.
   * Returns { folder, fileEntries: [{ stream, filename }] }.
   * The controller is responsible for archiving and piping the response.
   */
  async prepareDownload(folderId, userEmail) {
    const sm = this.getServiceManager();
    const folderService = sm.get('FolderService');
    const storageService = sm.get('StorageService');
    const { tenant_id } = await this._resolveUser(userEmail);

    const folder = await folderService.getFolderById(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.getTenantId() !== tenant_id) throw new Error('Access denied');

    const table = sm.get('FileMetadataService').getTable('FileMetadataTable');
    const files = await table.fetchAllByFolder(folderId);

    const fileEntries = [];
    for (const file of files) {
      if (file.deleted_at) continue;

      const backendId = file.getStorageBackendId();
      const backend = await storageService.getBackend(backendId);
      const objectKey = typeof file.getObjectKey === 'function' ? file.getObjectKey() : file.object_key;

      try {
        const stream = await storageService.read(backend, objectKey);
        fileEntries.push({ stream, filename: file.getOriginalFilename() });
      } catch (e) {
        console.error(`[FolderActionService] Failed to get stream for file ${file.getFileId()}:`, e.message);
      }
    }

    return { folder, fileEntries };
  }

  /**
   * Restore a soft-deleted folder.
   */
  async restoreFolder(folderId, userEmail) {
    const sm = this.getServiceManager();
    const { tenant_id } = await this._resolveUser(userEmail);

    const folderTable = sm.get('FolderService').getTable('FolderTable');
    const folder = await folderTable.fetchByIdIncludeDeleted(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.getTenantId() !== tenant_id) throw new Error('Access denied');

    await sm.get('FolderService').restoreFolder(folderId, userEmail);
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  /**
   * Resolve { userId, tenantId } for an authenticated user by email.
   */
  async _resolveUser(userEmail) {
    return this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);
  }
}

module.exports = FolderActionService;
