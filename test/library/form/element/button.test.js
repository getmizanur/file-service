const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;
const Button = require(path.join(projectRoot, 'library/form/element/button'));

describe('Button Element', () => {
  it('should create button with type=button', () => {
    const btn = new Button();
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('should set name and value from constructor', () => {
    const btn = new Button('submit');
    expect(btn.getName()).toBe('submit');
    expect(btn.getValue()).toBe('Submit');
  });

  it('should handle null name', () => {
    const btn = new Button(null);
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('should handle empty string name', () => {
    const btn = new Button('');
    expect(btn.getAttribute('type')).toBe('button');
  });
});
