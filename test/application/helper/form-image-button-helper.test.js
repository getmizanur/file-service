const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FormImageButtonHelper = require(globalThis.applicationPath('/application/helper/form-image-button-helper'));
const FormImageButton = require(globalThis.applicationPath('/application/form/element/form-image-button'));

describe('FormImageButtonHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new FormImageButtonHelper();
  });

  it('returns empty string for null element', () => {
    expect(helper.render(null)).toBe('');
  });

  it('renders a button with SVG content', () => {
    const el = new FormImageButton('clear');
    el.setAttributes({
      class: 'btn btn-link',
      title: 'Clear'
    });
    el.setContent('<svg><line x1="0" y1="0"></line></svg>');

    const html = helper.render(el);
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('class="btn btn-link"');
    expect(html).toContain('title="Clear"');
    expect(html).toContain('<svg><line x1="0" y1="0"></line></svg>');
    expect(html).toContain('</button>');
  });

  it('renders a button with image content', () => {
    const el = new FormImageButton('icon');
    el.setAttributes({ class: 'icon-btn' });
    el.setContent('<img src="icon.png" alt="icon" />');

    const html = helper.render(el);
    expect(html).toContain('<button');
    expect(html).toContain('<img src="icon.png" alt="icon" />');
    expect(html).toContain('</button>');
  });

  it('supports extra attributes', () => {
    const el = new FormImageButton('btn');
    el.setContent('X');

    const html = helper.render(el, { class: 'custom', 'data-action': 'close' });
    expect(html).toContain('class="custom"');
    expect(html).toContain('data-action="close"');
  });
});
