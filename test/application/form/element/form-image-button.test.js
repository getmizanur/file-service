const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FormImageButton = require(globalThis.applicationPath('/application/form/element/form-image-button'));

describe('FormImageButton', () => {
  let button;

  beforeEach(() => {
    button = new FormImageButton('clear');
  });

  it('sets name via constructor', () => {
    expect(button.getName()).toBe('clear');
  });

  it('defaults tag to button', () => {
    expect(button.getTag()).toBe('button');
  });

  it('defaults type to button', () => {
    expect(button.getAttribute('type')).toBe('button');
  });

  it('sets and gets content', () => {
    button.setContent('<svg>icon</svg>');
    expect(button.getContent()).toBe('<svg>icon</svg>');
  });

  it('supports setting attributes', () => {
    button.setAttributes({
      'class': 'btn btn-link',
      'id': 'my-btn',
      'title': 'Click me'
    });
    expect(button.getAttribute('class')).toBe('btn btn-link');
    expect(button.getAttribute('id')).toBe('my-btn');
    expect(button.getAttribute('title')).toBe('Click me');
  });

  it('supports chaining', () => {
    const result = button
      .setAttributes({ class: 'btn' })
      .setContent('<img src="icon.png" />');
    expect(result).toBe(button);
  });

  it('creates element without name', () => {
    const el = new FormImageButton();
    expect(el.getName()).toBeNull();
    expect(el.getTag()).toBe('button');
    expect(el.getAttribute('type')).toBe('button');
  });

  it('can override type to submit', () => {
    button.setAttribute('type', 'submit');
    expect(button.getAttribute('type')).toBe('submit');
  });
});
