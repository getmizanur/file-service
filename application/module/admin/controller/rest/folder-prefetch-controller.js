// application/module/admin/controller/rest/folder-prefetch-controller.js
const AdminRestController = require('./admin-rest-controller');

class FolderPrefetchController extends AdminRestController {

  /**
   * POST /api/folder/prefetch
   * Warm the cache for a folder's subfolders and files.
   * Fire-and-forget from the browser — response body is irrelevant.
   */
  async postAction() {
    try {
      const { email, tenant_id } = await this.requireUserContext();
      const folderId = this.getRequest().getPost('folderId');

      if (!folderId) {
        return this.ok({ success: false });
      }

      const sm = this.getSm();
      const qcs = sm.get('QueryCacheService');
      const folderService = sm.get('FolderService');
      const fileMetadataService = sm.get('FileMetadataService');
      const emailHash = qcs.emailHash(email);
      const tenantReg = `registry:tenant:${tenant_id}`;

      // Warm: subfolders
      await qcs.cacheThrough(
        `folders:parent:${folderId}`,
        async () => {
          const list = await folderService.getFoldersByParent(folderId, tenant_id);
          return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
        },
        { ttl: 120, registries: [tenantReg] }
      );

      // Warm: file count
      await qcs.cacheThrough(
        `files:count:${emailHash}:${folderId}`,
        () => fileMetadataService.getFilesByFolderCount(email, folderId),
        { ttl: 60, registries: [tenantReg] }
      );

      // Warm: first page of files
      await qcs.cacheThrough(
        `files:list:${emailHash}:${folderId}:25:0`,
        async () => {
          const list = await fileMetadataService.getFilesByFolder(email, folderId, 25, 0);
          return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
        },
        { ttl: 60, registries: [tenantReg] }
      );

      return this.ok({ success: true });
    } catch {
      // Intentionally ignored - prefetch is best-effort; failure should not break the UI
      return this.ok({ success: false });
    }
  }
}

module.exports = FolderPrefetchController;
