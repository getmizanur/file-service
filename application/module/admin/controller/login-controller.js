/* eslint-disable no-undef */
const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));
const LoginForm = require(global.applicationPath('/application/form/login-form'));

class LoginController extends Controller {

  preDispatch() {
    const actionName = this.getRequest().getActionName();
    if (actionName === 'indexAction' || actionName === 'loginAction') return;

    const authService = this.getServiceManager().get('AuthenticationService');
    if (!authService.hasIdentity()) {
      super.plugin('flashMessenger').addErrorMessage('You must be logged in to access this page');
      this.plugin('redirect').toRoute('adminLoginIndex');
      this.getRequest().setDispatched(false);
      return;
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

      const result = await this.getServiceManager()
        .get('LoginActionService')
        .authenticate(postData);

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
        // Apply field-level messages to the form if coming from input filter
        if (result.formMessages) {
          Object.keys(result.formMessages).forEach((fieldName) => {
            if (form.has(fieldName)) {
              form.get(fieldName).setMessages(result.formMessages[fieldName]);
            }
          });
          const flat = Object.values(result.formMessages).flat();
          flat.forEach((msg) => super.plugin('flashMessenger').addErrorMessage(msg));
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
