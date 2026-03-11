const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Hidden = require(path.join(projectRoot, 'library/form/element/hidden'));

describe('Hidden', () => {
  describe('constructor', () => {
    it('should set name and type when name provided', () => {
      const el = new Hidden('token');
      expect(el.getName()).toBe('token');
      expect(el.getAttribute('type')).toBe('hidden');
    });

    it('should not set name when null', () => {
      const el = new Hidden(null);
      expect(el.getName()).toBeNull();
      expect(el.getAttribute('type')).toBe('hidden');
    });

    it('should not set name when undefined (default)', () => {
      const el = new Hidden();
      expect(el.getName()).toBeNull();
    });

    it('should not set name when empty string', () => {
      const el = new Hidden('');
      expect(el.getName()).toBeNull();
    });

    it('should inherit Element methods', () => {
      const el = new Hidden('h');
      el.setValue('secret');
      expect(el.getValue()).toBe('secret');
      el.setLabel('My Hidden');
      expect(el.getLabel()).toBe('My Hidden');
    });
  });
});
