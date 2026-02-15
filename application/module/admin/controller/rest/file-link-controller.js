const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));

class FileLinkController extends RestController {

  /**
   * POST /admin/file/link/create
   * Create public link
   */
  async postAction() {
    try {
      const req = this.getRequest();
      const fileId = req.getPost('file_id');
      const role = req.getPost('role');
      const userEmail = 'admin@dailypolitics.com';

      if (!fileId) throw new Error('File ID is required');

      const service = this.getServiceManager().get('FileMetadataService');
      const token = await service.createPublicLink(fileId, userEmail, { role });

      // Return the full URL
      const link = `/s/${token}`;

      return this.ok({ success: true, data: { link, token } });
    } catch (e) {
      return this.handleException(e);
    }
  }

  /**
   * DELETE /admin/file/link/revoke
   * Revoke public link
   * Note: Client must send DELETE method or we usage POST with _method=DELETE if framework supports it.
   * But we will update client to send DELETE.
   * We need to handle body in DELETE? 
   * Specifics: allow body in DELETE is not standard but often supported. 
   * Better to use query param for ID if DELETE?
   * Or x-www-form-urlencoded body. 
   * Let's support both or check request.
   * The original code got file_id from Post.
   * In a DELETE request, getPost() might be empty if body is not parsed.
   * BaseController might parse if content-type is set.
   */
  async deleteAction() {
    try {
      const req = this.getRequest();
      // Try getting from Body (if client sends body) or Query
      let fileId = req.getPost('file_id') || req.getQuery('file_id');
      // Often DELETE requests carry ID in URL, but here our route is /admin/file/link/revoke (resource collectionish?)
      // Ideally it should be DELETE /admin/file/link/:id 
      // But we are keeping the route structure /admin/file/link/revoke for now?
      // Actually, REST would be DELETE /admin/file/link?file_id=...
      // Let's support getting it from body if sent, or query.

      // If the route is /admin/file/link/revoke, it's an RPC style URL.
      // If we usage REST controller, we map DELETE to this action.

      const userEmail = 'admin@dailypolitics.com';

      if (!fileId) {
        // Try reading raw body if needed, but getPost should work if body-parser works.
        throw new Error('File ID is required');
      }

      const service = this.getServiceManager().get('FileMetadataService');
      await service.revokePublicLink(fileId, userEmail);

      return this.ok({ success: true });
    } catch (e) {
      return this.handleException(e);
    }
  }

  /**
   * PUT /admin/file/link/copy
   * Generate/Rotate restricted link token
   */
  async putAction() {
    try {
      const req = this.getRequest();
      const fileId = req.getPost('file_id') || req.getQuery('file_id');
      const userEmail = 'admin@dailypolitics.com';

      if (!fileId) throw new Error('File ID is required');

      console.log('[FileLinkController] Generating restricted link for', fileId);

      const service = this.getServiceManager().get('FileMetadataService');
      const token = await service.generateRestrictedLink(fileId, userEmail);

      return this.ok({
        success: true,
        data: {
          token: token
        }
      });
    } catch (e) {
      console.error('[FileLinkController] Error:', e);
      return this.handleException(e);
    }
  }
}

module.exports = FileLinkController;
