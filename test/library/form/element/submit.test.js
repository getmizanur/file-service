const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Submit = require(path.join(projectRoot, 'library/form/element/submit'));

describe('Submit', () => {
  describe('constructor', () => {
    it('should set name, type, and default value from name', () => {
      const el = new Submit('login');
      expect(el.getName()).toBe('login');
      expect(el.getAttribute('type')).toBe('submit');
      expect(el.getValue()).toBe('Login'); // ucfirst
    });

    it('should not set name when null', () => {
      const el = new Submit(null);
      expect(el.getName()).toBeNull();
      expect(el.getAttribute('type')).toBe('submit');
    });

    it('should not set name when undefined (default)', () => {
      const el = new Submit();
      expect(el.getName()).toBeNull();
    });

    it('should not set name when empty string', () => {
      const el = new Submit('');
      expect(el.getName()).toBeNull();
    });

    it('should ucfirst the name for default value', () => {
      const el = new Submit('submit');
      expect(el.getValue()).toBe('Submit');
    });

    it('should not override existing value when already set (branch line 14)', () => {
      // Monkey-patch setName to also pre-set value, so getValue() !== null at line 14
      const Element = require(path.join(projectRoot, 'library/form/element'));
      const origSetName = Element.prototype.setName;
      Element.prototype.setName = function(name) {
        origSetName.call(this, name);
        this.setAttribute('value', 'PreExisting');
      };
      const el = new Submit('save');
      expect(el.getValue()).toBe('PreExisting');
      Element.prototype.setName = origSetName;
    });

    it('should not set value when name is null', () => {
      const el = new Submit();
      expect(el.getValue()).toBeNull();
    });
  });
});
