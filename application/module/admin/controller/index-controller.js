/* eslint-disable no-undef */
const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));

class IndexController extends Controller {

  preDispatch() {
    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addErrorMessage('You must be logged in to access this page');
      this.plugin('redirect').toRoute('adminLoginIndex');
      this.getRequest().setDispatched(false);
    }
  }

  async indexAction() {
    return this.listAction();
  }

  async listAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const identity = authService.getIdentity();

      let folderId = this.getQuery('id') || this.getParam('id');
      if (folderId === 'undefined') folderId = null;

      const result = await this.getServiceManager()
        .get('IndexActionService')
        .list({
          userEmail: identity.email,
          identity,
          folderId,
          rawQuery: this.getRequest().getQuery()
        });

      const viewModel = this.getView();
      viewModel.setVariable('folderTree', result.folderTree);
      viewModel.setVariable('currentFolderId', result.currentFolderId);
      viewModel.setVariable('rootFolderId', result.rootFolderId);
      viewModel.setVariable('viewMode', result.viewMode);
      viewModel.setVariable('layoutMode', result.layoutMode);
      viewModel.setVariable('filesList', result.filesList);
      viewModel.setVariable('subFolders', result.subFolders);
      viewModel.setVariable('starredFileIds', result.starredFileIds);
      viewModel.setVariable('starredFolderIds', result.starredFolderIds);
      viewModel.setVariable('expandedFolderIds', result.expandedFolderIds);

      return viewModel;

    } catch (error) {
      console.error('[IndexController] listAction error:', error);
      this.getView().setVariable('folderTree', []);
      return this.getView();
    }
  }
}

module.exports = IndexController;
