const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Password = require(path.join(projectRoot, 'library/form/element/password'));

describe('Password Element', () => {

  it('should have type "password"', () => {
    const el = new Password('pwd');
    expect(el.getAttribute('type')).toBe('password');
  });

  it('should set name when provided', () => {
    const el = new Password('pwd');
    expect(el.getName()).toBe('pwd');
  });

  it('should not set name when called with no arguments', () => {
    const el = new Password();
    expect(el.getName()).toBeNull();
    expect(el.getAttribute('type')).toBe('password');
  });

  it('should not set name when called with null', () => {
    const el = new Password(null);
    expect(el.getName()).toBeNull();
  });

  it('should not set name when called with undefined', () => {
    const el = new Password(undefined);
    expect(el.getName()).toBeNull();
  });

  it('should not set name when called with empty string', () => {
    const el = new Password('');
    expect(el.getName()).toBeNull();
  });
});
