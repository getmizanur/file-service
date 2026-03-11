const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Password = require(path.join(projectRoot, 'library/form/element/password'));

describe('Password', () => {
  describe('constructor', () => {
    it('should set name and type when name provided', () => {
      const el = new Password('pass');
      expect(el.getName()).toBe('pass');
      expect(el.getAttribute('type')).toBe('password');
    });

    it('should not set name when null', () => {
      const el = new Password(null);
      expect(el.getName()).toBeNull();
      expect(el.getAttribute('type')).toBe('password');
    });

    it('should not set name when undefined (default)', () => {
      const el = new Password();
      expect(el.getName()).toBeNull();
    });

    it('should not set name when empty string', () => {
      const el = new Password('');
      expect(el.getName()).toBeNull();
    });

    it('should inherit Element methods', () => {
      const el = new Password('pw');
      el.setValue('secret123');
      expect(el.getValue()).toBe('secret123');
    });
  });
});
