// application/form/login-form.js
const Form = require(
  global.applicationPath('/library/form/form'));
const Text = require(
  global.applicationPath('/library/form/element/text'));
const Password = require(
  global.applicationPath('/library/form/element/password'));

const Submit = require(
  global.applicationPath('/library/form/element/submit'));
const Csrf = require(
  global.applicationPath('/library/form/element/csrf'));

/**
 * LoginForm - Form for user authentication
 * Extends the base Form class to provide login functionality
 * with username/email, password, and CSRF protection
 */
class LoginForm extends Form {
  /**
   * Constructor
   * @param {Object} options - Form options (action, method, etc.)
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * Add username field (text input)
   * Creates a text input field for username or email address
   * Styled with 'dp-input' class for consistent appearance
   * @param {string} name - Field name (default: 'username')
   * @returns {void}
   */
  addUsernameField(name = 'username') {
    const element = new Text(name);
    element.setLabel('Username');
    element.setAttributes({
      'class': 'dp-input',
      'id': 'username'
    });
    element.setLabelAttribute('class', 'dp-label');
    this.add(element);
  }

  /**
   * Add password field (password input)
   * Creates a password input field with masked character display
   * Styled with 'dp-input' class for consistent appearance
   * @param {string} name - Field name (default: 'password')
   * @returns {void}
   */
  addPasswordField(name = 'password') {
    const element = new Password(name);
    element.setLabel('Password');
    element.setAttributes({
      'class': 'dp-input',
      'id': 'password'
    });
    element.setLabelAttribute('class', 'dp-label');
    this.add(element);
  }

  /**
   * Add submit button
   * Creates a submit button with "Login" label
   * Styled with 'dp-button' class for consistent appearance
   * @param {string} name - Button name (default: 'submit')
   * @returns {void}
   */
  addSubmitButton(name = 'submit') {
    const element = new Submit(name);
    element.setValue('Login');
    element.setAttributes({
      'class': 'dp-button'
    });
    this.add(element);
  }

  /**
   * Add CSRF protection field
   * Creates a hidden CSRF token field to prevent cross-site request forgery attacks
   * The token is validated on form submission to ensure request authenticity
   * @param {string} name - Field name (default: 'csrf')
   * @param {Object} options - CSRF options (token generation settings)
   * @returns {string} The generated CSRF token
   */
  addCsrfField(name = 'csrf', options = {}) {
    const element = new Csrf(name, options);
    this.add(element);
    // Return the token for session storage or validation
    return element.getToken();
  }
}

module.exports = LoginForm;