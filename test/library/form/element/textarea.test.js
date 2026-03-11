const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Textarea = require(path.join(projectRoot, 'library/form/element/textarea'));

describe('Textarea', () => {
  let ta;

  beforeEach(() => {
    ta = new Textarea('content');
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should set name when provided', () => {
      expect(ta.getName()).toBe('content');
    });

    it('should not set type attribute (textarea is not a valid type)', () => {
      expect(ta.getAttribute('type')).toBeNull();
    });

    it('should initialise textContent to empty string', () => {
      expect(ta.getTextContent()).toBe('');
    });

    it('should not set name when null', () => {
      const t = new Textarea(null);
      expect(t.getName()).toBeNull();
    });

    it('should not set name when empty string', () => {
      const t = new Textarea('');
      expect(t.getName()).toBeNull();
    });

    it('should not set name when undefined (default)', () => {
      const t = new Textarea();
      expect(t.getName()).toBeNull();
    });
  });

  // --- setTextContent / getTextContent (lines 22-33) ---
  describe('setTextContent / getTextContent', () => {
    it('should set and get text content', () => {
      const ret = ta.setTextContent('Hello world');
      expect(ret).toBe(ta);
      expect(ta.getTextContent()).toBe('Hello world');
    });

    it('should convert null to empty string', () => {
      ta.setTextContent(null);
      expect(ta.getTextContent()).toBe('');
    });

    it('should convert undefined to empty string', () => {
      ta.setTextContent(undefined);
      expect(ta.getTextContent()).toBe('');
    });

    it('should convert number to string', () => {
      ta.setTextContent(42);
      expect(ta.getTextContent()).toBe('42');
    });
  });

  // --- setValue (lines 40-43) ---
  describe('setValue', () => {
    it('should set textContent via setValue', () => {
      const ret = ta.setValue('Some text');
      expect(ret).toBe(ta);
      expect(ta.getTextContent()).toBe('Some text');
    });

    it('should convert null to empty string', () => {
      ta.setValue(null);
      expect(ta.getTextContent()).toBe('');
    });

    it('should convert undefined to empty string', () => {
      ta.setValue(undefined);
      expect(ta.getTextContent()).toBe('');
    });

    it('should convert number to string', () => {
      ta.setValue(123);
      expect(ta.getTextContent()).toBe('123');
    });
  });

  // --- getValue (lines 49-51) ---
  describe('getValue', () => {
    it('should return textContent', () => {
      ta.setTextContent('test');
      expect(ta.getValue()).toBe('test');
    });

    it('should return empty string by default', () => {
      expect(ta.getValue()).toBe('');
    });
  });
});
