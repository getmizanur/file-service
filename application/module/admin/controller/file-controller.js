// application/module/admin/controller/file-controller.js
/* eslint-disable no-undef */
const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));
const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));

class FileController extends Controller {

  preDispatch() {
    const publicActions = ['publicLinkAction', 'publicDownloadAction', 'publicServeAction'];
    const actionName = this.getRequest().getActionName();
    if (publicActions.includes(actionName)) return;

    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addInfoMessage('Your session has expired. Please log in again.');
      this.plugin('redirect').toRoute('adminLoginIndex');
      this.getRequest().setDispatched(false);
    }
  }

  async deleteAction() {
    const inputFilter = InputFilter.factory({
      id: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      }
    });
    inputFilter.setData(this.getRequest().getQuery());
    if (!inputFilter.isValid()) return this.plugin('redirect').toRoute('adminIndexList');
    const { id: fileId } = inputFilter.getValues();

    let parentFolderId = null;
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
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
    const inputFilter = InputFilter.factory({
      id: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      },
      view: {
        required: false,
        validators: [{
          name: 'InArray',
          options: { haystack: ['my-drive', 'starred', 'recent', 'shared', 'shared-with-me', 'trash'] }
        }]
      },
      layout: {
        required: false,
        validators: [{
          name: 'InArray',
          options: { haystack: ['grid', 'list'] }
        }]
      },
      folder_id: {
        required: false,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      }
    });
    inputFilter.setData(this.getRequest().getQuery());
    if (!inputFilter.isValid()) return this.plugin('redirect').toRoute('adminIndexList');
    const { id: fileId, view, layout, folder_id: folderId } = inputFilter.getValues();

    let parentFolderId = null;
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const result = await this.getServiceManager()
        .get('FileActionService')
        .starFile(fileId, authService.getIdentity().email);
      parentFolderId = result.parentFolderId;
    } catch (e) {
      console.error('[FileController] starAction error:', e.message);
      const fallbackParams = view ? { view } : { id: folderId };
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: fallbackParams });
    }

    const query = {};
    if (view) query.view = view;
    if (layout) query.layout = layout;
    if (parentFolderId) query.id = parentFolderId;
    return this.plugin('redirect').toRoute('adminIndexList', null, { query });
  }

  async downloadAction() {
    const inputFilter = InputFilter.factory({
      id: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      }
    });
    inputFilter.setData(this.getRequest().getQuery());
    if (!inputFilter.isValid()) return this.plugin('redirect').toRoute('adminIndexList');
    const { id: fileId } = inputFilter.getValues();
    const rawRes = this.getRequest().res();

    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const { file, stream } = await this.getServiceManager()
        .get('FileActionService')
        .streamDownload(fileId, authService.getIdentity().user_id);

      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `attachment; filename="${file.getOriginalFilename()}"`);

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      await promisify(pipeline)(stream, rawRes);

      this._recordDownload(file);

    } catch (e) {
      console.error('[FileController] downloadAction error:', e.message);
      if (rawRes.headersSent) {
        rawRes.end();
        return;
      }
      return this.plugin('redirect').toRoute('adminIndexList');
    }
  }

  async viewAction() {
    const inputFilter = InputFilter.factory({
      id: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      }
    });
    inputFilter.setData(this.getRequest().getQuery());
    const rawRes = this.getRequest().res();

    if (!inputFilter.isValid()) {
      return rawRes.status(400).send('Invalid request');
    }
    const { id: fileId } = inputFilter.getValues();

    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const { file, stream } = await this.getServiceManager()
        .get('FileActionService')
        .streamView(fileId, authService.getIdentity().user_id);

      const contentType = file.getContentType()
        || FileController._mimeFromFilename(file.getOriginalFilename())
        || 'application/octet-stream';
      rawRes.setHeader('Content-Type', contentType);
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);
      rawRes.setHeader('Cache-Control', 'private, max-age=3600');

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      await promisify(pipeline)(stream, rawRes);

      this._recordDownload(file);

    } catch (e) {
      console.error('[FileController] viewAction error:', e.message);
      if (rawRes.headersSent) {
        rawRes.end();
        return;
      }
      rawRes.status(404).send('File not found or access denied');
    }
  }

  async moveAction() {
    const inputFilter = InputFilter.factory({
      file_id: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      },
      target_folder_id: {
        required: false,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      }
    });
    inputFilter.setData(this.getRequest().getPost());
    if (!inputFilter.isValid()) {
      this.plugin('flashMessenger').addErrorMessage('Invalid request');
      return this.plugin('redirect').toRoute('adminIndexList');
    }
    const { file_id: fileId, target_folder_id: targetFolderId } = inputFilter.getValues();

    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      await this.getServiceManager()
        .get('FileActionService')
        .moveFile(fileId, targetFolderId, authService.getIdentity().email);

      this.plugin('flashMessenger').addSuccessMessage('File moved successfully');

      const query = targetFolderId ? { id: targetFolderId } : {};
      return this.plugin('redirect').toRoute('adminIndexList', null, { query });

    } catch (e) {
      console.error('[FileController] moveAction error:', e);
      this.plugin('flashMessenger').addErrorMessage('Failed to move file: ' + e.message);

      const referer = this.getRequest().req()?.get('Referrer');
      if (referer) return this.plugin('redirect').toUrl(referer);
      return this.plugin('redirect').toRoute('adminIndexList');
    }
  }

  async restoreAction() {
    const inputFilter = InputFilter.factory({
      id: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      }
    });
    inputFilter.setData(this.getRequest().getQuery());
    if (!inputFilter.isValid()) return this.plugin('redirect').toRoute('adminIndexList', null, { query: { view: 'trash' } });
    const { id: fileId } = inputFilter.getValues();

    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      await this.getServiceManager()
        .get('FileActionService')
        .restoreFile(fileId, authService.getIdentity().email);
    } catch (e) {
      console.error('[FileController] restoreAction error:', e);
    }
    return this.plugin('redirect').toRoute('adminIndexList', null, { query: { view: 'trash' } });
  }

  async publicLinkAction() {
    const inputFilter = InputFilter.factory({
      token: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Regex',
          options: {
            pattern: /^[a-f0-9]{64}$/,
            messageTemplate: { INVALID: 'Invalid token format' }
          }
        }]
      }
    });
    inputFilter.setData({ token: this.getRequest().getParam('token') });
    if (!inputFilter.isValid()) return this.notFoundAction();
    const { token } = inputFilter.getValues();

    try {
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
    const inputFilter = InputFilter.factory({
      token: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Regex',
          options: {
            pattern: /^[a-f0-9]{64}$/,
            messageTemplate: { INVALID: 'Invalid token format' }
          }
        }]
      }
    });
    inputFilter.setData({ token: this.getRequest().getParam('token') });
    if (!inputFilter.isValid()) return this.notFoundAction();
    const { token } = inputFilter.getValues();
    const rawRes = this.getRequest().res();

    try {
      const { file, stream } = await this.getServiceManager()
        .get('FileActionService')
        .streamPublicDownload(token);

      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);
      rawRes.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      rawRes.removeHeader('Set-Cookie');

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      await promisify(pipeline)(stream, rawRes);

      this._recordDownload(file);

    } catch (e) {
      console.error('[FileController] publicDownloadAction error:', e);
      if (rawRes.headersSent) {
        rawRes.end();
        return;
      }
      if (e.message.includes('Login required')) {
        return this.plugin('redirect').toRoute('adminLoginIndex', null, {
          query: { return_url: this.getRequest().getUri() }
        });
      }
      return this.notFoundAction();
    }
  }

  async publicServeAction() {
    const inputFilter = InputFilter.factory({
      public_key: {
        required: true,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Regex',
          options: { pattern: /^[a-f0-9]{32}$/ }
        }]
      }
    });
    inputFilter.setData({ public_key: this.getRequest().getParam('public_key') });
    if (!inputFilter.isValid()) return this.notFoundAction();
    const { public_key: publicKey } = inputFilter.getValues();
    const rawRes = this.getRequest().res();

    try {
      const { file, stream } = await this.getServiceManager()
        .get('FileActionService')
        .streamPublicServe(publicKey);

      rawRes.setHeader('Content-Type', file.getContentType() || 'application/octet-stream');
      rawRes.setHeader('Content-Disposition', `inline; filename="${file.getOriginalFilename()}"`);
      rawRes.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      rawRes.removeHeader('Set-Cookie');

      const { pipeline } = require('stream');
      const { promisify } = require('util');
      await promisify(pipeline)(stream, rawRes);

      this._recordDownload(file);

    } catch (e) {
      console.error('[FileController] publicServeAction error:', e);
      if (rawRes.headersSent) {
        rawRes.end();
        return;
      }
      return this.notFoundAction();
    }
  }

  /**
   * Best-effort download usage tracking — fire-and-forget after response is served.
   */
  _recordDownload(file) {
    const tenantId = file.getTenantId();
    const sizeBytes = file.getSizeBytes ? file.getSizeBytes() : 0;
    if (!tenantId) return;

    this.getServiceManager().get('UsageDailyService')
      .recordDownload(tenantId, sizeBytes)
      .catch(e => console.error('[FileController] Failed to record download usage:', e.message));
  }

  static _mimeFromFilename(filename) {
    if (!filename) return null;
    const ext = require('path').extname(filename).toLowerCase();
    const map = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp', '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
      '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip', '.gz': 'application/gzip', '.tar': 'application/x-tar',
      '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
      '.xml': 'application/xml', '.html': 'text/html', '.css': 'text/css',
      '.js': 'application/javascript'
    };
    return map[ext] || null;
  }
}

module.exports = FileController;
