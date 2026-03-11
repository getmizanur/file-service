const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

describe('AbstractHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new AbstractHelper();
  });

  // ==================== Lines 82-93: setVariable, hasContext ====================

  describe('setVariable()', () => {
    it('should set a variable on the nunjucks context at root level', () => {
      const ctx = { existing: 'value' };
      helper.setContext(ctx);
      helper.setVariable('foo', 'bar');
      expect(ctx.foo).toBe('bar');
    });

    it('should set a variable on a context override instead of instance context', () => {
      const instanceCtx = {};
      const overrideCtx = {};
      helper.setContext(instanceCtx);
      helper.setVariable('key', 'val', overrideCtx);
      expect(overrideCtx.key).toBe('val');
      expect(instanceCtx.key).toBeUndefined();
    });

    it('should do nothing when no context is available', () => {
      // nunjucksContext is null by default
      expect(() => helper.setVariable('foo', 'bar')).not.toThrow();
    });
  });

  describe('hasContext()', () => {
    it('should return false when no context is set', () => {
      expect(helper.hasContext()).toBe(false);
    });

    it('should return true when a context is set', () => {
      helper.setContext({ ctx: {} });
      expect(helper.hasContext()).toBe(true);
    });
  });

  // ==================== Lines 111-167: clearContext, withContext, _escapeHtml, _escapeAttr, render ====================

  describe('clearContext()', () => {
    it('should clear the nunjucks context and return the helper', () => {
      helper.setContext({ some: 'data' });
      expect(helper.hasContext()).toBe(true);

      const result = helper.clearContext();
      expect(helper.hasContext()).toBe(false);
      expect(result).toBe(helper);
    });
  });

  describe('withContext()', () => {
    it('should temporarily set context for the duration of the callback', () => {
      const tempCtx = { temp: true };
      let insideCtx = null;

      helper.withContext(tempCtx, () => {
        insideCtx = helper.nunjucksContext;
      });

      expect(insideCtx).toBe(tempCtx);
      // After withContext, context should be restored to null
      expect(helper.nunjucksContext).toBeNull();
    });

    it('should restore previous context after callback', () => {
      const prevCtx = { prev: true };
      const tempCtx = { temp: true };
      helper.setContext(prevCtx);

      helper.withContext(tempCtx, () => {
        expect(helper.nunjucksContext).toBe(tempCtx);
      });

      expect(helper.nunjucksContext).toBe(prevCtx);
    });

    it('should restore previous context even when callback throws', () => {
      const prevCtx = { prev: true };
      helper.setContext(prevCtx);

      expect(() => {
        helper.withContext({ temp: true }, () => {
          throw new Error('oops');
        });
      }).toThrow('oops');

      expect(helper.nunjucksContext).toBe(prevCtx);
    });

    it('should return the value from the callback', () => {
      const result = helper.withContext({}, () => 'hello');
      expect(result).toBe('hello');
    });
  });

  describe('_escapeHtml()', () => {
    it('should return empty string for null', () => {
      expect(helper._escapeHtml(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(helper._escapeHtml(undefined)).toBe('');
    });

    it('should escape ampersands', () => {
      expect(helper._escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('should escape less-than signs', () => {
      expect(helper._escapeHtml('a<b')).toBe('a&lt;b');
    });

    it('should escape greater-than signs', () => {
      expect(helper._escapeHtml('a>b')).toBe('a&gt;b');
    });

    it('should escape double quotes', () => {
      expect(helper._escapeHtml('a"b')).toBe('a&quot;b');
    });

    it('should escape single quotes', () => {
      expect(helper._escapeHtml("a'b")).toBe('a&#039;b');
    });

    it('should escape all special characters in one string', () => {
      expect(helper._escapeHtml('<div class="a" data-x=\'b\'>&</div>')).toBe(
        '&lt;div class=&quot;a&quot; data-x=&#039;b&#039;&gt;&amp;&lt;/div&gt;'
      );
    });

    it('should convert non-string values to string', () => {
      expect(helper._escapeHtml(42)).toBe('42');
      expect(helper._escapeHtml(true)).toBe('true');
    });
  });

  describe('_escapeAttr()', () => {
    it('should delegate to _escapeHtml', () => {
      expect(helper._escapeAttr('<"test">')).toBe('&lt;&quot;test&quot;&gt;');
    });
  });

  describe('render()', () => {
    it('should throw an error indicating implementation is required', () => {
      expect(() => helper.render()).toThrow(
        'render() method must be implemented by AbstractHelper'
      );
    });

    it('should include subclass name in the error message', () => {
      class MyHelper extends AbstractHelper {}
      const myHelper = new MyHelper();
      expect(() => myHelper.render()).toThrow(
        'render() method must be implemented by MyHelper'
      );
    });
  });

  // ==================== _isNunjucksContext and _extractContext ====================

  describe('_isNunjucksContext()', () => {
    it('should return false for null', () => {
      expect(helper._isNunjucksContext(null)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(helper._isNunjucksContext('string')).toBe(false);
      expect(helper._isNunjucksContext(42)).toBe(false);
      expect(helper._isNunjucksContext(undefined)).toBe(false);
    });

    it('should return true for object with getVariables function', () => {
      expect(helper._isNunjucksContext({ getVariables: () => ({}) })).toBe(true);
    });

    it('should return true for object with env and ctx', () => {
      expect(helper._isNunjucksContext({ env: {}, ctx: {} })).toBe(true);
    });

    it('should return true for object with ctx only', () => {
      expect(helper._isNunjucksContext({ ctx: {} })).toBe(true);
    });

    it('should return false for plain object without context markers', () => {
      expect(helper._isNunjucksContext({ foo: 'bar' })).toBe(false);
    });
  });

  describe('_extractContext()', () => {
    it('should return empty args and null context for non-array', () => {
      const result = helper._extractContext(null);
      expect(result).toEqual({ args: [], context: null });
    });

    it('should return empty args and null context for empty array', () => {
      const result = helper._extractContext([]);
      expect(result).toEqual({ args: [], context: null });
    });

    it('should extract nunjucks context from last argument', () => {
      const ctx = { ctx: { someVar: 'value' }, env: {} };
      const result = helper._extractContext(['arg1', 'arg2', ctx]);
      expect(result.args).toEqual(['arg1', 'arg2']);
      expect(result.context).toBe(ctx);
    });

    it('should return all args when last arg is not a context', () => {
      const result = helper._extractContext(['arg1', 'arg2', 'arg3']);
      expect(result.args).toEqual(['arg1', 'arg2', 'arg3']);
      expect(result.context).toBeNull();
    });

    it('should handle non-array non-null input', () => {
      const result = helper._extractContext('not-an-array');
      expect(result).toEqual({ args: [], context: null });
    });
  });

  // ==================== getVariable, setContext ====================

  describe('getVariable()', () => {
    it('should return defaultValue when no context is set', () => {
      expect(helper.getVariable('name', 'default')).toBe('default');
    });

    it('should return root-level variable from context', () => {
      helper.setContext({ title: 'My Title' });
      expect(helper.getVariable('title')).toBe('My Title');
    });

    it('should return nested ctx variable', () => {
      helper.setContext({ ctx: { foo: 'bar' } });
      expect(helper.getVariable('foo')).toBe('bar');
    });

    it('should prefer root-level over ctx variable', () => {
      helper.setContext({ name: 'root', ctx: { name: 'nested' } });
      expect(helper.getVariable('name')).toBe('root');
    });

    it('should use contextOverride when provided', () => {
      helper.setContext({ name: 'instance' });
      const override = { name: 'override' };
      expect(helper.getVariable('name', null, override)).toBe('override');
    });

    it('should return defaultValue when variable not found', () => {
      helper.setContext({ other: 'value' });
      expect(helper.getVariable('missing', 'fallback')).toBe('fallback');
    });

    it('should return null as default when no defaultValue specified', () => {
      helper.setContext({});
      expect(helper.getVariable('missing')).toBeNull();
    });
  });

  describe('setContext()', () => {
    it('should set the nunjucks context and return the helper for chaining', () => {
      const ctx = { data: 'value' };
      const result = helper.setContext(ctx);
      expect(helper.nunjucksContext).toBe(ctx);
      expect(result).toBe(helper);
    });
  });
});
