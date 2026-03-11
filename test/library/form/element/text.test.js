const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Text = require(path.join(projectRoot, 'library/form/element/text'));

describe('Text', () => {
  describe('constructor', () => {
    it('should set name and type when name provided', () => {
      const el = new Text('username');
      expect(el.getName()).toBe('username');
      expect(el.getAttribute('type')).toBe('text');
    });

    it('should not set name when null', () => {
      const el = new Text(null);
      expect(el.getName()).toBeNull();
      expect(el.getAttribute('type')).toBe('text');
    });

    it('should not set name when undefined (default)', () => {
      const el = new Text();
      expect(el.getName()).toBeNull();
    });

    it('should not set name when empty string', () => {
      const el = new Text('');
      expect(el.getName()).toBeNull();
    });

    it('should inherit Element methods', () => {
      const el = new Text('email');
      el.setValue('test@example.com');
      expect(el.getValue()).toBe('test@example.com');
      el.setLabel('Email');
      expect(el.getLabel()).toBe('Email');
      el.setAttribute('placeholder', 'Enter email');
      expect(el.getAttribute('placeholder')).toBe('Enter email');
    });
  });
});
