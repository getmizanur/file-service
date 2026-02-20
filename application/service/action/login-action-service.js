/* eslint-disable no-undef */
const AbstractActionService = require(global.applicationPath('/application/service/abstract-action-service'));
const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));
const DbAdapter = require(global.applicationPath('/library/authentication/adapter/db-adapter'));

class LoginActionService extends AbstractActionService {

  /**
   * Validate credentials and authenticate the user.
   *
   * @param {object} postData  - raw POST body (username, password)
   * @returns {{ success: boolean, identity?: object, formMessages?: object, messages?: string[] }}
   */
  async authenticate(postData) {
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
      return { success: false, formMessages: inputFilter.getMessages() };
    }

    const values = inputFilter.getValues();
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
    adapter.setUsername(values.username);
    adapter.setPassword(values.password);

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
