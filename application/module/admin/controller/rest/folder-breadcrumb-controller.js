// application/module/admin/controller/rest/folder-breadcrumb-controller.js
const AdminRestController = require('./admin-rest-controller');

class FolderBreadcrumbController extends AdminRestController {

  /**
   * POST /api/folder/breadcrumb
   * Returns the breadcrumb trail for a given folder ID.
   * Used for hover-over location tooltips with cache warming.
   */
  async postAction() {
    try {
      const { email, tenant_id } = await this.requireUserContext();
      const folderId = this.getRequest().getPost('folderId');

      if (!folderId) {
        return this.ok({ success: false, breadcrumbs: [] });
      }

      const sm = this.getSm();
      const qcs = sm.get('QueryCacheService');
      const folderService = sm.get('FolderService');
      const emailHash = qcs.emailHash(email);
      const tenantReg = `registry:tenant:${tenant_id}`;
      const userReg = `registry:user:${emailHash}`;

      // Fetch all folders for this tenant (cached)
      const folders = await qcs.cacheThrough(
        `folders:all:${emailHash}`,
        async () => {
          const list = await folderService.getFoldersByTenant(tenant_id);
          return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
        },
        { ttl: 120, registries: [userReg, tenantReg] }
      );

      // Resolve root folder
      const rootCtx = await qcs.cacheThrough(
        `folders:root:${emailHash}`,
        async () => {
          const result = await folderService.getRootFolderWithContext(email);
          return {
            rootFolder: typeof result.rootFolder.toObject === 'function' ? result.rootFolder.toObject() : result.rootFolder,
            user_id: result.user_id,
            tenant_id: result.tenant_id
          };
        },
        { ttl: 3600, registries: [userReg] }
      );
      const rootFolderId = rootCtx.rootFolder ? rootCtx.rootFolder.folder_id : null;

      // Build breadcrumb trail
      const folderMap = {};
      for (const f of folders) {
        folderMap[f.folder_id] = f;
      }

      const crumbs = [];
      let cur = folderId;
      while (cur && folderMap[cur]) {
        const folder = folderMap[cur];
        crumbs.unshift({ name: folder.name, folder_id: folder.folder_id });
        cur = folder.parent_folder_id;
      }

      // Replace root folder name with "My Drive"
      if (crumbs.length > 0 && crumbs[0].folder_id === rootFolderId) {
        crumbs[0].name = 'My Drive';
      }

      return this.ok({ success: true, breadcrumbs: crumbs });
    } catch {
      return this.ok({ success: false, breadcrumbs: [] });
    }
  }
}

module.exports = FolderBreadcrumbController;
