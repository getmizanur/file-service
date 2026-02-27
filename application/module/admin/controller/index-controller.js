// application/module/admin/controller/index-controller.js
/* eslint-disable no-undef */
const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));
const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));

class IndexController extends Controller {

  preDispatch() {
    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addInfoMessage('Your session has expired. Please log in again.');
      return this.plugin('redirect').toRoute('adminLoginIndex');
    }
  }

  async indexAction() {
    return this.listAction();
  }

  async listAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const identity = authService.getIdentity();

      const inputData = this.getRequest().getQuery();

      const inputFilter = InputFilter.factory({
        id: {
          required: false,
          allow_empty: true,
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
            options: { haystack: ['my-drive', 'starred', 'recent', 'shared', 'shared-with-me', 'trash', 'search'] }
          }]
        },
        layout: {
          required: false,
          validators: [{
            name: 'InArray',
            options: { haystack: ['grid', 'list'] }
          }]
        },
        q: {
          required: false,
          filters: [
            { name: 'StringTrim' },
            { name: 'StripTags' }
          ],
          validators: [{
            name: 'StringLength',
            options: { min: 1, max: 200 }
          }]
        },
        page: {
          required: false,
          filters: [
            { name: 'StringTrim' }
          ],
          validators: [{
            name: 'Regex',
            options: { pattern: /^\d+$/ }
          }]
        }
      });
      inputFilter.setData(inputData);

      let folderId = null;
      let viewMode = 'my-drive';
      let layoutQuery = null;
      let searchQuery = null;
      let page = 1;
      if (inputFilter.isValid()) {
        const values = inputFilter.getValues();
        folderId = values.id || null;
        if (values.view) viewMode = values.view;
        if (values.layout) layoutQuery = values.layout;
        if (values.q) searchQuery = values.q;
        if (values.page) page = Math.max(1, parseInt(values.page, 10) || 1);
      }

      const result = await this.getServiceManager()
        .get('IndexActionService')
        .list({
          userEmail: identity.email,
          identity,
          folderId,
          viewMode,
          layoutQuery,
          searchQuery,
          page
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
      viewModel.setVariable('searchQuery', result.searchQuery || '');
      viewModel.setVariable('pagination', result.pagination || null);

      return viewModel;

    } catch (error) {
      console.error('[IndexController] listAction error:', error);
      this.getView().setVariable('folderTree', []);
      return this.getView();
    }
  }
}

module.exports = IndexController;
