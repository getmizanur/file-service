const path = require('path');
// Dynamically resolve the project root
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => {
  if (p === '/library/mvc/view/helper/abstract-helper') {
    return path.join(projectRoot, 'library/mvc/view/helper/abstract-helper.js');
  }
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let ErrorDecoratorHelper;
beforeAll(() => {
  const helperPath = global.applicationPath('/application/helper/error-decorator-helper');
  ErrorDecoratorHelper = require(helperPath);
});

describe('ErrorDecoratorHelper', () => {
  let helper;
  beforeEach(() => {
    helper = new ErrorDecoratorHelper();
  });

  it('should return empty string if element is missing', () => {
    expect(helper.render(null)).toBe('');
    expect(helper.render(undefined)).toBe('');
  });

  it('should return empty string if element.getMessages is not a function', () => {
    expect(helper.render({})).toBe('');
    expect(helper.render({ getMessages: 123 })).toBe('');
  });

  it('should return error class if element has error messages', () => {
    const element = { getMessages: () => ['Error 1', 'Error 2'] };
    expect(helper.render(element)).toBe('dp-input--error');
  });

  it('should return custom error class if provided', () => {
    const element = { getMessages: () => ['Error'] };
    expect(helper.render(element, 'custom-error-class')).toBe('custom-error-class');
  });

  it('should return empty string if element.getMessages returns empty array', () => {
    const element = { getMessages: () => [] };
    expect(helper.render(element)).toBe('');
  });

  it('should return empty string if element.getMessages returns non-array', () => {
    const element = { getMessages: () => null };
    expect(helper.render(element)).toBe('');
    const element2 = { getMessages: () => 'not-an-array' };
    expect(helper.render(element2)).toBe('');
  });
});
