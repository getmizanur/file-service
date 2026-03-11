const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const FormText = require(path.join(projectRoot, 'library/mvc/view/helper/form-text'));

describe('FormText', () => {
  let helper;

  beforeEach(() => {
    helper = new FormText();
  });

  it('should return empty string for null element', () => {
    expect(helper.render(null)).toBe('');
  });

  it('should return empty string for undefined element', () => {
    expect(helper.render(undefined)).toBe('');
  });

  it('should render text input with element attributes', () => {
    const element = {
      getAttributes: () => ({ name: 'username', id: 'user-field', value: 'John' })
    };
    const html = helper.render(element);
    expect(html).toContain('<input ');
    expect(html).toContain('name="username"');
    expect(html).toContain('type="text"');
    expect(html).toContain('value="John"');
    expect(html).toContain('/>');
  });

  it('should default type to text if not specified', () => {
    const element = { getAttributes: () => ({ name: 'field' }) };
    const html = helper.render(element);
    expect(html).toContain('type="text"');
  });

  it('should not override explicit type', () => {
    const element = { getAttributes: () => ({ name: 'field', type: 'email' }) };
    const html = helper.render(element);
    expect(html).toContain('type="email"');
    expect(html).not.toContain('type="text"');
  });

  it('should merge extra attributes', () => {
    const element = { getAttributes: () => ({ name: 'field' }) };
    const html = helper.render(element, { class: 'form-control', maxlength: '100' });
    expect(html).toContain('class="form-control"');
    expect(html).toContain('maxlength="100"');
  });

  it('should deduplicate classes', () => {
    const element = { getAttributes: () => ({ name: 'field', class: 'input input big input' }) };
    const html = helper.render(element);
    expect(html).toContain('class="input big"');
  });

  it('should handle boolean true attributes', () => {
    const element = { getAttributes: () => ({ name: 'field', required: true, readonly: true }) };
    const html = helper.render(element);
    expect(html).toContain('required ');
    expect(html).toContain('readonly ');
  });

  it('should skip null/undefined/false attributes', () => {
    const element = {
      getAttributes: () => ({ name: 'field', disabled: false, placeholder: null, title: undefined })
    };
    const html = helper.render(element);
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('placeholder');
    expect(html).not.toContain('title');
  });

  it('should escape attribute values', () => {
    const element = { getAttributes: () => ({ name: 'field', value: '<script>"alert"</script>' }) };
    const html = helper.render(element);
    expect(html).toContain('&lt;');
    expect(html).toContain('&quot;');
  });

  it('should handle element without getAttributes', () => {
    const element = { name: 'field' };
    const html = helper.render(element);
    expect(html).toContain('<input ');
    expect(html).toContain('type="text"');
  });

  // --- Branch coverage ---
  it('should handle getAttributes returning null (line 24)', () => {
    const element = { getAttributes: () => null };
    const html = helper.render(element);
    expect(html).toContain('<input');
    expect(html).toContain('type="text"');
  });

  it('should skip inherited attributes via Object.hasOwn (line 41)', () => {
    const parent = { inherited: 'nope' };
    const attrs = Object.create(parent);
    attrs.name = 'field';
    const element = { getAttributes: () => attrs };
    const html = helper.render(element);
    expect(html).not.toContain('inherited');
    expect(html).toContain('name="field"');
  });

  it('should handle no class attribute (line 35)', () => {
    const element = { getAttributes: () => ({ name: 'field' }) };
    const html = helper.render(element);
    expect(html).not.toContain('class=');
  });
});
