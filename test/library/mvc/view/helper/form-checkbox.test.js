const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const FormCheckbox = require(path.join(projectRoot, 'library/mvc/view/helper/form-checkbox'));

describe('FormCheckbox', () => {
  let helper;

  beforeEach(() => {
    helper = new FormCheckbox();
  });

  describe('render with null/undefined element', () => {
    it('should return empty string for null', () => {
      expect(helper.render(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(helper.render(undefined)).toBe('');
    });
  });

  describe('render with element', () => {
    it('should render basic checkbox', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', value: '1' }),
      };
      const html = helper.render(element);
      expect(html).toContain('<input');
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('name="agree"');
      expect(html).toContain('value="1"');
    });

    it('should preserve existing type attribute', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', type: 'checkbox' }),
      };
      const html = helper.render(element);
      expect(html).toContain('type="checkbox"');
    });

    it('should merge extra attributes', () => {
      const element = {
        getAttributes: () => ({ name: 'agree' }),
      };
      const html = helper.render(element, { class: 'custom-check', id: 'agree-cb' });
      expect(html).toContain('class="custom-check"');
      expect(html).toContain('id="agree-cb"');
    });

    it('should handle boolean attributes (checked, disabled)', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', checked: true, disabled: true }),
      };
      const html = helper.render(element);
      expect(html).toMatch(/checked\s/);
      expect(html).toMatch(/disabled\s/);
    });

    it('should skip null/undefined/false attributes', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', 'data-x': null, 'data-y': undefined, 'data-z': false }),
      };
      const html = helper.render(element);
      expect(html).not.toContain('data-x');
      expect(html).not.toContain('data-y');
      expect(html).not.toContain('data-z');
    });

    it('should deduplicate class attribute', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', class: 'a b a' }),
      };
      const html = helper.render(element);
      expect(html).toContain('class="a b"');
    });
  });

  describe('unchecked value hidden input', () => {
    it('should add hidden input when getUncheckedValue returns a value', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', value: '1' }),
        getUncheckedValue: () => '0',
      };
      const html = helper.render(element);
      expect(html).toContain('<input type="hidden"');
      expect(html).toContain('name="agree"');
      expect(html).toContain('value="0"');
    });

    it('should not add hidden input when getUncheckedValue returns undefined', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', value: '1' }),
        getUncheckedValue: () => undefined,
      };
      const html = helper.render(element);
      expect(html).not.toContain('type="hidden"');
    });

    it('should not add hidden input when no name attribute', () => {
      const element = {
        getAttributes: () => ({ value: '1' }),
        getUncheckedValue: () => '0',
      };
      const html = helper.render(element);
      expect(html).not.toContain('type="hidden"');
    });

    it('should not add hidden input when element has no getUncheckedValue', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', value: '1' }),
      };
      const html = helper.render(element);
      expect(html).not.toContain('type="hidden"');
    });
  });

  describe('element without getAttributes', () => {
    it('should handle element without getAttributes method', () => {
      const element = { name: 'agree' };
      const html = helper.render(element);
      expect(html).toContain('<input');
      expect(html).toContain('type="checkbox"');
    });
  });

  describe('branch coverage', () => {
    it('should handle getAttributes returning null (line 24)', () => {
      const element = { getAttributes: () => null };
      const html = helper.render(element);
      expect(html).toContain('<input');
      expect(html).toContain('type="checkbox"');
    });

    it('should handle getUncheckedValue returning null (line 46)', () => {
      const element = {
        getAttributes: () => ({ name: 'agree', value: '1' }),
        getUncheckedValue: () => null
      };
      const html = helper.render(element);
      expect(html).not.toContain('type="hidden"');
    });

    it('should skip inherited attributes via Object.hasOwn (line 61)', () => {
      const parent = { inherited: 'nope' };
      const attrs = Object.create(parent);
      attrs.name = 'agree';
      const element = { getAttributes: () => attrs };
      const html = helper.render(element);
      expect(html).not.toContain('inherited');
      expect(html).toContain('name="agree"');
    });

    it('should handle no class attribute (line 31)', () => {
      const element = { getAttributes: () => ({ name: 'agree' }) };
      const html = helper.render(element);
      expect(html).not.toContain('class=');
    });
  });

  describe('with Nunjucks context', () => {
    it('should extract context from last argument', () => {
      const element = {
        getAttributes: () => ({ name: 'test' }),
      };
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(element, {}, ctx);
      expect(html).toContain('<input');
    });
  });
});
