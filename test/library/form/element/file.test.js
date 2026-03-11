const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;
const File = require(path.join(projectRoot, 'library/form/element/file'));

describe('File Element', () => {
  it('should create file input with type=file', () => {
    const file = new File();
    expect(file.getAttribute('type')).toBe('file');
  });

  it('should set name from constructor', () => {
    const file = new File('avatar');
    expect(file.getName()).toBe('avatar');
  });

  it('should handle null name', () => {
    const file = new File(null);
    expect(file.getAttribute('type')).toBe('file');
  });

  it('should handle empty string name', () => {
    const file = new File('');
    expect(file.getAttribute('type')).toBe('file');
  });
});
