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
      const { file_id: fileId, role } = this.validate(
        {
          file_id: { required: true, validators: [{ name: 'Uuid' }] },
          role: { required: false, validators: [{ name: 'InArray', options: { haystack: ['viewer', 'editor', 'commenter'] } }] }
        },
        this.getRequest().getPost()
      );

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
      const { file_id: fileId } = this.validate(
        { file_id: { required: true, validators: [{ name: 'Uuid' }] } },
        { ...req.getPost(), ...req.getQuery() }
      );

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
      const { file_id: fileId } = this.validate(
        { file_id: { required: true, validators: [{ name: 'Uuid' }] } },
        { ...req.getPost(), ...req.getQuery() }
      );

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
      const { file_id: fileId } = this.validate(
        { file_id: { required: true, validators: [{ name: 'Uuid' }] } },
        this.getRequest().getPost()
      );

      const publicKey = await this.getSm().get('FileMetadataService')
        .publishFile(fileId, email);

      const baseUrl = (process.env.BASE_URL || '').replace(/\/+$/, '');
      const link = baseUrl ? `${baseUrl}/p/${publicKey}` : `/p/${publicKey}`;

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
      const { file_id: fileId, state } = this.validate(
        {
          file_id: { required: true, validators: [{ name: 'Uuid' }] },
          state: { required: true, validators: [{ name: 'InArray', options: { haystack: ['on', 'off'] } }] }
        },
        this.getRequest().getPost()
      );

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
