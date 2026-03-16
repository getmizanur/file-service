// application/module/admin/controller/rest/file-prefetch-controller.js
const AdminRestController = require('./admin-rest-controller');

class FilePrefetchController extends AdminRestController {

  /**
   * POST /api/file/prefetch
   * Warm the cache for a file's view/download metadata and thumbnail derivative.
   * Fire-and-forget from the browser — response body is irrelevant.
   */
  async postAction() {
    try {
      const { email, tenant_id } = await this.requireUserContext();
      const fileId = this.getRequest().getPost('fileId');

      if (!fileId) {
        return this.ok({ success: false });
      }

      const sm = this.getSm();
      const qcs = sm.get('QueryCacheService');
      const tenantReg = `registry:tenant:${tenant_id}`;

      // Warm: file metadata
      const fileMetadataTable = sm.get('FileMetadataTable');
      const file = await qcs.cacheThrough(
        `file:meta:${fileId}`,
        async () => {
          const f = await fileMetadataTable.fetchById(fileId);
          return f && typeof f.toObject === 'function' ? f.toObject() : f;
        },
        { ttl: 120, registries: [tenantReg] }
      );

      if (!file) {
        return this.ok({ success: false });
      }

      // Warm: derivatives (thumbnail + preview pages)
      const derivativeTable = sm.get('FileDerivativeTable');
      await qcs.cacheThrough(
        `file:derivs:${fileId}`,
        async () => {
          const derivs = await derivativeTable.fetchByFileId(fileId);
          return derivs.map(d => typeof d.toObject === 'function' ? d.toObject() : d);
        },
        { ttl: 120, registries: [tenantReg] }
      );

      return this.ok({ success: true });
    } catch {
      // Intentionally ignored - prefetch is best-effort; failure should not break the UI
      return this.ok({ success: false });
    }
  }
}

module.exports = FilePrefetchController;
