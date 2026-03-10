const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const LoginForm = require(globalThis.applicationPath('/application/form/login-form'));

describe('LoginForm', () => {
  let form;

  beforeEach(() => {
    form = new LoginForm();
  });

  describe('constructor', () => {
    it('creates a form instance', () => {
      expect(form).toBeInstanceOf(LoginForm);
    });

    it('accepts options', () => {
      const formWithOpts = new LoginForm({ action: '/login', method: 'POST' });
      expect(formWithOpts).toBeInstanceOf(LoginForm);
    });
  });

  describe('addUsernameField()', () => {
    it('adds a username element to the form', () => {
      form.addUsernameField();
      const element = form.get('username');
      expect(element).toBeDefined();
      expect(element.getName()).toBe('username');
    });

    it('adds element with custom name', () => {
      form.addUsernameField('email');
      const element = form.get('email');
      expect(element).toBeDefined();
      expect(element.getName()).toBe('email');
    });

    it('sets label to Username', () => {
      form.addUsernameField();
      const element = form.get('username');
      expect(element.getLabel()).toBe('Username');
    });
  });

  describe('addPasswordField()', () => {
    it('adds a password element to the form', () => {
      form.addPasswordField();
      const element = form.get('password');
      expect(element).toBeDefined();
      expect(element.getName()).toBe('password');
    });

    it('adds element with custom name', () => {
      form.addPasswordField('pass');
      const element = form.get('pass');
      expect(element).toBeDefined();
      expect(element.getName()).toBe('pass');
    });

    it('sets label to Password', () => {
      form.addPasswordField();
      const element = form.get('password');
      expect(element.getLabel()).toBe('Password');
    });
  });

  describe('addSubmitButton()', () => {
    it('adds a submit element to the form', () => {
      form.addSubmitButton();
      const element = form.get('submit');
      expect(element).toBeDefined();
      expect(element.getName()).toBe('submit');
    });

    it('sets value to Login', () => {
      form.addSubmitButton();
      const element = form.get('submit');
      expect(element.getValue()).toBe('Login');
    });

    it('adds element with custom name', () => {
      form.addSubmitButton('go');
      const element = form.get('go');
      expect(element).toBeDefined();
    });
  });

  describe('addCsrfField()', () => {
    it('adds a csrf element to the form and returns a token', () => {
      const token = form.addCsrfField();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('the returned token is a hex string', () => {
      const token = form.addCsrfField();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('adds the csrf element to the form', () => {
      form.addCsrfField();
      const element = form.get('csrf');
      expect(element).toBeDefined();
      expect(element.getName()).toBe('csrf');
    });

    it('uses custom name', () => {
      form.addCsrfField('_token');
      const element = form.get('_token');
      expect(element).toBeDefined();
    });
  });
});
