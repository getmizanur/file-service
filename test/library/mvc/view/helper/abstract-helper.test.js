const AbstractHelper = require('../../../../../library/mvc/view/helper/abstract-helper');

describe('AbstractHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new AbstractHelper();
  });

  describe('_isNunjucksContext(obj)', () => {
    it('returns false for null', () => {
      expect(helper._isNunjucksContext(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(helper._isNunjucksContext(undefined)).toBe(false);
    });

    it('returns false for non-objects (string)', () => {
      expect(helper._isNunjucksContext('hello')).toBe(false);
    });

    it('returns false for non-objects (number)', () => {
      expect(helper._isNunjucksContext(42)).toBe(false);
    });

    it('returns false for plain empty object', () => {
      expect(helper._isNunjucksContext({})).toBe(false);
    });

    it('returns true for objects with getVariables function', () => {
      expect(helper._isNunjucksContext({ getVariables: () => ({}) })).toBe(true);
    });

    it('returns true for objects with env + ctx', () => {
      expect(helper._isNunjucksContext({ env: {}, ctx: {} })).toBe(true);
    });

    it('returns true for objects with just ctx', () => {
      expect(helper._isNunjucksContext({ ctx: { foo: 'bar' } })).toBe(true);
    });

    it('returns false when getVariables is not a function', () => {
      expect(helper._isNunjucksContext({ getVariables: 'not a function' })).toBe(false);
    });
  });

  describe('_extractContext(args)', () => {
    it('returns empty args and null context for empty array', () => {
      const result = helper._extractContext([]);
      expect(result).toEqual({ args: [], context: null });
    });

    it('returns empty args and null context for non-array', () => {
      const result = helper._extractContext('not-array');
      expect(result).toEqual({ args: [], context: null });
    });

    it('returns empty args and null context for null', () => {
      const result = helper._extractContext(null);
      expect(result).toEqual({ args: [], context: null });
    });

    it('returns args unchanged when last arg is not nunjucks context', () => {
      const result = helper._extractContext(['a', 'b', 'c']);
      expect(result).toEqual({ args: ['a', 'b', 'c'], context: null });
    });

    it('strips nunjucks context from last argument', () => {
      const ctx = { ctx: { user: 'test' }, env: {} };
      const result = helper._extractContext(['arg1', 'arg2', ctx]);
      expect(result.args).toEqual(['arg1', 'arg2']);
      expect(result.context).toBe(ctx);
    });

    it('handles single nunjucks context argument', () => {
      const ctx = { getVariables: () => ({}) };
      const result = helper._extractContext([ctx]);
      expect(result.args).toEqual([]);
      expect(result.context).toBe(ctx);
    });
  });

  describe('getVariable(name, defaultValue, contextOverride)', () => {
    it('returns defaultValue when no context is set', () => {
      expect(helper.getVariable('foo', 'default')).toBe('default');
    });

    it('returns null as default when defaultValue not specified', () => {
      expect(helper.getVariable('foo')).toBeNull();
    });

    it('returns root-level variable from context', () => {
      helper.setContext({ title: 'Hello' });
      expect(helper.getVariable('title')).toBe('Hello');
    });

    it('returns nested ctx variable', () => {
      helper.setContext({ ctx: { userName: 'Alice' } });
      expect(helper.getVariable('userName')).toBe('Alice');
    });

    it('prefers root-level over nested ctx variable', () => {
      helper.setContext({ name: 'root', ctx: { name: 'nested' } });
      expect(helper.getVariable('name')).toBe('root');
    });

    it('uses contextOverride parameter instead of instance context', () => {
      helper.setContext({ title: 'instance' });
      const override = { title: 'override' };
      expect(helper.getVariable('title', null, override)).toBe('override');
    });

    it('returns defaultValue when variable not found in context', () => {
      helper.setContext({ other: 'value' });
      expect(helper.getVariable('missing', 'fallback')).toBe('fallback');
    });
  });

  describe('setVariable(name, value, contextOverride)', () => {
    it('sets variable on instance context', () => {
      helper.setContext({ });
      helper.setVariable('key', 'val');
      expect(helper.getVariable('key')).toBe('val');
    });

    it('does nothing when no context is set', () => {
      // Should not throw
      helper.setVariable('key', 'val');
      expect(helper.getVariable('key')).toBeNull();
    });

    it('sets variable on contextOverride', () => {
      const override = {};
      helper.setVariable('key', 'val', override);
      expect(override.key).toBe('val');
    });
  });

  describe('hasContext()', () => {
    it('returns false initially', () => {
      expect(helper.hasContext()).toBe(false);
    });

    it('returns true after setContext', () => {
      helper.setContext({});
      expect(helper.hasContext()).toBe(true);
    });

    it('returns false after clearContext', () => {
      helper.setContext({});
      helper.clearContext();
      expect(helper.hasContext()).toBe(false);
    });
  });

  describe('setContext(context)', () => {
    it('returns this for chaining', () => {
      const result = helper.setContext({});
      expect(result).toBe(helper);
    });

    it('sets the context', () => {
      const ctx = { foo: 'bar' };
      helper.setContext(ctx);
      expect(helper.nunjucksContext).toBe(ctx);
    });
  });

  describe('clearContext()', () => {
    it('resets context to null', () => {
      helper.setContext({ foo: 'bar' });
      helper.clearContext();
      expect(helper.nunjucksContext).toBeNull();
    });

    it('returns this for chaining', () => {
      const result = helper.clearContext();
      expect(result).toBe(helper);
    });
  });

  describe('withContext(context, fn)', () => {
    it('executes fn with temporary context', () => {
      const ctx = { greeting: 'hello' };
      const result = helper.withContext(ctx, () => {
        return helper.getVariable('greeting');
      });
      expect(result).toBe('hello');
    });

    it('restores original context after execution', () => {
      const original = { a: 1 };
      helper.setContext(original);
      helper.withContext({ b: 2 }, () => {});
      expect(helper.nunjucksContext).toBe(original);
    });

    it('restores original context even if fn throws', () => {
      const original = { a: 1 };
      helper.setContext(original);
      expect(() => {
        helper.withContext({ b: 2 }, () => { throw new Error('boom'); });
      }).toThrow('boom');
      expect(helper.nunjucksContext).toBe(original);
    });

    it('restores null context when none was set', () => {
      helper.withContext({ temp: true }, () => {});
      expect(helper.nunjucksContext).toBeNull();
    });
  });

  describe('_escapeHtml(value)', () => {
    it('returns empty string for null', () => {
      expect(helper._escapeHtml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(helper._escapeHtml(undefined)).toBe('');
    });

    it('escapes ampersand', () => {
      expect(helper._escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('escapes less than', () => {
      expect(helper._escapeHtml('<div>')).toBe('&lt;div&gt;');
    });

    it('escapes greater than', () => {
      expect(helper._escapeHtml('a>b')).toBe('a&gt;b');
    });

    it('escapes double quotes', () => {
      expect(helper._escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('escapes single quotes', () => {
      expect(helper._escapeHtml("it's")).toBe('it&#039;s');
    });

    it('escapes all special characters together', () => {
      expect(helper._escapeHtml('<a href="x&y">it\'s</a>')).toBe(
        '&lt;a href=&quot;x&amp;y&quot;&gt;it&#039;s&lt;/a&gt;'
      );
    });

    it('converts numbers to string', () => {
      expect(helper._escapeHtml(42)).toBe('42');
    });
  });

  describe('_escapeAttr(value)', () => {
    it('delegates to _escapeHtml', () => {
      expect(helper._escapeAttr('<"test">')).toBe('&lt;&quot;test&quot;&gt;');
    });

    it('returns empty string for null', () => {
      expect(helper._escapeAttr(null)).toBe('');
    });
  });

  describe('render()', () => {
    it('throws Error when called on base class', () => {
      expect(() => helper.render()).toThrow('render() method must be implemented by AbstractHelper');
    });

    it('includes the class name in the error message for subclasses', () => {
      class MyHelper extends AbstractHelper {}
      const myHelper = new MyHelper();
      expect(() => myHelper.render()).toThrow('render() method must be implemented by MyHelper');
    });
  });
});
