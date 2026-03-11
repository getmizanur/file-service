const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const FormPassword = require(path.join(projectRoot, 'library/mvc/view/helper/form-password'));

describe('FormPassword', () => {
  let helper;

  beforeEach(() => {
    helper = new FormPassword();
  });

  it('should return empty string for null element', () => {
    expect(helper.render(null)).toBe('');
  });

  it('should return empty string for undefined element', () => {
    expect(helper.render(undefined)).toBe('');
  });

  it('should render password input with element attributes', () => {
    const element = {
      getAttributes: () => ({ name: 'passwd', id: 'passwd-field', value: 'secret' })
    };
    const html = helper.render(element);
    expect(html).toContain('<input ');
    expect(html).toContain('name="passwd"');
    expect(html).toContain('type="password"');
    expect(html).toContain('/>');
  });

  it('should default type to password if not specified', () => {
    const element = { getAttributes: () => ({ name: 'pw' }) };
    const html = helper.render(element);
    expect(html).toContain('type="password"');
  });

  it('should not override explicit type', () => {
    const element = { getAttributes: () => ({ name: 'pw', type: 'text' }) };
    const html = helper.render(element);
    expect(html).toContain('type="text"');
    expect(html).not.toContain('type="password"');
  });

  it('should merge extra attributes', () => {
    const element = { getAttributes: () => ({ name: 'pw' }) };
    const html = helper.render(element, { class: 'form-control', placeholder: 'Enter' });
    expect(html).toContain('class="form-control"');
    expect(html).toContain('placeholder="Enter"');
  });

  it('should deduplicate classes', () => {
    const element = { getAttributes: () => ({ name: 'pw', class: 'form-control form-control' }) };
    const html = helper.render(element);
    expect(html).toContain('class="form-control"');
  });

  it('should handle boolean true attributes', () => {
    const element = { getAttributes: () => ({ name: 'pw', required: true, disabled: true }) };
    const html = helper.render(element);
    expect(html).toContain('required ');
    expect(html).toContain('disabled ');
  });

  it('should skip null/undefined/false attributes', () => {
    const element = {
      getAttributes: () => ({ name: 'pw', placeholder: null, disabled: false, title: undefined })
    };
    const html = helper.render(element);
    expect(html).not.toContain('placeholder');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('title');
  });

  it('should escape attribute values', () => {
    const element = { getAttributes: () => ({ name: 'pw', placeholder: 'a"b&c' }) };
    const html = helper.render(element);
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  it('should handle element without getAttributes', () => {
    const element = { name: 'pw' };
    const html = helper.render(element);
    expect(html).toContain('<input ');
    expect(html).toContain('type="password"');
  });

  // --- Branch coverage ---
  it('should handle getAttributes returning null (line 24)', () => {
    const element = { getAttributes: () => null };
    const html = helper.render(element);
    expect(html).toContain('<input');
    expect(html).toContain('type="password"');
  });

  it('should skip inherited attributes via Object.hasOwn (line 43)', () => {
    const parent = { inherited: 'nope' };
    const attrs = Object.create(parent);
    attrs.name = 'pw';
    const element = { getAttributes: () => attrs };
    const html = helper.render(element);
    expect(html).not.toContain('inherited');
    expect(html).toContain('name="pw"');
  });

  it('should handle no class attribute (line 30)', () => {
    const element = { getAttributes: () => ({ name: 'pw' }) };
    const html = helper.render(element);
    expect(html).not.toContain('class=');
  });
});
