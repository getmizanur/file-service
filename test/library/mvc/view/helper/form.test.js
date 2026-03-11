const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Form = require(path.join(projectRoot, 'library/mvc/view/helper/form'));

describe('Form View Helper', () => {
  let form;

  beforeEach(() => {
    form = new Form();
  });

  describe('render', () => {
    it('should return this when no arguments', () => {
      expect(form.render()).toBe(form);
    });

    it('should render openTag for form object', () => {
      const formObj = { getAttributes: () => ({ action: '/submit', method: 'post' }) };
      const result = form.render(formObj);
      expect(result).toContain('<form');
      expect(result).toContain('action="/submit"');
      expect(result).toContain('method="post"');
    });

    it('should extract nunjucks context from last arg', () => {
      const formObj = { getAttributes: () => ({ action: '/test' }) };
      const ctx = { ctx: {} };
      const result = form.render(formObj, ctx);
      expect(result).toContain('action="/test"');
    });
  });

  describe('openTag', () => {
    it('should return bare <form> when no form argument', () => {
      expect(form.openTag(null)).toBe('<form>');
    });

    it('should render attributes from getAttributes', () => {
      const formObj = { getAttributes: () => ({ action: '/post', method: 'POST', id: 'myForm' }) };
      const tag = form.openTag(formObj);
      expect(tag).toContain('action="/post"');
      expect(tag).toContain('method="POST"');
      expect(tag).toContain('id="myForm"');
      expect(tag).toMatch(/^<form .+>$/);
    });

    it('should use getAttribs as fallback', () => {
      const formObj = { getAttribs: () => ({ action: '/legacy' }) };
      const tag = form.openTag(formObj);
      expect(tag).toContain('action="/legacy"');
    });

    it('should skip null/undefined/false attributes', () => {
      const formObj = { getAttributes: () => ({ action: '/test', hidden: null, disabled: false, name: undefined }) };
      const tag = form.openTag(formObj);
      expect(tag).toContain('action="/test"');
      expect(tag).not.toContain('hidden');
      expect(tag).not.toContain('disabled');
      expect(tag).not.toContain('name');
    });

    it('should render boolean true attributes without value', () => {
      const formObj = { getAttributes: () => ({ novalidate: true }) };
      const tag = form.openTag(formObj);
      expect(tag).toContain('novalidate ');
    });

    it('should escape attribute values', () => {
      const formObj = { getAttributes: () => ({ action: '/test?a=1&b=2' }) };
      const tag = form.openTag(formObj);
      expect(tag).toContain('action="/test?a=1&amp;b=2"');
    });

    it('should handle form with no getAttributes or getAttribs', () => {
      const tag = form.openTag({});
      expect(tag).toContain('<form');
    });

    it('should handle getAttributes returning null (line 33-38)', () => {
      const formObj = { getAttributes: () => null };
      const tag = form.openTag(formObj);
      expect(tag).toContain('<form');
      expect(tag).toContain('>');
    });

    it('should handle getAttributes returning non-object string (line 38)', () => {
      const formObj = { getAttributes: () => 'not-an-object' };
      const tag = form.openTag(formObj);
      expect(tag).toContain('<form');
    });

    it('should skip inherited attributes via Object.hasOwn (line 41)', () => {
      const parent = { inherited: 'nope' };
      const attrs = Object.create(parent);
      attrs.action = '/submit';
      const formObj = { getAttributes: () => attrs };
      const tag = form.openTag(formObj);
      expect(tag).toContain('action="/submit"');
      expect(tag).not.toContain('inherited');
    });
  });

  describe('closeTag', () => {
    it('should return </form>', () => {
      expect(form.closeTag()).toBe('</form>');
    });
  });
});
