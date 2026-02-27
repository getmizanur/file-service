// application/module/admin/controller/folder-controller.js
/* eslint-disable no-undef */
const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));
const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));

class FolderController extends Controller {

  preDispatch() {
    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addInfoMessage('Your session has expired. Please log in again.');
      this.plugin('redirect').toRoute('adminLoginIndex');
      this.getRequest().setDispatched(false);
    }
  }

  async createAction() {
    const inputFilter = InputFilter.factory({
      parent_folder_id: {
        required: false,
        filters: [
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'Uuid'
        }]
      },
      name: {
        required: true,
        requiredMessage: 'Folder name is required',
        filters: [
          { name: 'HtmlEntities' },
          { name: 'StringTrim' },
          { name: 'StripTags' }
        ],
        validators: [{
          name: 'StringLength',
          options: { min: 1, max: 255 }
        }]
      }
    });
    inputFilter.setData(this.getRequest().getPost());
    if (!inputFilter.isValid()) return this.plugin('redirect').toRoute('adminIndexList');
    const { parent_folder_id: parentFolderId, name } = inputFilter.getValues();

    try {
      const userEmail = this.getServiceManager().get('AuthenticationService').getIdentity().email;
      await this.getServiceManager()
        .get('FolderActionService')
        .createFolder(parentFolderId || null, name, userEmail);
    } catch (e) {
      console.error('[FolderController] createAction error:', e);
    }
    return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: parentFolderId } });
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
    const { id: folderId } = inputFilter.getValues();

    let parentFolderId = null;
    try {
      const userEmail = this.getServiceManager().get('AuthenticationService').getIdentity().email;
      const result = await this.getServiceManager()
        .get('FolderActionService')
        .deleteFolder(folderId, userEmail);
      parentFolderId = result.parentFolderId;
    } catch (e) {
      console.error('[FolderController] deleteAction error:', e.message);
    }
    return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: parentFolderId } });
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
    const { id: folderId } = inputFilter.getValues();

    try {
      const userEmail = this.getServiceManager().get('AuthenticationService').getIdentity().email;
      const { folder, fileEntries } = await this.getServiceManager()
        .get('FolderActionService')
        .prepareDownload(folderId, userEmail);

      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 9 } });
      const response = this.getRequest().getExpressResponse();

      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

      archive.pipe(response);
      for (const { stream, filename } of fileEntries) {
        archive.append(stream, { name: filename });
      }
      await archive.finalize();

    } catch (e) {
      console.error('[FolderController] downloadAction error:', e);
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
    const { id: folderId } = inputFilter.getValues();

    try {
      const userEmail = this.getServiceManager().get('AuthenticationService').getIdentity().email;
      await this.getServiceManager()
        .get('FolderActionService')
        .restoreFolder(folderId, userEmail);
    } catch (e) {
      console.error('[FolderController] restoreAction error:', e);
    }
    return this.plugin('redirect').toRoute('adminIndexList', null, { query: { view: 'trash' } });
  }
  async moveAction() {
    const inputFilter = InputFilter.factory({
      folder_id: {
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
    const { folder_id: folderId, target_folder_id: targetFolderId } = inputFilter.getValues();

    try {
      const userEmail = this.getServiceManager().get('AuthenticationService').getIdentity().email;
      await this.getServiceManager()
        .get('FolderActionService')
        .moveFolder(folderId, targetFolderId, userEmail);

      this.plugin('flashMessenger').addSuccessMessage('Folder moved successfully');

      const query = targetFolderId ? { id: targetFolderId } : {};
      return this.plugin('redirect').toRoute('adminIndexList', null, { query });

    } catch (e) {
      console.error('[FolderController] moveAction error:', e);
      this.plugin('flashMessenger').addErrorMessage('Failed to move folder: ' + e.message);
      const referer = this.getRequest().getExpressRequest().get('Referrer');
      if (referer) return this.plugin('redirect').toUrl(referer);
      return this.plugin('redirect').toRoute('adminIndexList');
    }
  }
}

module.exports = FolderController;
