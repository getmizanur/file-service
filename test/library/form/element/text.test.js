const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Text = require(path.join(projectRoot, 'library/form/element/text'));

describe('Text Element', () => {

  it('should have type "text"', () => {
    const el = new Text('username');
    expect(el.getAttribute('type')).toBe('text');
  });

  it('should set name when provided', () => {
    const el = new Text('username');
    expect(el.getName()).toBe('username');
  });

  it('should not set name when called with no arguments', () => {
    const el = new Text();
    expect(el.getName()).toBeNull();
    expect(el.getAttribute('type')).toBe('text');
  });

  it('should not set name when called with null', () => {
    const el = new Text(null);
    expect(el.getName()).toBeNull();
  });

  it('should not set name when called with undefined', () => {
    const el = new Text(undefined);
    expect(el.getName()).toBeNull();
  });

  it('should not set name when called with empty string', () => {
    const el = new Text('');
    expect(el.getName()).toBeNull();
  });
});
