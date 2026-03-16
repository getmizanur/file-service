const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FormXhtml = require(globalThis.applicationPath('/library/mvc/view/helper/form-xhtml'));
const Xhtml = require(globalThis.applicationPath('/library/form/element/xhtml'));

describe('FormXhtml Helper', () => {
  let helper;

  beforeEach(() => {
    helper = new FormXhtml();
  });

  it('returns empty string for null element', () => {
    expect(helper.render(null)).toBe('');
  });

  it('returns empty string for undefined element', () => {
    expect(helper.render(undefined)).toBe('');
  });

  it('renders a button with inner SVG content', () => {
    const el = new Xhtml('clear');
    el.setTag('button');
    el.setAttributes({ type: 'button', class: 'btn btn-link', title: 'Clear' });
    el.setContent('<svg width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line></svg>');

    const html = helper.render(el);
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('class="btn btn-link"');
    expect(html).toContain('title="Clear"');
    expect(html).toContain('<svg width="18" height="18">');
    expect(html).toContain('</button>');
  });

  it('renders a span with text content', () => {
    const el = new Xhtml('label');
    el.setTag('span');
    el.setAttributes({ class: 'badge' });
    el.setContent('Hello');

    const html = helper.render(el);
    expect(html).toContain('<span');
    expect(html).toContain('class="badge"');
    expect(html).toContain('Hello');
    expect(html).toContain('</span>');
  });

  it('renders with empty content', () => {
    const el = new Xhtml('empty');
    el.setTag('div');
    el.setAttributes({ class: 'wrapper' });

    const html = helper.render(el);
    expect(html).toContain('<div');
    expect(html).toContain('class="wrapper"');
    expect(html).toContain('></div>');
  });

  it('does not include value attribute in output', () => {
    const el = new Xhtml('test');
    el.setTag('button');
    el.setValue('some-value');
    el.setContent('Click');

    const html = helper.render(el);
    expect(html).not.toContain('value=');
    expect(html).toContain('Click');
  });

  it('defaults to div tag', () => {
    const el = new Xhtml('block');
    el.setContent('content');

    const html = helper.render(el);
    expect(html).toContain('<div');
    expect(html).toContain('</div>');
  });

  it('supports extra attributes override', () => {
    const el = new Xhtml('btn');
    el.setTag('button');
    el.setAttributes({ class: 'btn' });
    el.setContent('OK');

    const html = helper.render(el, { class: 'btn btn-primary', disabled: true });
    expect(html).toContain('class="btn btn-primary"');
    expect(html).toContain('disabled');
  });

  it('deduplicates class names', () => {
    const el = new Xhtml('btn');
    el.setTag('button');
    el.setAttributes({ class: 'btn btn-link' });
    el.setContent('X');

    const html = helper.render(el, { class: 'btn btn-link active' });
    expect(html).toContain('class="btn btn-link active"');
  });

  it('renders an anchor tag with href', () => {
    const el = new Xhtml('link');
    el.setTag('a');
    el.setAttributes({ href: '/page', class: 'nav-link' });
    el.setContent('Page');

    const html = helper.render(el);
    expect(html).toContain('<a');
    expect(html).toContain('href="/page"');
    expect(html).toContain('Page');
    expect(html).toContain('</a>');
  });

  it('skips null and false attributes', () => {
    const el = new Xhtml('test');
    el.setTag('button');
    el.setAttributes({ class: 'btn', disabled: false, 'data-x': null });
    el.setContent('Go');

    const html = helper.render(el);
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('data-x');
  });
});
