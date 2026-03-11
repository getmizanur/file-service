const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const JsonUtil = require(path.join(projectRoot, 'library/util/json-util'));

describe('JsonUtil', () => {

  // Suppress console.error from encode/decode
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    console.error.mockRestore();
  });

  // ==================== JSON Encoding/Decoding ====================

  describe('encode', () => {
    it('should encode value to JSON', () => {
      expect(JsonUtil.encode({ a: 1 })).toBe('{"a":1}');
    });
    it('should pretty print when requested', () => {
      const result = JsonUtil.encode({ a: 1 }, { pretty: true });
      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });
    it('should use custom space for indentation', () => {
      const result = JsonUtil.encode({ a: 1 }, { pretty: true, space: 4 });
      expect(result).toContain('    ');
    });
    it('should escape unicode when requested', () => {
      const result = JsonUtil.encode({ text: '\u00E9' }, { escapeUnicode: true });
      expect(result).toContain('\\u00e9');
    });
    it('should return null on circular reference', () => {
      const obj = {};
      obj.self = obj;
      expect(JsonUtil.encode(obj)).toBeNull();
    });
    it('should handle null/undefined', () => {
      expect(JsonUtil.encode(null)).toBe('null');
      expect(JsonUtil.encode(undefined)).toBeUndefined();
    });
  });

  describe('decode', () => {
    it('should decode JSON string', () => {
      expect(JsonUtil.decode('{"a":1}')).toEqual({ a: 1 });
    });
    it('should return null for invalid JSON', () => {
      expect(JsonUtil.decode('not json')).toBeNull();
    });
    it('should return null for non-string input', () => {
      expect(JsonUtil.decode(123)).toBeNull();
      expect(JsonUtil.decode(null)).toBeNull();
    });
  });

  describe('lastErrorMsg', () => {
    it('should return "No error"', () => {
      expect(JsonUtil.lastErrorMsg()).toBe('No error');
    });
  });

  // ==================== JSON Validation ====================

  describe('isValid', () => {
    it('should return true for valid JSON', () => {
      expect(JsonUtil.isValid('{"a":1}')).toBe(true);
      expect(JsonUtil.isValid('"hello"')).toBe(true);
    });
    it('should return false for invalid JSON', () => {
      expect(JsonUtil.isValid('not json')).toBe(false);
    });
    it('should return false for non-string', () => {
      expect(JsonUtil.isValid(123)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return valid result for valid JSON', () => {
      const result = JsonUtil.validate('{"a":1}');
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ a: 1 });
      expect(result.error).toBeNull();
    });
    it('should return invalid result for bad JSON', () => {
      const result = JsonUtil.validate('not json');
      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
    it('should return invalid for non-string', () => {
      const result = JsonUtil.validate(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Input must be a string');
    });
  });

  // ==================== Object/Array Manipulation ====================

  describe('merge', () => {
    it('should deep merge objects', () => {
      const result = JsonUtil.merge({ a: 1, b: { x: 10 } }, { b: { y: 20 }, c: 3 });
      expect(result).toEqual({ a: 1, b: { x: 10, y: 20 }, c: 3 });
    });
    it('should handle non-object target', () => {
      const result = JsonUtil.merge(null, { a: 1 });
      expect(result).toEqual({ a: 1 });
    });
    it('should skip non-object sources', () => {
      const result = JsonUtil.merge({ a: 1 }, null, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });
    it('should clone arrays in source', () => {
      const source = { arr: [1, 2, 3] };
      const result = JsonUtil.merge({}, source);
      expect(result.arr).toEqual([1, 2, 3]);
      result.arr.push(4);
      expect(source.arr).toHaveLength(3);
    });
    it('should overwrite target array with source object', () => {
      const result = JsonUtil.merge({ a: [1, 2] }, { a: { x: 1 } });
      expect(result.a).toEqual({ x: 1 });
    });
  });

  describe('clone', () => {
    it('should return primitives as-is', () => {
      expect(JsonUtil.clone(42)).toBe(42);
      expect(JsonUtil.clone('hello')).toBe('hello');
      expect(JsonUtil.clone(null)).toBe(null);
    });
    it('should deep clone objects', () => {
      const obj = { a: { b: 1 } };
      const cloned = JsonUtil.clone(obj);
      expect(cloned).toEqual(obj);
      cloned.a.b = 99;
      expect(obj.a.b).toBe(1);
    });
    it('should clone arrays', () => {
      const arr = [1, [2, 3]];
      const cloned = JsonUtil.clone(arr);
      cloned[1][0] = 99;
      expect(arr[1][0]).toBe(2);
    });
    it('should clone Date objects', () => {
      const d = new Date('2025-01-01');
      const cloned = JsonUtil.clone(d);
      expect(cloned.getTime()).toBe(d.getTime());
      expect(cloned).not.toBe(d);
    });
    it('should clone RegExp objects', () => {
      const r = /test/gi;
      const cloned = JsonUtil.clone(r);
      expect(cloned.source).toBe('test');
      expect(cloned.flags).toBe('gi');
    });
  });

  describe('get', () => {
    it('should get nested value with dot notation', () => {
      expect(JsonUtil.get({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
    });
    it('should return default for missing path', () => {
      expect(JsonUtil.get({ a: 1 }, 'b.c', 'default')).toBe('default');
    });
    it('should return default for non-object', () => {
      expect(JsonUtil.get(null, 'a', 'def')).toBe('def');
      expect(JsonUtil.get('string', 'a', 'def')).toBe('def');
    });
    it('should handle intermediate null', () => {
      expect(JsonUtil.get({ a: null }, 'a.b', 'def')).toBe('def');
    });
  });

  describe('set', () => {
    it('should set nested value with dot notation', () => {
      const obj = {};
      JsonUtil.set(obj, 'a.b.c', 42);
      expect(obj.a.b.c).toBe(42);
    });
    it('should handle non-object input', () => {
      const result = JsonUtil.set(null, 'a', 1);
      expect(result.a).toBe(1);
    });
    it('should overwrite non-object intermediate', () => {
      const obj = { a: 'string' };
      JsonUtil.set(obj, 'a.b', 1);
      expect(obj.a.b).toBe(1);
    });
  });

  describe('has', () => {
    it('should return true for existing path', () => {
      expect(JsonUtil.has({ a: { b: 1 } }, 'a.b')).toBe(true);
    });
    it('should return false for missing path', () => {
      expect(JsonUtil.has({ a: 1 }, 'b')).toBe(false);
    });
    it('should return false for non-object', () => {
      expect(JsonUtil.has(null, 'a')).toBe(false);
    });
    it('should handle intermediate null', () => {
      expect(JsonUtil.has({ a: null }, 'a.b')).toBe(false);
    });
  });

  describe('unset', () => {
    it('should delete nested value', () => {
      const obj = { a: { b: 1, c: 2 } };
      expect(JsonUtil.unset(obj, 'a.b')).toBe(true);
      expect(obj.a.b).toBeUndefined();
      expect(obj.a.c).toBe(2);
    });
    it('should return false for missing path', () => {
      expect(JsonUtil.unset({ a: 1 }, 'b')).toBe(false);
    });
    it('should return false for non-object', () => {
      expect(JsonUtil.unset(null, 'a')).toBe(false);
    });
    it('should return false when intermediate path missing', () => {
      expect(JsonUtil.unset({ a: 1 }, 'a.b.c')).toBe(false);
    });
  });

  // ==================== Array/Object Utilities ====================

  describe('flatten', () => {
    it('should flatten nested object', () => {
      expect(JsonUtil.flatten({ a: { b: { c: 1 } }, d: 2 })).toEqual({
        'a.b.c': 1,
        d: 2
      });
    });
    it('should preserve arrays as values', () => {
      expect(JsonUtil.flatten({ a: [1, 2] })).toEqual({ a: [1, 2] });
    });
    it('should skip inherited properties (branch line 324)', () => {
      const parent = { inherited: 'skip' };
      const obj = Object.create(parent);
      obj.own = 1;
      expect(JsonUtil.flatten(obj)).toEqual({ own: 1 });
    });
  });

  describe('unflatten', () => {
    it('should unflatten dot-notation keys', () => {
      expect(JsonUtil.unflatten({ 'a.b.c': 1, d: 2 })).toEqual({
        a: { b: { c: 1 } },
        d: 2
      });
    });
    it('should skip inherited properties (branch line 351)', () => {
      const parent = { 'inherited.key': 'skip' };
      const obj = Object.create(parent);
      obj.own = 1;
      expect(JsonUtil.unflatten(obj)).toEqual({ own: 1 });
    });
  });

  describe('keys', () => {
    it('should return leaf keys with dot notation', () => {
      expect(JsonUtil.keys({ a: { b: 1, c: 2 }, d: 3 })).toEqual(['a.b', 'a.c', 'd']);
    });
    it('should include array keys as leaf', () => {
      expect(JsonUtil.keys({ a: [1, 2] })).toEqual(['a']);
    });
    it('should skip inherited properties (branch line 372)', () => {
      const parent = { inherited: 'skip' };
      const obj = Object.create(parent);
      obj.own = 1;
      expect(JsonUtil.keys(obj)).toEqual(['own']);
    });
  });

  describe('filter', () => {
    it('should filter object entries', () => {
      const result = JsonUtil.filter({ a: 1, b: 2, c: 3 }, (v) => v > 1);
      expect(result).toEqual({ b: 2, c: 3 });
    });
    it('should receive key and object in callback', () => {
      const result = JsonUtil.filter({ a: 1, b: 2 }, (v, k) => k === 'a');
      expect(result).toEqual({ a: 1 });
    });
    it('should skip inherited properties (branch line 400)', () => {
      const parent = { inherited: 99 };
      const obj = Object.create(parent);
      obj.own = 1;
      const result = JsonUtil.filter(obj, () => true);
      expect(result).toEqual({ own: 1 });
    });
  });

  describe('map', () => {
    it('should map object values', () => {
      const result = JsonUtil.map({ a: 1, b: 2 }, (v) => v * 2);
      expect(result).toEqual({ a: 2, b: 4 });
    });
    it('should receive key in callback', () => {
      const result = JsonUtil.map({ a: 1 }, (v, k) => `${k}:${v}`);
      expect(result).toEqual({ a: 'a:1' });
    });
    it('should skip inherited properties (branch line 423)', () => {
      const parent = { inherited: 99 };
      const obj = Object.create(parent);
      obj.own = 1;
      const result = JsonUtil.map(obj, (v) => v * 2);
      expect(result).toEqual({ own: 2 });
    });
  });

  // ==================== Comparison & Equality ====================

  describe('equals', () => {
    it('should return true for identical values', () => {
      expect(JsonUtil.equals(42, 42)).toBe(true);
      expect(JsonUtil.equals('a', 'a')).toBe(true);
    });
    it('should handle null/undefined', () => {
      expect(JsonUtil.equals(null, null)).toBe(true);
      expect(JsonUtil.equals(null, undefined)).toBe(false);
      expect(JsonUtil.equals(1, null)).toBe(false);
    });
    it('should deep compare objects', () => {
      expect(JsonUtil.equals({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
      expect(JsonUtil.equals({ a: 1 }, { a: 2 })).toBe(false);
    });
    it('should compare Date objects', () => {
      expect(JsonUtil.equals(new Date('2025-01-01'), new Date('2025-01-01'))).toBe(true);
      expect(JsonUtil.equals(new Date('2025-01-01'), new Date('2025-06-01'))).toBe(false);
    });
    it('should compare RegExp objects', () => {
      expect(JsonUtil.equals(/test/g, /test/g)).toBe(true);
      expect(JsonUtil.equals(/test/g, /test/i)).toBe(false);
    });
    it('should handle array vs object mismatch', () => {
      expect(JsonUtil.equals([], {})).toBe(false);
    });
    it('should handle different key counts', () => {
      expect(JsonUtil.equals({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });
    it('should return false for non-object comparison', () => {
      expect(JsonUtil.equals(1, '1')).toBe(false);
    });
  });

  describe('diff', () => {
    it('should return changed keys', () => {
      expect(JsonUtil.diff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })).toEqual({ b: 3, c: 4 });
    });
    it('should return empty when equal', () => {
      expect(JsonUtil.diff({ a: 1 }, { a: 1 })).toEqual({});
    });
    it('should skip inherited properties in obj2 (branch line 497)', () => {
      const parent = { inherited: 99 };
      const obj2 = Object.create(parent);
      obj2.own = 2;
      expect(JsonUtil.diff({ own: 1 }, obj2)).toEqual({ own: 2 });
    });
  });

  // ==================== Type Conversion ====================

  describe('toQueryString', () => {
    it('should convert flat object', () => {
      expect(JsonUtil.toQueryString({ a: 1, b: 2 })).toBe('a=1&b=2');
    });
    it('should handle nested objects', () => {
      const result = JsonUtil.toQueryString({ user: { name: 'John' } });
      expect(result).toBe('user[name]=John');
    });
    it('should handle arrays', () => {
      const result = JsonUtil.toQueryString({ tags: ['a', 'b'] });
      expect(result).toContain('tags[0]=a');
      expect(result).toContain('tags[1]=b');
    });
    it('should skip null/undefined values', () => {
      expect(JsonUtil.toQueryString({ a: 1, b: null, c: undefined })).toBe('a=1');
    });
    it('should encode special characters', () => {
      expect(JsonUtil.toQueryString({ q: 'hello world' })).toBe('q=hello%20world');
    });
    it('should skip inherited properties (branch line 522)', () => {
      const parent = { inherited: 'skip' };
      const obj = Object.create(parent);
      obj.own = 1;
      expect(JsonUtil.toQueryString(obj)).toBe('own=1');
    });
  });

  describe('fromQueryString', () => {
    it('should parse query string', () => {
      expect(JsonUtil.fromQueryString('a=1&b=2')).toEqual({ a: '1', b: '2' });
    });
    it('should handle leading ?', () => {
      expect(JsonUtil.fromQueryString('?a=1')).toEqual({ a: '1' });
    });
    it('should handle empty value', () => {
      expect(JsonUtil.fromQueryString('a=')).toEqual({ a: '' });
    });
    it('should return empty for falsy input', () => {
      expect(JsonUtil.fromQueryString('')).toEqual({});
      expect(JsonUtil.fromQueryString(null)).toEqual({});
    });
    it('should handle key without value', () => {
      expect(JsonUtil.fromQueryString('key')).toEqual({ key: '' });
    });
  });

  describe('prettyPrint', () => {
    it('should return formatted JSON', () => {
      const result = JsonUtil.prettyPrint({ a: 1 });
      expect(result).toContain('\n');
    });
    it('should accept custom space', () => {
      const result = JsonUtil.prettyPrint({ a: 1 }, 4);
      expect(result).toContain('    ');
    });
  });

  // Branch: _mergeSource / _mergeValue for deep object merge (lines 149, 194)
  describe('merge deep branches', () => {
    it('should deep merge nested objects via _mergeSource/_mergeValue (lines 149, 194)', () => {
      const target = { a: { b: 1, c: 2 } };
      const source = { a: { b: 10, d: 3 } };
      const result = JsonUtil.merge(target, source);
      expect(result.a.b).toBe(10);
      expect(result.a.c).toBe(2);
      expect(result.a.d).toBe(3);
    });

    it('should skip inherited properties in _mergeSource (line 149)', () => {
      const parent = { inherited: 'skip' };
      const source = Object.create(parent);
      source.own = 1;
      const result = JsonUtil.merge({}, source);
      expect(result.own).toBe(1);
      expect(result.inherited).toBeUndefined();
    });

    it('should replace non-object target with source object in _mergeValue (line 194)', () => {
      const result = JsonUtil.merge({ a: 'string' }, { a: { nested: true } });
      expect(result.a).toEqual({ nested: true });
    });
  });

  // Branch: fromQueryString parsing (line 566)
  describe('fromQueryString', () => {
    it('should parse query string into object (line 566)', () => {
      const result = JsonUtil.fromQueryString('a=1&b=hello');
      expect(result.a).toBe('1');
      expect(result.b).toBe('hello');
    });

    it('should handle key without value (line 566 fallback)', () => {
      const result = JsonUtil.fromQueryString('key=&other=val');
      expect(result.key).toBe('');
      expect(result.other).toBe('val');
    });

    it('should strip leading ? from query string', () => {
      const result = JsonUtil.fromQueryString('?x=1');
      expect(result.x).toBe('1');
    });

    // Line 566 FALSE branch: pair where key is empty (e.g. '=value' - leading =)
    it('should skip pair with empty key (line 566 if(key) false branch)', () => {
      const result = JsonUtil.fromQueryString('=emptykey&a=1');
      expect(result['a']).toBe('1');
      // empty key should not be added
      expect(result['']).toBeUndefined();
    });
  });

  // Branch: clone line 194 - skip inherited properties (false branch of Object.hasOwn)
  describe('clone inherited property branch (line 194)', () => {
    it('should skip inherited properties when cloning plain object (line 194 false branch)', () => {
      const parent = { inherited: 'skip' };
      const obj = Object.create(parent);
      obj.own = 'keep';
      const cloned = JsonUtil.clone(obj);
      expect(cloned.own).toBe('keep');
      expect(cloned.inherited).toBeUndefined();
    });
  });

  // Branch: set line 246 - FALSE branch when intermediate key already exists as object
  describe('set line 246 false branch', () => {
    it('should reuse existing object at intermediate path (line 246 false branch)', () => {
      const obj = { a: { b: { c: 1 } } };
      // 'a' and 'b' already exist as objects, so line 246 takes the FALSE branch
      JsonUtil.set(obj, 'a.b.d', 42);
      expect(obj.a.b.d).toBe(42);
      expect(obj.a.b.c).toBe(1); // original preserved
    });
  });
});
