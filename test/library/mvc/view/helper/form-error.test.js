const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const FormError = require(path.join(projectRoot, 'library/mvc/view/helper/form-error'));
const AbstractHelper = require(path.join(projectRoot, 'library/mvc/view/helper/abstract-helper'));
const Element = require(path.join(projectRoot, 'library/form/element'));

describe('FormError View Helper', () => {
  let helper;

  beforeEach(() => {
    helper = new FormError();
  });

  // --- Constructor / instanceof ---
  describe('constructor', () => {
    it('should be an instance of FormError', () => {
      expect(helper).toBeInstanceOf(FormError);
    });

    it('should be an instance of AbstractHelper', () => {
      expect(helper).toBeInstanceOf(AbstractHelper);
    });
  });

  // --- render ---
  describe('render', () => {
    it('should throw TypeError when argument is not an Element instance', () => {
      expect(() => helper.render('not-an-element')).toThrow(TypeError);
      expect(() => helper.render('not-an-element')).toThrow('Value is not an instance of Element');
    });

    it('should throw TypeError for plain object', () => {
      expect(() => helper.render({ getMessages: () => [] })).toThrow(TypeError);
    });

    it('should throw TypeError for null', () => {
      expect(() => helper.render(null)).toThrow(TypeError);
    });

    it('should throw TypeError for undefined (no args)', () => {
      expect(() => helper.render(undefined)).toThrow(TypeError);
    });

    it('should return empty string when element has no messages', () => {
      const el = new Element();
      expect(helper.render(el)).toBe('');
    });

    it('should return empty string when element messages is an empty array', () => {
      const el = new Element();
      el.setMessages([]);
      expect(helper.render(el)).toBe('');
    });

    it('should render ul/li markup for a single message', () => {
      const el = new Element();
      el.setMessages(['Field is required']);
      const result = helper.render(el);
      expect(result).toBe('<ul class="dp-error-message"><li>Field is required</li></ul>');
    });

    it('should render ul/li markup for multiple messages', () => {
      const el = new Element();
      el.setMessages(['Too short', 'Invalid format']);
      const result = helper.render(el);
      expect(result).toBe(
        '<ul class="dp-error-message"><li>Too short</li><li>Invalid format</li></ul>'
      );
    });

    it('should include string attribute values in the ul tag', () => {
      const el = new Element();
      el.setMessages(['Error']);
      const result = helper.render(el, { id: 'err-list', role: 'alert' });
      expect(result).toContain('id="err-list"');
      expect(result).toContain('role="alert"');
      expect(result).toContain('<li>Error</li>');
    });

    it('should render boolean true attributes without a value', () => {
      const el = new Element();
      el.setMessages(['Error']);
      const result = helper.render(el, { hidden: true });
      expect(result).toContain(' hidden');
      expect(result).not.toContain('hidden="');
    });

    it('should skip attributes with null, undefined, or false values', () => {
      const el = new Element();
      el.setMessages(['Error']);
      const result = helper.render(el, {
        'data-null': null,
        'data-undef': undefined,
        'data-false': false,
        'data-ok': 'yes',
      });
      expect(result).not.toContain('data-null');
      expect(result).not.toContain('data-undef');
      expect(result).not.toContain('data-false');
      expect(result).toContain('data-ok="yes"');
    });

    it('should escape special characters in attribute values', () => {
      const el = new Element();
      el.setMessages(['Error']);
      const result = helper.render(el, { title: 'a "b" <c>' });
      expect(result).toContain('title="a &quot;b&quot; &lt;c&gt;"');
    });

    it('should extract Nunjucks context from last argument', () => {
      const el = new Element();
      el.setMessages(['Error']);
      const ctx = { ctx: { someVar: 'val' } };
      const result = helper.render(el, ctx);
      // Context should be extracted; element is still the first real arg
      expect(result).toContain('<li>Error</li>');
    });

    it('should extract Nunjucks context when attributes are also provided', () => {
      const el = new Element();
      el.setMessages(['Error']);
      const ctx = { ctx: { someVar: 'val' } };
      const result = helper.render(el, { id: 'errs' }, ctx);
      expect(result).toContain('id="errs"');
      expect(result).toContain('<li>Error</li>');
    });

    it('should restore previous context after render', () => {
      const el = new Element();
      el.setMessages(['Error']);
      const ctx = { ctx: {} };
      expect(helper.nunjucksContext).toBeNull();
      helper.render(el, ctx);
      expect(helper.nunjucksContext).toBeNull();
    });
  });

  // --- messageOpenFormat ---
  describe('messageOpenFormat', () => {
    it('should return opening ul tag with default class when no attributes', () => {
      expect(helper.messageOpenFormat()).toBe('<ul class="dp-error-message">');
    });

    it('should return opening ul tag with default class when attributes is empty object', () => {
      expect(helper.messageOpenFormat({})).toBe('<ul class="dp-error-message">');
    });

    it('should append string attribute values', () => {
      const result = helper.messageOpenFormat({ id: 'errors' });
      expect(result).toBe('<ul class="dp-error-message" id="errors">');
    });

    it('should render boolean true as valueless attribute', () => {
      const result = helper.messageOpenFormat({ hidden: true });
      expect(result).toBe('<ul class="dp-error-message" hidden>');
    });

    it('should skip null, undefined, and false attribute values', () => {
      const result = helper.messageOpenFormat({
        'data-a': null,
        'data-b': undefined,
        'data-c': false,
      });
      expect(result).toBe('<ul class="dp-error-message">');
    });

    it('should handle mixed attribute types correctly', () => {
      const result = helper.messageOpenFormat({
        'data-null': null,
        'data-undef': undefined,
        'data-false': false,
        hidden: true,
        id: 'list',
      });
      expect(result).not.toContain('data-null');
      expect(result).not.toContain('data-undef');
      expect(result).not.toContain('data-false');
      expect(result).toContain(' hidden');
      expect(result).toContain('id="list"');
    });

    it('should escape attribute values', () => {
      const result = helper.messageOpenFormat({ title: '<"test">' });
      expect(result).toContain('title="&lt;&quot;test&quot;&gt;"');
    });
  });

  // --- messageCloseString ---
  describe('messageCloseString', () => {
    it('should return closing ul tag', () => {
      expect(helper.messageCloseString()).toBe('</ul>');
    });
  });

  // --- messageSeparatorString ---
  describe('messageSeparatorString', () => {
    it('should return li close and open tags', () => {
      expect(helper.messageSeparatorString()).toBe('</li><li>');
    });
  });
});
