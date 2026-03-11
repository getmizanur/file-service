const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const FormTextarea = require(path.join(projectRoot, 'library/mvc/view/helper/form-textarea'));
const Textarea = require(path.join(projectRoot, 'library/form/element/textarea'));
const Element = require(path.join(projectRoot, 'library/form/element'));

describe('FormTextarea', () => {
  let helper;

  beforeEach(() => {
    helper = new FormTextarea();
  });

  // --- render with null/falsy element ---
  describe('render with null element', () => {
    it('should return empty string for null element', () => {
      expect(helper.render(null)).toBe('');
    });

    it('should return empty string for undefined element', () => {
      expect(helper.render(undefined)).toBe('');
    });

    it('should return empty string for false element', () => {
      expect(helper.render(false)).toBe('');
    });
  });

  // --- render with Textarea element ---
  describe('render with Textarea element', () => {
    it('should render textarea with attributes from element', () => {
      const el = new Textarea('content');
      el.setAttribute('id', 'content-field');
      el.setAttribute('rows', '5');
      el.setAttribute('cols', '40');
      const result = helper.render(el);
      expect(result).toContain('<textarea');
      expect(result).toContain('</textarea>');
      expect(result).toContain('name="content"');
      expect(result).toContain('id="content-field"');
      expect(result).toContain('rows="5"');
      expect(result).toContain('cols="40"');
    });

    it('should use getValue() for text content', () => {
      const el = new Textarea('body');
      el.setValue('Hello World');
      const result = helper.render(el);
      expect(result).toContain('>Hello World</textarea>');
    });

    it('should use getTextContent() when getValue() returns null', () => {
      const el = {
        getAttributes: () => ({ name: 'notes' }),
        getValue: () => null,
        getTextContent: () => 'Fallback content'
      };
      const result = helper.render(el);
      expect(result).toContain('Fallback content');
    });

    it('should escape HTML in text content', () => {
      const el = new Textarea('desc');
      el.setValue('<script>alert("xss")</script>');
      const result = helper.render(el);
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>alert');
    });
  });

  // --- attribute merging ---
  describe('attribute merging', () => {
    it('should merge extra attributes with element attributes', () => {
      const el = new Textarea('field');
      el.setAttribute('id', 'field-1');
      const result = helper.render(el, { 'data-custom': 'value' });
      expect(result).toContain('id="field-1"');
      expect(result).toContain('data-custom="value"');
    });

    it('should let extra attributes override element attributes', () => {
      const el = new Textarea('field');
      el.setAttribute('id', 'original');
      const result = helper.render(el, { id: 'overridden' });
      expect(result).toContain('id="overridden"');
      expect(result).not.toContain('id="original"');
    });
  });

  // --- type/value removal ---
  describe('type and value removal', () => {
    it('should remove type attribute from output', () => {
      const el = new Element();
      el.setName('field');
      el.setAttribute('type', 'textarea');
      el.setAttribute('id', 'f1');
      const result = helper.render(el);
      expect(result).not.toContain('type=');
    });

    it('should remove value attribute from output', () => {
      const el = new Element();
      el.setName('field');
      el.setAttribute('value', 'some-val');
      el.setAttribute('id', 'f2');
      const result = helper.render(el);
      expect(result).not.toContain('value=');
    });

    it('should remove type from extra attribs as well', () => {
      const el = new Textarea('field');
      const result = helper.render(el, { type: 'text' });
      expect(result).not.toContain('type=');
    });
  });

  // --- class deduplication ---
  describe('class deduplication', () => {
    it('should deduplicate class names', () => {
      const el = {
        getAttributes: () => ({ name: 'test', class: 'foo bar foo baz bar' })
      };
      const result = helper.render(el);
      expect(result).toContain('class="foo bar baz"');
    });

    it('should handle single class without change', () => {
      const el = {
        getAttributes: () => ({ name: 'test', class: 'single' })
      };
      const result = helper.render(el);
      expect(result).toContain('class="single"');
    });

    it('should deduplicate merged classes from element and extra attribs', () => {
      const el = {
        getAttributes: () => ({ name: 'test', class: 'alpha' })
      };
      const result = helper.render(el, { class: 'alpha beta alpha' });
      // Extra attribs override, so class comes from extra attribs
      expect(result).toContain('class="alpha beta"');
    });
  });

  // --- boolean attributes ---
  describe('boolean attributes', () => {
    it('should render boolean true as valueless attribute', () => {
      const el = {
        getAttributes: () => ({ name: 'test', disabled: true })
      };
      const result = helper.render(el);
      expect(result).toContain('disabled ');
    });

    it('should render required as valueless attribute', () => {
      const el = {
        getAttributes: () => ({ name: 'test', required: true, readonly: true })
      };
      const result = helper.render(el);
      expect(result).toContain('required ');
      expect(result).toContain('readonly ');
    });
  });

  // --- null/false attribute skipping ---
  describe('attribute skipping', () => {
    it('should skip null attribute values', () => {
      const el = {
        getAttributes: () => ({ name: 'test', placeholder: null })
      };
      const result = helper.render(el);
      expect(result).not.toContain('placeholder');
    });

    it('should skip undefined attribute values', () => {
      const el = {
        getAttributes: () => ({ name: 'test', placeholder: undefined })
      };
      const result = helper.render(el);
      expect(result).not.toContain('placeholder');
    });

    it('should skip false attribute values', () => {
      const el = {
        getAttributes: () => ({ name: 'test', disabled: false })
      };
      const result = helper.render(el);
      expect(result).not.toContain('disabled');
    });
  });

  // --- element without getAttributes ---
  describe('element without getAttributes', () => {
    it('should handle element without getAttributes gracefully', () => {
      const el = { getValue: () => 'text', name: 'field' };
      const result = helper.render(el);
      expect(result).toContain('<textarea');
      expect(result).toContain('text');
      expect(result).toContain('</textarea>');
    });
  });

  // --- Branch coverage ---
  describe('branch coverage', () => {
    it('should handle getAttributes returning null (line 24)', () => {
      const el = { getAttributes: () => null, getValue: () => 'text' };
      const result = helper.render(el);
      expect(result).toContain('<textarea');
      expect(result).toContain('text');
    });

    it('should skip inherited attributes via Object.hasOwn (line 55)', () => {
      const parent = { inherited: 'nope' };
      const attrs = Object.create(parent);
      attrs.name = 'body';
      const el = { getAttributes: () => attrs, getValue: () => '' };
      const result = helper.render(el);
      expect(result).not.toContain('inherited');
      expect(result).toContain('name="body"');
    });

    it('should handle element without getValue (line 36)', () => {
      const el = {
        getAttributes: () => ({ name: 'body' }),
        getTextContent: () => 'alt content'
      };
      const result = helper.render(el);
      expect(result).toContain('alt content');
    });

    it('should handle getTextContent returning null (line 39)', () => {
      const el = {
        getAttributes: () => ({ name: 'body' }),
        getValue: () => null,
        getTextContent: () => null
      };
      const result = helper.render(el);
      expect(result).toContain('></textarea>');
    });
  });

  // --- empty text content ---
  describe('empty text content', () => {
    it('should render empty textarea when no value or text content', () => {
      const el = {
        getAttributes: () => ({ name: 'empty' })
      };
      const result = helper.render(el);
      expect(result).toContain('></textarea>');
    });

    it('should render empty textarea when getTextContent returns empty string', () => {
      const el = {
        getAttributes: () => ({ name: 'empty' }),
        getValue: () => null,
        getTextContent: () => ''
      };
      const result = helper.render(el);
      expect(result).toContain('></textarea>');
    });
  });
});
