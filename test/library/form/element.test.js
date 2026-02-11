const path = require('path');
// Dynamically resolve the project root
const projectRoot = path.resolve(__dirname, '../../..');
global.applicationPath = (p) => {
  if (p === '/library/util/var-util') {
    // Mock VarUtil for isObject
    return path.join(projectRoot, 'library/util/var-util.js');
  }
  return path.join(projectRoot, p.replace(/^\//, ''));
};

// Mock VarUtil dependency
jest.mock('../../../library/util/var-util', () => ({
  isObject: (val) => val && typeof val === 'object' && !Array.isArray(val)
}));

let Element;
beforeAll(() => {
  const elementPath = global.applicationPath('/library/form/element');
  Element = require(elementPath);
});

describe('Element', () => {
  let el;
  beforeEach(() => {
    el = new Element();
  });

  it('should set and get messages', () => {
    expect(el.getMessages()).toEqual([]);
    el.setMessages(['Error 1', 'Error 2']);
    expect(el.getMessages()).toEqual(['Error 1', 'Error 2']);
  });

  it('should overwrite messages on setMessages', () => {
    el.setMessages(['First']);
    expect(el.getMessages()).toEqual(['First']);
    el.setMessages(['Second', 'Third']);
    expect(el.getMessages()).toEqual(['Second', 'Third']);
  });

  it('should allow empty array for messages', () => {
    el.setMessages([]);
    expect(el.getMessages()).toEqual([]);
  });
});
