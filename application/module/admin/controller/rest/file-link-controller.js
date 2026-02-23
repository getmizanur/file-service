// application/module/admin/controller/rest/file-link-controller.js
const AdminRestController = require('./admin-rest-controller');

class FileLinkController extends AdminRestController {

  /**
   * POST /api/file/link/create
   * Create public link
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const req = this.getRequest();
      const fileId = req.getPost('file_id');
      const role = req.getPost('role');

      if (!fileId) throw new Error('File ID is required');

      const token = await this.getSm().get('FileMetadataService')
        .createPublicLink(fileId, email, { role });

      const link = token ? `/s/${token}` : null;
      return this.ok({ success: true, data: { link, token } });
    } catch (e) {
      return this.handleException(e);
    }
  }

  /**
   * DELETE /api/file/link/revoke
   * Revoke public link
   */
  async deleteAction() {
    try {
      const { email } = await this.requireIdentity();
      const req = this.getRequest();
      const fileId = req.getPost('file_id') || req.getQuery('file_id');

      if (!fileId) throw new Error('File ID is required');

      await this.getSm().get('FileMetadataService').revokePublicLink(fileId, email);

      return this.ok({ success: true });
    } catch (e) {
      return this.handleException(e);
    }
  }

  /**
   * PUT /api/file/link/copy
   * Generate/Rotate restricted link token
   */
  async putAction() {
    try {
      const { email } = await this.requireIdentity();
      const req = this.getRequest();
      const fileId = req.getPost('file_id') || req.getQuery('file_id');

      if (!fileId) throw new Error('File ID is required');

      const token = await this.getSm().get('FileMetadataService')
        .generateRestrictedLink(fileId, email);

      return this.ok({ success: true, data: { token } });
    } catch (e) {
      console.error('[FileLinkController] Error:', e);
      return this.handleException(e);
    }
  }

  /**
   * POST /admin/file/link/public-copy
   * Generate/Get public link key (Publish File)
   */
  async copyAction() {
    try {
      const { email } = await this.requireIdentity();
      const req = this.getRequest();
      const fileId = req.getPost('file_id');

      if (!fileId) throw new Error('File ID is required');

      const publicKey = await this.getSm().get('FileMetadataService')
        .publishFile(fileId, email);

      const host = req.getHeader('host');
      const expressReq = req.getExpressRequest();
      const protocol = (expressReq.secure || expressReq.get('x-forwarded-proto') === 'https') ? 'https' : 'http';
      const link = `${protocol}://${host}/p/${publicKey}`;

      return this.ok({ success: true, data: { link, public_key: publicKey } });
    } catch (e) {
      console.error('[FileLinkController] copyAction Error:', e);
      return this.ok({ success: false, message: e.message });
    }
  }

  /**
   * POST /admin/file/link/toggle-public
   * Enable/Disable public link
   */
  async toggleAction() {
    try {
      const { email } = await this.requireIdentity();
      const req = this.getRequest();
      const fileId = req.getPost('file_id');
      const state = req.getPost('state');

      if (!fileId) throw new Error('File ID is required');

      const service = this.getSm().get('FileMetadataService');

      if (state === 'on') {
        const key = await service.publishFile(fileId, email);
        return this.ok({ success: true, data: { status: 'published', public_key: key } });
      } else {
        await service.unpublishFile(fileId, email);
        return this.ok({ success: true, data: { status: 'unpublished' } });
      }
    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = FileLinkController;
