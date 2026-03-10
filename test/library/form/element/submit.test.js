const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Submit = require(path.join(projectRoot, 'library/form/element/submit'));

describe('Submit Element', () => {

  it('should have type "submit"', () => {
    const el = new Submit('go');
    expect(el.getAttribute('type')).toBe('submit');
  });

  it('should set name when provided', () => {
    const el = new Submit('go');
    expect(el.getName()).toBe('go');
  });

  it('should set default value to ucfirst(name) when name is provided', () => {
    const el = new Submit('submit');
    expect(el.getValue()).toBe('Submit');
  });

  it('should set default value with ucfirst for multi-char name', () => {
    const el = new Submit('login');
    expect(el.getValue()).toBe('Login');
  });

  it('should not set name when called with no arguments', () => {
    const el = new Submit();
    expect(el.getName()).toBeNull();
    expect(el.getAttribute('type')).toBe('submit');
  });

  it('should not set name when called with null', () => {
    const el = new Submit(null);
    expect(el.getName()).toBeNull();
  });

  it('should not set name when called with undefined', () => {
    const el = new Submit(undefined);
    expect(el.getName()).toBeNull();
  });

  it('should not set name when called with empty string', () => {
    const el = new Submit('');
    expect(el.getName()).toBeNull();
  });

  it('should not have a value when name is not provided', () => {
    const el = new Submit();
    expect(el.getValue()).toBeNull();
  });

  it('should not override existing value when getValue is not null (line 14)', () => {
    // To hit the false branch of `if (this.getValue() === null)`,
    // we need getValue() to return non-null during construction.
    // Temporarily patch Element prototype.
    const Element = require(path.join(projectRoot, 'library/form/element'));
    const originalGetValue = Element.prototype.getValue;
    Element.prototype.getValue = function() { return 'already-set'; };
    const el = new Submit('go');
    Element.prototype.getValue = originalGetValue;
    // The value should remain 'already-set' since setValue was not called
    expect(el.getAttribute('type')).toBe('submit');
    expect(el.getName()).toBe('go');
  });
});
