/* eslint-disable no-undef */
const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));

class FolderController extends Controller {

  preDispatch() {
    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addErrorMessage('You must be logged in to access this page');
      this.plugin('redirect').toRoute('adminLoginIndex');
      this.getRequest().setDispatched(false);
    }
  }

  async createAction() {
    let parentFolderId = null;
    try {
      parentFolderId = this.getRequest().getPost('parent_folder_id');
      const name = this.getRequest().getPost('name');
      if (!name) throw new Error('Folder name is required');

      const userEmail = this.getServiceManager().get('AuthenticationService').getIdentity().email;

      await this.getServiceManager()
        .get('FolderActionService')
        .createFolder(parentFolderId, name, userEmail);

    } catch (e) {
      console.error('[FolderController] createAction error:', e);
    }
    return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: parentFolderId } });
  }

  async deleteAction() {
    let parentFolderId = null;
    try {
      const folderId = this.getRequest().getQuery('id');
      if (!folderId) throw new Error('Folder ID is required');

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
    try {
      const folderId = this.getRequest().getQuery('id');
      if (!folderId) throw new Error('Folder ID is required');

      const { folder, fileEntries } = await this.getServiceManager()
        .get('FolderActionService')
        .prepareDownload(folderId);

      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 9 } });
      const response = this.getRequest().getExpressRequest().res;

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
    try {
      const folderId = this.getRequest().getQuery('id');
      if (!folderId) throw new Error('Folder ID is required');

      const userEmail = this.getServiceManager().get('AuthenticationService').getIdentity().email;

      await this.getServiceManager()
        .get('FolderActionService')
        .restoreFolder(folderId, userEmail);

    } catch (e) {
      console.error('[FolderController] restoreAction error:', e);
    }
    return this.plugin('redirect').toRoute('adminIndexList', null, { query: { view: 'trash' } });
  }
}

module.exports = FolderController;
