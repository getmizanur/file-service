const path = require('path');
// Dynamically resolve the project root
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => {
  if (p === '/library/mvc/view/helper/abstract-helper') {
    return path.join(projectRoot, 'library/mvc/view/helper/abstract-helper.js');
  }
  return path.join(projectRoot, p.replace(/^\//, ''));
};

// Mock StringUtil dependency
jest.mock('../../../library/util/string-util', () => ({
  strtolower: (str) => (typeof str === 'string' ? str.toLowerCase() : str)
}));

let DetailHelper;
beforeAll(() => {
  const helperPath = global.applicationPath('/application/helper/detail-helper');
  DetailHelper = require(helperPath);
});

describe('DetailHelper', () => {
  let helper;
  beforeEach(() => {
    helper = new DetailHelper();
  });

  it('should return empty string if no element provided', () => {
    const html = helper.render(null, 'Help message');
    expect(html).toBe('');
  });

  it('should return empty string if no message provided', () => {
    const element = { label: 'Title' };
    expect(helper.render(element, null)).toBe('');
    expect(helper.render(element, undefined)).toBe('');
    expect(helper.render(element, 123)).toBe('');
  });

  it('should use label from element.label', () => {
    const element = { label: 'Title' };
    const html = helper.render(element, 'Help message');
    expect(html).toContain('Help with title');
    expect(html).toContain('Help message');
  });

  it('should use label from element.getLabel()', () => {
    const element = { getLabel: () => 'Description' };
    const html = helper.render(element, 'Some help');
    expect(html).toContain('Help with description');
    expect(html).toContain('Some help');
  });

  it('should fallback to "this field" if no label', () => {
    const element = {};
    const html = helper.render(element, 'Fallback help');
    expect(html).toContain('Help with this field');
    expect(html).toContain('Fallback help');
  });

  it('should escape HTML in message (no-op in current code)', () => {
    const element = { label: 'Title' };
    const html = helper.render(element, '<b>bold</b> & <script>alert(1)</script>');
    expect(html).toContain('<b>bold</b> & <script>alert(1)</script>');
  });

  it('should generate unique id for each call', () => {
    const element = { label: 'Title' };
    const html1 = helper.render(element, 'Help 1');
    const html2 = helper.render(element, 'Help 2');
    const id1 = html1.match(/id="(detail-[^"]+)"/)[1];
    const id2 = html2.match(/id="(detail-[^"]+)"/)[1];
    expect(id1).not.toBe(id2);
  });
});
