const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));

class FileController extends Controller {

  preDispatch() {
    console.log('[FileController.preDispatch] Called');

    const publicActions = ['publicLink', 'publicDownload', 'public-link', 'public-download'];
    const actionName = this.getRequest().getActionName();

    console.log(`[FileController.preDispatch] Action: ${actionName}`);

    // Skip auth check for public/share routes
    if (publicActions.includes(actionName)) {
      console.log(`[FileController.preDispatch] Skipping auth for public action: ${actionName}`);
      return;
    }
  }

  async deleteAction() {
    let fileId = null;
    let parentFolderId = null;
    try {
      const authService = this.getServiceManager()
        .get('AuthenticationService');

      if (!authService.hasIdentity()) {
        this.plugin('flashMessenger').addErrorMessage(
          'You must be logged in to access this page');
        return this.plugin('redirect').toRoute('adminLoginIndex');
      }

      fileId = this.getRequest().getQuery('id');
      const userEmail = authService.getIdentity().email;

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
      const authService = this.getServiceManager()
        .get('AuthenticationService');

      if (!authService.hasIdentity()) {
        this.plugin('flashMessenger').addErrorMessage(
          'You must be logged in to access this page');
        return this.plugin('redirect').toRoute('adminLoginIndex');
      }

      const fileId = this.getRequest().getQuery('id');
      const userEmail = authService.getIdentity().email;

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
      const view = this.getRequest().getQuery('view');
      const layout = this.getRequest().getQuery('layout');

      if (view) {
        queryParams.view = view;
      }

      if (layout) {
        queryParams.layout = layout;
      }

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

      return this.plugin('redirect').toRoute('adminIndexList', null, { query: queryParams });

    } catch (e) {
      console.error(`[FileController] Star/Toggle Error:`, e.message);
      // Fallback redirect
      const view = this.getRequest().getQuery('view');
      const fallbackParams = view ? { view } : { id: this.getRequest().getQuery('folder_id') };
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: fallbackParams });
    }
  }

  async downloadAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      if (!authService.hasIdentity()) {
        throw new Error('Login required');
      }

      const fileId = this.getRequest().getQuery('id');
      const user = authService.getIdentity();

      if (!fileId) throw new Error('File ID required');

      const service = this.getServiceManager().get('FileMetadataService');
      const table = await service.getFileMetadataTable();
      const file = await table.fetchById(fileId);

      if (!file) throw new Error('File not found');
      if (file.deleted_at) throw new Error('File deleted');

      // Check Access
      // If owner, allow.
      // If shared, check permission table.
      // Or simply usage checkAccess helper if I make it reusable, but for now explicit check:

      let hasAccess = false;
      if (file.getCreatedBy() === user.user_id) {
        hasAccess = true;
      } else {
        const adapter = await service.initializeDatabase();
        const FilePermissionsTable = require('../../../table/file-permissions-table');
        const permTable = new FilePermissionsTable({ adapter });
        hasAccess = await permTable.checkPermission(file.getFileId(), user.user_id);
      }

      if (!hasAccess) throw new Error('Access denied');

      // stream file
      const storageService = this.getServiceManager().get('StorageService');
      const backendId = file.getStorageBackendId();
      const backend = await storageService.getBackend(backendId);
      const objectKey = (typeof file.getObjectKey === 'function') ? file.getObjectKey() : file.object_key;

      const stream = await storageService.read(backend, objectKey);
      const rawRes = this.getRequest().getExpressRequest().res;

      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `attachment; filename="${file.getOriginalFilename()}"`);

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      const pipe = promisify(pipeline);

      await pipe(stream, rawRes);
      return;

    } catch (e) {
      console.error('[FileController] downloadAction Error:', e.message);
      // specific error handling or redirect
      return this.plugin('redirect').toRoute('adminIndexList');
    }
  }

  async viewAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      if (!authService.hasIdentity()) {
        throw new Error('Login required');
      }

      const fileId = this.getRequest().getQuery('id');
      const user = authService.getIdentity();

      if (!fileId) throw new Error('File ID required');

      const service = this.getServiceManager().get('FileMetadataService');
      const table = await service.getFileMetadataTable();
      const file = await table.fetchById(fileId);

      if (!file) throw new Error('File not found');
      if (file.deleted_at) throw new Error('File deleted');

      // Check Access
      let hasAccess = false;
      if (file.getCreatedBy() === user.user_id) {
        hasAccess = true;
      } else {
        const adapter = await service.initializeDatabase();
        const FilePermissionsTable = require('../../../table/file-permissions-table');
        const permTable = new FilePermissionsTable({ adapter });
        hasAccess = await permTable.checkPermission(file.getFileId(), user.user_id);
      }

      if (!hasAccess) throw new Error('Access denied');

      // Stream file for inline viewing
      const storageService = this.getServiceManager().get('StorageService');
      const backendId = file.getStorageBackendId();
      const backend = await storageService.getBackend(backendId);
      const objectKey = (typeof file.getObjectKey === 'function') ? file.getObjectKey() : file.object_key;

      const stream = await storageService.read(backend, objectKey);
      const rawRes = this.getRequest().getExpressRequest().res;

      // Set headers for inline viewing (not download)
      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);

      // Add cache headers for better performance
      rawRes.setHeader('Cache-Control', 'private, max-age=3600');

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      const pipe = promisify(pipeline);

      await pipe(stream, rawRes);
      return;

    } catch (e) {
      console.error('[FileController] viewAction Error:', e.message);
      // Return 404 or error response
      const rawRes = this.getRequest().getExpressRequest().res;
      rawRes.status(404).send('File not found or access denied');
      return;
    }
  }


  // --- Share Actions ---

  /**
   * GET /admin/file/permissions?id=...
   * Returns list of users with access + current public link status
   */


  /**
   * GET /s/:token
   * Public access to shared file
   */


  // --- Share Actions ---

  /**
   * GET /admin/file/permissions?id=...
   * Returns list of users with access + current public link status
   */


  /**
   * GET /s/:token
   * Public access to shared file
   */
  async publicLinkAction() {
    try {
      const token = this.getRequest().getParam('token');
      if (!token) throw new Error('Token required');

      const service = this.getServiceManager().get('FileMetadataService');

      const ShareLinkTable = require('../../../table/share-link-table');
      const adapter = await service.initializeDatabase();
      const shareTable = new ShareLinkTable({ adapter });

      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Dual Lookup Strategy
      let shareLink = await shareTable.fetchByToken(tokenHash);

      if (!shareLink) {
        if (/^[a-f0-9]{64}$/i.test(token)) {
          shareLink = await shareTable.fetchByToken(token);
        }
      }

      if (!shareLink) {
        throw new Error('Link not found or invalid');
      }

      if (shareLink.revoked_dt) throw new Error('Link revoked');
      if (shareLink.expires_dt && new Date(shareLink.expires_dt) < new Date()) throw new Error('Link expired');

      const table = await service.getFileMetadataTable();
      const file = await table.fetchById(shareLink.file_id);

      if (!file) throw new Error('File not found');

      if (file.deleted_at) throw new Error('File deleted');

      // Check Access based on General Access setting
      const access = file.getGeneralAccess();
      console.log(`[FileController.publicLinkAction] FileID: ${file.getFileId()}, GeneralAccess: ${access}`);

      if (access === 'restricted') {
        // Perform Auth & Permission Check
        const authService = this.getServiceManager().get('AuthenticationService');
        if (!authService.hasIdentity()) {
          // Redirect to login with return URL
          const returnUrl = this.getRequest().getUri();
          return this.plugin('redirect').toRoute('adminLoginIndex', null, {
            query: { return_url: returnUrl }
          });
        }

        const user = authService.getIdentity();
        // Check if owner
        if (file.getCreatedBy() !== user.user_id) {
          const FilePermissionTable = require('../../../table/file-permission-table');
          const permTable = new FilePermissionTable({ adapter });

          // Check permission (Owner is handled by getCreatedBy check, but table check handles it too if upserted)
          const hasPerm = await permTable.fetchByUserAndFile(file.getTenantId(), file.getFileId(), user.user_id);

          if (!hasPerm) {
            // If not in permission table, deny
            // Note: FileMetadataService.prepareUpload upserts owner permission, so owner should be there.
            throw new Error('Access denied');
          }
        }
      }

      // Share link itself IS the authorization ONLY if general_access is 'anyone_with_link' OR we passed the restricted check above.
      // The link was already validated (exists, not revoked, not expired).

      const viewModel = this.getView();
      viewModel.setVariable('file', file);
      viewModel.setVariable('shareLink', shareLink);

      // Explicitly pass download URL to avoid template logic issues
      const downloadUrl = `/s/${token}/download`;

      viewModel.setVariable('token', token);
      viewModel.setVariable('downloadUrl', downloadUrl);
      viewModel.setTemplate('application/admin/file/public-preview.njk');

      return viewModel;

    } catch (e) {
      console.error('[FileController] publicLinkAction Error:', e);

      if (e.message.includes('Login required')) {
        const returnUrl = this.getRequest().getUri();
        return this.plugin('redirect').toRoute('adminLoginIndex', null, {
          query: { return_url: returnUrl }
        });
      }

      return this.notFoundAction();
    }
  }

  /**
   * GET /s/:token/download
   * Public download of shared file
   */
  async publicDownloadAction() {
    try {
      const token = this.getRequest().getParam('token');
      if (!token) throw new Error('Token required');

      const service = this.getServiceManager().get('FileMetadataService');

      // 1. Validate Token
      const ShareLinkTable = require('../../../table/share-link-table');
      const adapter = await service.initializeDatabase();
      const shareTable = new ShareLinkTable({ adapter });

      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Dual Lookup Strategy
      let shareLink = await shareTable.fetchByToken(tokenHash);

      if (!shareLink) {
        if (/^[a-f0-9]{64}$/i.test(token)) {
          shareLink = await shareTable.fetchByToken(token);
        }
      }

      if (!shareLink) throw new Error('Link not found');
      if (shareLink.revoked_dt) throw new Error('Link revoked');
      if (shareLink.expires_dt && new Date(shareLink.expires_dt) < new Date()) throw new Error('Link expired');

      // 2. Fetch File
      const table = await service.getFileMetadataTable();
      const file = await table.fetchById(shareLink.file_id);

      if (!file) throw new Error('File not found');
      if (file.deleted_at) throw new Error('File deleted');

      // Check Access based on General Access setting
      const access = file.getGeneralAccess();
      if (access === 'restricted') {
        // Perform Auth & Permission Check
        const authService = this.getServiceManager().get('AuthenticationService');
        if (!authService.hasIdentity()) {
          throw new Error('Login required');
        }

        const user = authService.getIdentity();
        // Check if owner
        if (file.getCreatedBy() !== user.user_id) {
          const FilePermissionTable = require('../../../table/file-permission-table');
          const permTable = new FilePermissionTable({ adapter });

          const hasPerm = await permTable.fetchByUserAndFile(file.getTenantId(), file.getFileId(), user.user_id);

          if (!hasPerm) {
            throw new Error('Access denied');
          }
        }
      }

      // Share link itself IS the authorization ONLY if general_access is 'anyone_with_link' OR we passed the restricted check above.

      // 4. Serve File
      const storageService = this.getServiceManager().get('StorageService');

      // Get Storage Backend
      const backendId = file.getStorageBackendId();
      // We need to fetch the backend entity to know the config/provider
      const backend = await storageService.getBackend(backendId);

      const objectKey = file.getObjectKey(); // Assuming this getter exists. If not, we might need to construct it or property access.
      // Check if file object has accessor, otherwise direct property
      const key = (typeof file.getObjectKey === 'function') ? file.getObjectKey() : file.object_key;

      if (!key) throw new Error('File object key missing');
      const stream = await storageService.read(backend, key);
      // Access raw Express response for piping
      const rawRes = this.getRequest().getExpressRequest().res;

      // Set headers on raw response (or framework response, usually framework response headers are synced or we should set on raw if piping directly)
      // Framework Response headers might not be sent if we pipe directly to rawRes?
      // Bootstrapper sends response at the end.
      // If we pipe, we are sending data NOW.
      // We should set headers on rawRes to be sure, or usage framework and ensure they are sent?
      // Bootstrapper says: `if (response.canSendHeaders()) ...`

      // Let's set headers on rawRes to be safe as we are bypassing framework render.
      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      const pipe = promisify(pipeline);

      await pipe(stream, rawRes);
      return;

    } catch (e) {
      console.error('[FileController] publicDownloadAction Error:', e);

      if (e.message.includes('Login required')) {
        const returnUrl = this.getRequest().getUri();
        return this.plugin('redirect').toRoute('adminLoginIndex', null, {
          query: { return_url: returnUrl }
        });
      }

      return this.notFoundAction();
    }
  }
  /**
   * Private helper to enforce access control
   * @param {FileMetadataEntity} file 
   */
  async checkAccess(file) {
    const access = file.getGeneralAccess();
    console.log('[FileController] Checking access. FileID:', file.getFileId(), 'Access:', access);

    // 1. If public (anyone with link), allow
    if (access === 'anyone_with_link') {
      return true;
    }

    // 2. If restricted, require login + permission
    if (access === 'restricted') {
      // Check if user is logged in
      const authService = this.getServiceManager().get('AuthenticationService');
      const user = authService.getIdentity();

      if (!user) {
        throw new Error('Login required');
      }

      // Check permission
      // Owner check
      if (file.getCreatedBy() === user.user_id) {
        return true;
      }

      // Permission Table check
      const service = this.getServiceManager().get('FileMetadataService');
      const adapter = await service.initializeDatabase();
      const FilePermissionsTable = require('../../../table/file-permissions-table');
      const permTable = new FilePermissionsTable({ adapter });

      const hasPerm = await permTable.checkPermission(file.getFileId(), user.user_id);

      if (!hasPerm) {
        throw new Error('Access denied');
      }
      return true;
    }

    // Default deny
    throw new Error('Access denied');
  }
  async publicServeAction() {
    try {
      const publicKey = this.getRequest().getParam('public_key');
      console.log(`[FileController] publicServeAction hit with key: ${publicKey}`);

      if (!publicKey) throw new Error('Key required');

      const service = this.getServiceManager().get('FileMetadataService');
      const table = await service.getFileMetadataTable();

      // 1. Lookup by public key
      // We need a specific query for this or usage fetchOne logic
      const Select = require(global.applicationPath('/library/db/sql/select'));
      const query = new Select(table.adapter);
      query.from('file_metadata')
        .columns(table.baseColumns())
        .where('public_key = ?', publicKey)
        .where('deleted_at IS NULL')
        .limit(1);

      const res = await query.execute();
      const rows = (res && res.rows) ? res.rows : (Array.isArray(res) ? res : []);

      if (rows.length === 0) {
        throw new Error('File not found');
      }

      const FileMetadataEntity = require(global.applicationPath('/application/entity/file-metadata-entity'));
      const file = new FileMetadataEntity(rows[0]);

      // 2. Check Visibility
      if (file.getVisibility() !== 'public') {
        throw new Error('File is not public');
      }

      // 3. Serve File (Stream)
      const storageService = this.getServiceManager().get('StorageService');
      const backendId = file.getStorageBackendId();
      const backend = await storageService.getBackend(backendId);

      const objectKey = (typeof file.getObjectKey === 'function') ? file.getObjectKey() : file.object_key;

      const stream = await storageService.read(backend, objectKey);
      const rawRes = this.getRequest().getExpressRequest().res;

      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      // For public link, we probably want inline display if possible (preview)
      // But if it's a binary file, browser might download.
      // Let's set inline.
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      const pipe = promisify(pipeline);

      await pipe(stream, rawRes);
      return;

    } catch (e) {
      console.error('[FileController] publicServeAction Error:', e);
      return this.notFoundAction();
    }
  }
}

module.exports = FileController;
