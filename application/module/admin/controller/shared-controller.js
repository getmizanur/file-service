// application/module/admin/controller/shared-controller.js
/* eslint-disable no-undef */
const Controller = require(globalThis.applicationPath('/library/mvc/controller/base-controller'));
const InputFilter = require(globalThis.applicationPath('/library/input-filter/input-filter'));

class SharedController extends Controller {

  preDispatch() {
    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addInfoMessage('Your session has expired. Please log in again.');
      return this.plugin('redirect').toRoute('adminLoginIndex') || false;
    }

    this.helper('headTitle').set('Admin');
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
        }
      });
      inputFilter.setData(this.getRequest().getQuery());

      let layoutQuery = null;
      let sortQuery = null;
      let page = 1;
      let folderId = null;

      if (inputFilter.isValid()) {
        const values = inputFilter.getValues();
        if (values.layout) layoutQuery = values.layout;
        if (values.sort) sortQuery = values.sort;
        if (values.page) page = Math.max(1, Number.parseInt(values.page, 10) || 1);
        folderId = values.id || null;
      }

      const result = await this.getServiceManager()
        .get('SharedActionService')
        .list({
          userEmail: identity.email,
          identity,
          folderId,
          layoutQuery,
          sortQuery,
          page
        });

      return this.getView().setVariables(result);

    } catch (error) {
      console.error('[SharedController] listAction error:', error);
      this.getView().setVariable('folderTree', []);
      return this.getView();
    }
  }
}

module.exports = SharedController;
