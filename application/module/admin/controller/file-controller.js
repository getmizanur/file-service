/* eslint-disable no-undef */
const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));

class FileController extends Controller {

  preDispatch() {
    const publicActions = ['publicLink', 'publicDownload', 'public-link', 'public-download'];
    const actionName = this.getRequest().getActionName();
    if (publicActions.includes(actionName)) return;

    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addErrorMessage('You must be logged in to access this page');
      this.plugin('redirect').toRoute('adminLoginIndex');
      this.getRequest().setDispatched(false);
    }
  }

  async deleteAction() {
    let parentFolderId = null;
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const fileId = this.getRequest().getQuery('id');
      if (!fileId) throw new Error('File ID is required');

      const result = await this.getServiceManager()
        .get('FileActionService')
        .deleteFile(fileId, authService.getIdentity().email);

      parentFolderId = result.parentFolderId;
    } catch (e) {
      console.error('[FileController] deleteAction error:', e.message);
    }

    const query = parentFolderId ? { id: parentFolderId } : {};
    return this.plugin('redirect').toRoute('adminIndexList', null, { query });
  }

  async starAction() {
    const view = this.getRequest().getQuery('view');
    const layout = this.getRequest().getQuery('layout');
    let parentFolderId = null;

    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const fileId = this.getRequest().getQuery('id');
      if (!fileId) throw new Error('File ID is required');

      const result = await this.getServiceManager()
        .get('FileActionService')
        .starFile(fileId, authService.getIdentity().email);

      parentFolderId = result.parentFolderId;
    } catch (e) {
      console.error('[FileController] starAction error:', e.message);
      const fallbackParams = view ? { view } : { id: this.getRequest().getQuery('folder_id') };
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: fallbackParams });
    }

    const query = {};
    if (view) query.view = view;
    if (layout) query.layout = layout;
    if (parentFolderId) query.id = parentFolderId;
    return this.plugin('redirect').toRoute('adminIndexList', null, { query });
  }

  async downloadAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const fileId = this.getRequest().getQuery('id');
      if (!fileId) throw new Error('File ID required');

      const { file, stream } = await this.getServiceManager()
        .get('FileActionService')
        .streamDownload(fileId, authService.getIdentity().user_id);

      const rawRes = this.getRequest().getExpressRequest().res;
      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `attachment; filename="${file.getOriginalFilename()}"`);

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      await promisify(pipeline)(stream, rawRes);

    } catch (e) {
      console.error('[FileController] downloadAction error:', e.message);
      return this.plugin('redirect').toRoute('adminIndexList');
    }
  }

  async viewAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const fileId = this.getRequest().getQuery('id');
      if (!fileId) throw new Error('File ID required');

      const { file, stream } = await this.getServiceManager()
        .get('FileActionService')
        .streamView(fileId, authService.getIdentity().user_id);

      const rawRes = this.getRequest().getExpressRequest().res;
      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);
      rawRes.setHeader('Cache-Control', 'private, max-age=3600');

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      await promisify(pipeline)(stream, rawRes);

    } catch (e) {
      console.error('[FileController] viewAction error:', e.message);
      const rawRes = this.getRequest().getExpressRequest().res;
      rawRes.status(404).send('File not found or access denied');
    }
  }

  async moveAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const fileId = this.getRequest().getPost('file_id');
      const targetFolderId = this.getRequest().getPost('target_folder_id');
      if (!fileId) throw new Error('File ID is required');

      await this.getServiceManager()
        .get('FileActionService')
        .moveFile(fileId, targetFolderId, authService.getIdentity().email);

      this.plugin('flashMessenger').addSuccessMessage('File moved successfully');

      const query = targetFolderId ? { id: targetFolderId } : {};
      return this.plugin('redirect').toRoute('adminIndexList', null, { query });

    } catch (e) {
      console.error('[FileController] moveAction error:', e);
      this.plugin('flashMessenger').addErrorMessage('Failed to move file: ' + e.message);
      const referer = this.getRequest().getExpressRequest().get('Referrer');
      if (referer) return this.plugin('redirect').toUrl(referer);
      return this.plugin('redirect').toRoute('adminIndexList');
    }
  }

  async restoreAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const fileId = this.getRequest().getQuery('id');
      if (!fileId) throw new Error('File ID is required');

      await this.getServiceManager()
        .get('FileActionService')
        .restoreFile(fileId, authService.getIdentity().email);

    } catch (e) {
      console.error('[FileController] restoreAction error:', e);
    }
    return this.plugin('redirect').toRoute('adminIndexList', null, { query: { view: 'trash' } });
  }

  async publicLinkAction() {
    try {
      const token = this.getRequest().getParam('token');
      if (!token) throw new Error('Token required');

      const { file, shareLink } = await this.getServiceManager()
        .get('FileActionService')
        .resolvePublicLink(token);

      const viewModel = this.getView();
      viewModel.setVariable('file', file);
      viewModel.setVariable('shareLink', shareLink);
      viewModel.setVariable('token', token);
      viewModel.setVariable('downloadUrl', `/s/${token}/download`);
      viewModel.setTemplate('application/admin/file/public-preview.njk');

      return viewModel;

    } catch (e) {
      console.error('[FileController] publicLinkAction error:', e);
      if (e.message.includes('Login required')) {
        return this.plugin('redirect').toRoute('adminLoginIndex', null, {
          query: { return_url: this.getRequest().getUri() }
        });
      }
      return this.notFoundAction();
    }
  }

  async publicDownloadAction() {
    try {
      const token = this.getRequest().getParam('token');
      if (!token) throw new Error('Token required');

      const { file, stream } = await this.getServiceManager()
        .get('FileActionService')
        .streamPublicDownload(token);

      const rawRes = this.getRequest().getExpressRequest().res;
      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      await promisify(pipeline)(stream, rawRes);

    } catch (e) {
      console.error('[FileController] publicDownloadAction error:', e);
      if (e.message.includes('Login required')) {
        return this.plugin('redirect').toRoute('adminLoginIndex', null, {
          query: { return_url: this.getRequest().getUri() }
        });
      }
      return this.notFoundAction();
    }
  }

  async publicServeAction() {
    try {
      const publicKey = this.getRequest().getParam('public_key');
      if (!publicKey) throw new Error('Key required');

      const { file, stream } = await this.getServiceManager()
        .get('FileActionService')
        .streamPublicServe(publicKey);

      const rawRes = this.getRequest().getExpressRequest().res;
      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      await promisify(pipeline)(stream, rawRes);

    } catch (e) {
      console.error('[FileController] publicServeAction error:', e);
      return this.notFoundAction();
    }
  }
}

module.exports = FileController;
