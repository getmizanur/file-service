const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const Xhtml = require(globalThis.applicationPath('/library/form/element/xhtml'));

describe('Xhtml Element', () => {
  let element;

  beforeEach(() => {
    element = new Xhtml('clear');
  });

  it('sets name via constructor', () => {
    expect(element.getName()).toBe('clear');
  });

  it('defaults to div tag', () => {
    expect(element.getTag()).toBe('div');
  });

  it('defaults to empty content', () => {
    expect(element.getContent()).toBe('');
  });

  it('sets and gets tag', () => {
    element.setTag('button');
    expect(element.getTag()).toBe('button');
  });

  it('lowercases tag name', () => {
    element.setTag('SPAN');
    expect(element.getTag()).toBe('span');
  });

  it('sets and gets content', () => {
    element.setContent('<svg>icon</svg>');
    expect(element.getContent()).toBe('<svg>icon</svg>');
  });

  it('appends content', () => {
    element.setContent('<span>A</span>');
    element.appendContent('<span>B</span>');
    expect(element.getContent()).toBe('<span>A</span><span>B</span>');
  });

  it('handles null content gracefully', () => {
    element.setContent(null);
    expect(element.getContent()).toBe('');
  });

  it('supports chaining', () => {
    const result = element
      .setTag('button')
      .setAttributes({ type: 'button', class: 'btn' })
      .setContent('<svg></svg>');
    expect(result).toBe(element);
  });

  it('inherits Element methods', () => {
    element.setAttributes({ id: 'my-btn', class: 'btn btn-link' });
    expect(element.getAttribute('id')).toBe('my-btn');
    expect(element.getAttribute('class')).toBe('btn btn-link');
  });

  it('creates element without name', () => {
    const el = new Xhtml();
    expect(el.getName()).toBeNull();
    expect(el.getTag()).toBe('div');
  });
});
