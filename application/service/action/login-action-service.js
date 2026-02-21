/* eslint-disable no-undef */
const AbstractActionService = require(global.applicationPath('/application/service/abstract-action-service'));
const DbAdapter = require(global.applicationPath('/library/authentication/adapter/db-adapter'));

class LoginActionService extends AbstractActionService {

  /**
   * Authenticate the user with pre-validated credentials.
   *
   * @param {object} params
   * @param {string} params.username  - validated email address
   * @param {string} params.password  - validated password
   * @returns {{ success: boolean, identity?: object, messages?: string[] }}
   */
  async authenticate({ username, password }) {
    const db = this.getServiceManager().get('DbAdapter');

    const adapter = new DbAdapter(
      db,
      'app_user',
      'email',
      'password_hash',
      null,
      {
        credentialTable: 'user_auth_password',
        credentialJoinColumn: 'user_id',
        identityJoinColumn: 'user_id',
        passwordAlgoColumn: 'password_algo',
        activeCondition: { column: 'status', value: 'active' }
      }
    );
    adapter.setUsername(username);
    adapter.setPassword(password);

    const authService = this.getServiceManager().get('AuthenticationService');
    authService.setAdapter(adapter);
    const result = await authService.authenticate();

    if (result.isValid()) {
      return { success: true, identity: result.getIdentity() };
    }

    return { success: false, messages: result.getMessages() };
  }
}

module.exports = LoginActionService;
