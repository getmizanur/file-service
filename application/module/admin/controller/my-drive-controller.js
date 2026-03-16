// application/module/admin/controller/my-drive-controller.js
/* eslint-disable no-undef */
const Controller = require(globalThis.applicationPath('/library/mvc/controller/base-controller'));
const SearchForm = require(globalThis.applicationPath('/application/form/search-form'));
const InputFilter = require(globalThis.applicationPath('/library/input-filter/input-filter'));

class MyDriveController extends Controller {

  preDispatch() {
    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addInfoMessage('Your session has expired. Please log in again.');
      return this.plugin('redirect').toRoute('adminLoginIndex') || false;
    }

    this.helper('headTitle').set('Admin');
    this.getView().setVariable('searchForm', this._buildSearchForm());
  }

  _buildSearchForm() {
    const query = this.getRequest().getQuery();
    const form = new SearchForm();
    form.setAction(this.plugin('url').fromRoute('adminSearch'));
    form.setMethod('GET');
    form.setAttrib('class', 'input-group search-bar');
    form.setAttrib('id', 'search-form');
    form.addMobileSidebarToggle();
    form.addQueryField();
    form.addLayoutField();
    form.addSortField();
    form.addClearButton();
    if (query.layout) form.get('layout').setValue(query.layout);
    if (query.sort) form.get('sort').setValue(query.sort);
    if (query.q) form.get('q').setValue(query.q);
    return form;
  }

  async indexAction() {
    return this.listAction();
  }

  async listAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      const identity = authService.getIdentity();

      const inputFilter = InputFilter.factory({
        layout: {
          required: false,
          validators: [{
            name: 'InArray',
            options: { haystack: ['grid', 'list'] }
          }]
        },
        page: {
          required: false,
          filters: [{ name: 'StringTrim' }],
          validators: [{
            name: 'Regex',
            options: { pattern: /^\d+$/ }
          }]
        },
        sort: {
          required: false,
          validators: [{
            name: 'InArray',
            options: { haystack: ['name', 'owner', 'last_modified', 'size'] }
          }]
        },
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
        tree: {
          required: false,
          validators: [{
            name: 'InArray',
            options: { haystack: ['0', '1'] }
          }]
        }
      });
      inputFilter.setData(this.getRequest().getQuery());

      let layoutQuery = null;
      let sortQuery = null;
      let page = 1;
      let folderId = null;
      let treeOpen = false;

      if (inputFilter.isValid()) {
        const values = inputFilter.getValues();
        if (values.layout) layoutQuery = values.layout;
        if (values.sort) sortQuery = values.sort;
        if (values.page) page = Math.max(1, Number.parseInt(values.page, 10) || 1);
        folderId = values.id || null;
        treeOpen = values.tree === '1' || values.tree !== '0';
      }

      const result = await this.getServiceManager()
        .get('MyDriveActionService')
        .list({
          userEmail: identity.email,
          identity,
          folderId,
          layoutQuery,
          sortQuery,
          page
        });

      return this.getView()
        .setVariables(result)
        .setVariable('treeOpen', treeOpen);

    } catch (error) {
      console.error('[MyDriveController] listAction error:', error);
      this.getView().setVariable('folderTree', []);
      return this.getView();
    }
  }
}

module.exports = MyDriveController;
