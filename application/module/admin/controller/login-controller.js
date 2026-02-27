// application/module/admin/controller/login-controller.js
/* eslint-disable no-undef */
const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));
const LoginForm = require(global.applicationPath('/application/form/login-form'));
const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));

class LoginController extends Controller {

  preDispatch() {
    const actionName = this.getRouteMatch().getAction();
    if (actionName === 'indexAction' || actionName === 'loginAction') return;

    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      super.plugin('flashMessenger').addInfoMessage('Your session has expired. Please log in again.');
      return this.plugin('redirect').toRoute('adminLoginIndex');
    }

    this.getServiceManager().get('ViewHelperManager').get('headTitle').append('Admin');
  }

  async indexAction() {
    const authService = this.getServiceManager().get('AuthenticationService');

    if (authService.hasIdentity()) {
      return this.plugin('redirect').toRoute('adminDashboardIndex');
    }

    // Build the login form (presentation concern — stays in controller)
    const form = new LoginForm();
    form.setAction(super.plugin('url').fromRoute('adminLoginIndex'));
    form.setMethod('POST');
    form.addUsernameField();
    form.addPasswordField();
    form.addSubmitButton();

    if (super.getRequest().isPost()) {
      const postData = super.getRequest().getPost();

      const inputFilter = InputFilter.factory({
        username: {
          required: true,
          requiredMessage: 'Please enter username',
          filters: [
            { name: 'HtmlEntities' },
            { name: 'StringTrim' },
            { name: 'StripTags' }
          ],
          validators: [{
            name: 'EmailAddress',
            messages: {
              INVALID: 'Invalid type given. String expected',
              INVALID_FORMAT: 'The username is not a valid email address'
            }
          }]
        },
        password: {
          required: true,
          requiredMessage: 'Please enter password',
          filters: [
            { name: 'HtmlEntities' },
            { name: 'StringTrim' },
            { name: 'StripTags' }
          ],
          validators: [{
            name: 'StringLength',
            options: { name: 'password', max: 50 }
          }]
        }
      });
      inputFilter.setData(postData);

      if (!inputFilter.isValid()) {
        const formMessages = inputFilter.getMessages();
        Object.keys(formMessages).forEach((fieldName) => {
          if (form.has(fieldName)) {
            form.get(fieldName).setMessages(formMessages[fieldName]);
          }
        });
        Object.values(formMessages).flat().forEach((msg) => super.plugin('flashMessenger').addErrorMessage(msg));
      } else {
        const values = inputFilter.getValues();
        const result = await this.getServiceManager()
          .get('LoginActionService')
          .authenticate({ username: values.username, password: values.password });

        if (result.success) {
          const authStorage = authService.getStorage();
          authStorage.write(result.identity);

          const expressSession = this.getSession();
          await new Promise((resolve, reject) => {
            expressSession.save((err) => err ? reject(err) : resolve());
          });

          super.plugin('flashMessenger').addSuccessMessage('Login successful');
          return this.plugin('redirect').toRoute('adminIndexList');
        } else {
          super.plugin('flashMessenger').addErrorMessage('Authentication unsuccessful');
        }
      }
    }

    return this.getView().setVariable('loginForm', form);
  }

  async logoutAction() {
    const expressRequest = this.getRequest().getExpressRequest();

    await new Promise((resolve, reject) => {
      expressRequest.session.destroy((err) => err ? reject(err) : resolve());
    });

    return this.plugin('redirect').toRoute('adminLoginIndex');
  }
}

module.exports = LoginController;
