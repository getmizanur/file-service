/* eslint-disable no-undef */
const AbstractActionService = require(global.applicationPath('/application/service/abstract-action-service'));

class FileActionService extends AbstractActionService {

  /**
   * Soft-delete a file and return the parent folder for redirect.
   */
  async deleteFile(fileId, userEmail) {
    const sm = this.getServiceManager();
    const fileService = sm.get('FileMetadataService');
    const table = fileService.getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);

    let parentFolderId = null;
    if (file) {
      parentFolderId = file.getFolderId();
      await fileService.deleteFile(fileId, userEmail);
    }

    if (!parentFolderId) {
      try {
        const rootFolder = await sm.get('FolderService').getRootFolderByUserEmail(userEmail);
        if (rootFolder) parentFolderId = rootFolder.getFolderId();
      } catch (e) {
        console.warn('[FileActionService] Failed to resolve root folder for redirect:', e.message);
      }
    }

    return { parentFolderId };
  }

  /**
   * Toggle star on a file and return the parent folder for redirect.
   */
  async starFile(fileId, userEmail) {
    const sm = this.getServiceManager();
    const table = sm.get('FileMetadataService').getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);

    let parentFolderId = null;
    if (file) parentFolderId = file.getFolderId();

    await sm.get('FileStarService').toggleStar(fileId, userEmail);

    if (!parentFolderId) {
      try {
        const rootFolder = await sm.get('FolderService').getRootFolderByUserEmail(userEmail);
        if (rootFolder) parentFolderId = rootFolder.getFolderId();
      } catch (e) {
        console.warn('[FileActionService] Failed to resolve root folder for redirect:', e.message);
      }
    }

    return { parentFolderId };
  }

  /**
   * Resolve a file for download. Returns { file, stream }.
   * Throws on access denial or missing file.
   */
  async streamDownload(fileId, userId) {
    return this._resolveFileStream(fileId, userId);
  }

  /**
   * Resolve a file for inline viewing. Returns { file, stream }.
   */
  async streamView(fileId, userId) {
    return this._resolveFileStream(fileId, userId);
  }

  /**
   * Move a file to a different folder.
   */
  async moveFile(fileId, targetFolderId, userEmail) {
    await this.getServiceManager().get('FileMetadataService').moveFile(fileId, targetFolderId, userEmail);
  }

  /**
   * Restore a soft-deleted file.
   */
  async restoreFile(fileId, userEmail) {
    await this.getServiceManager().get('FileMetadataService').restoreFile(fileId, userEmail);
  }

  /**
   * Validate a share-link token and return { file, shareLink, token }.
   * Enforces restricted-access auth check via AuthenticationService.
   */
  async resolvePublicLink(token) {
    const sm = this.getServiceManager();
    const shareLink = await this._resolveShareLink(token);

    const table = sm.get('FileMetadataService').getTable('FileMetadataTable');
    const file = await table.fetchById(shareLink.file_id);
    if (!file) throw new Error('File not found');
    if (file.deleted_at) throw new Error('File deleted');

    if (file.getGeneralAccess() === 'restricted') {
      await this._enforceRestrictedAccess(file);
    }

    return { file, shareLink, token };
  }

  /**
   * Validate a share-link token and stream the file. Returns { file, stream }.
   */
  async streamPublicDownload(token) {
    const sm = this.getServiceManager();
    const shareLink = await this._resolveShareLink(token);

    const table = sm.get('FileMetadataService').getTable('FileMetadataTable');
    const file = await table.fetchById(shareLink.file_id);
    if (!file) throw new Error('File not found');
    if (file.deleted_at) throw new Error('File deleted');

    if (file.getGeneralAccess() === 'restricted') {
      await this._enforceRestrictedAccess(file);
    }

    const key = typeof file.getObjectKey === 'function' ? file.getObjectKey() : file.object_key;
    if (!key) throw new Error('File object key missing');

    const storageService = sm.get('StorageService');
    const backend = await storageService.getBackend(file.getStorageBackendId());
    const stream = await storageService.read(backend, key);

    return { file, stream };
  }

  /**
   * Lookup a file by its public_key and stream it. Returns { file, stream }.
   */
  async streamPublicServe(publicKey) {
    const sm = this.getServiceManager();
    const table = sm.get('FileMetadataService').getTable('FileMetadataTable');

    const file = await table.fetchByPublicKey(publicKey);
    if (!file) throw new Error('File not found');
    if (file.getVisibility() !== 'public') throw new Error('File is not public');

    const storageService = sm.get('StorageService');
    const backend = await storageService.getBackend(file.getStorageBackendId());
    const objectKey = typeof file.getObjectKey === 'function' ? file.getObjectKey() : file.object_key;
    const stream = await storageService.read(backend, objectKey);

    return { file, stream };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  async _resolveFileStream(fileId, userId) {
    const sm = this.getServiceManager();
    const table = sm.get('FileMetadataService').getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);

    if (!file) throw new Error('File not found');
    if (file.deleted_at) throw new Error('File deleted');

    await this._checkOwnerOrPermission(file, userId);

    const storageService = sm.get('StorageService');
    const backend = await storageService.getBackend(file.getStorageBackendId());
    const objectKey = typeof file.getObjectKey === 'function' ? file.getObjectKey() : file.object_key;
    const stream = await storageService.read(backend, objectKey);

    return { file, stream };
  }

  async _checkOwnerOrPermission(file, userId) {
    if (file.getCreatedBy() === userId) return;

    const adapter = this.getServiceManager().get('DbAdapter');
    const FilePermissionsTable = require(global.applicationPath('/application/table/file-permissions-table'));
    const permTable = new FilePermissionsTable({ adapter });
    const hasAccess = await permTable.checkPermission(file.getFileId(), userId);
    if (!hasAccess) throw new Error('Access denied');
  }

  async _enforceRestrictedAccess(file) {
    const sm = this.getServiceManager();
    const authService = sm.get('AuthenticationService');
    if (!authService.hasIdentity()) throw new Error('Login required');

    const user = authService.getIdentity();
    if (file.getCreatedBy() === user.user_id) return;

    const adapter = sm.get('DbAdapter');
    const FilePermissionTable = require(global.applicationPath('/application/table/file-permission-table'));
    const permTable = new FilePermissionTable({ adapter });
    const hasPerm = await permTable.fetchByUserAndFile(file.getTenantId(), file.getFileId(), user.user_id);
    if (!hasPerm) throw new Error('Access denied');
  }

  async _resolveShareLink(token) {
    const sm = this.getServiceManager();
    const adapter = sm.get('DbAdapter');
    const ShareLinkTable = require(global.applicationPath('/application/table/share-link-table'));
    const shareTable = new ShareLinkTable({ adapter });

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    let shareLink = await shareTable.fetchByToken(tokenHash);

    if (!shareLink && /^[a-f0-9]{64}$/i.test(token)) {
      shareLink = await shareTable.fetchByToken(token);
    }

    if (!shareLink) throw new Error('Link not found or invalid');
    if (shareLink.revoked_dt) throw new Error('Link revoked');
    if (shareLink.expires_dt && new Date(shareLink.expires_dt) < new Date()) throw new Error('Link expired');

    return shareLink;
  }
}

module.exports = FileActionService;
