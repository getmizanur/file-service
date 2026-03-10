const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const JsonUtil = require(path.join(projectRoot, 'library/util/json-util'));

describe('JsonUtil', () => {

  // ==================== JSON Encoding/Decoding ====================

  describe('encode()', () => {
    test('encodes object to JSON string', () => {
      expect(JsonUtil.encode({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
    });

    test('encodes array to JSON string', () => {
      expect(JsonUtil.encode([1, 2, 3])).toBe('[1,2,3]');
    });

    test('encodes string to JSON', () => {
      expect(JsonUtil.encode('hello')).toBe('"hello"');
    });

    test('encodes number to JSON', () => {
      expect(JsonUtil.encode(42)).toBe('42');
    });

    test('encodes null to JSON', () => {
      expect(JsonUtil.encode(null)).toBe('null');
    });

    test('encodes boolean to JSON', () => {
      expect(JsonUtil.encode(true)).toBe('true');
    });

    test('returns pretty-printed JSON when options.pretty is true', () => {
      const result = JsonUtil.encode({ a: 1 }, { pretty: true });
      expect(result).toBe('{\n  "a": 1\n}');
    });

    test('uses custom space for pretty printing', () => {
      const result = JsonUtil.encode({ a: 1 }, { pretty: true, space: 4 });
      expect(result).toBe('{\n    "a": 1\n}');
    });

    test('escapes unicode characters when escapeUnicode is true', () => {
      const result = JsonUtil.encode({ text: '\u00e9' }, { escapeUnicode: true });
      expect(result).toContain('\\u00e9');
    });

    test('returns null for circular reference', () => {
      const obj = {};
      obj.self = obj;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      expect(JsonUtil.encode(obj)).toBeNull();
      consoleSpy.mockRestore();
    });

    test('encodes undefined as undefined (JSON.stringify returns undefined)', () => {
      expect(JsonUtil.encode(undefined)).toBeUndefined();
    });
  });

  describe('decode()', () => {
    test('decodes JSON object string', () => {
      expect(JsonUtil.decode('{"a":1}')).toEqual({ a: 1 });
    });

    test('decodes JSON array string', () => {
      expect(JsonUtil.decode('[1,2,3]')).toEqual([1, 2, 3]);
    });

    test('decodes JSON string value', () => {
      expect(JsonUtil.decode('"hello"')).toBe('hello');
    });

    test('decodes JSON number', () => {
      expect(JsonUtil.decode('42')).toBe(42);
    });

    test('returns null for invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      expect(JsonUtil.decode('{invalid}')).toBeNull();
      consoleSpy.mockRestore();
    });

    test('returns null for non-string input', () => {
      expect(JsonUtil.decode(42)).toBeNull();
    });

    test('returns null for null input', () => {
      expect(JsonUtil.decode(null)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(JsonUtil.decode(undefined)).toBeNull();
    });
  });

  describe('lastErrorMsg()', () => {
    test('returns "No error"', () => {
      expect(JsonUtil.lastErrorMsg()).toBe('No error');
    });
  });

  // ==================== JSON Validation ====================

  describe('isValid()', () => {
    test('returns true for valid JSON object', () => {
      expect(JsonUtil.isValid('{"a":1}')).toBe(true);
    });

    test('returns true for valid JSON array', () => {
      expect(JsonUtil.isValid('[1,2,3]')).toBe(true);
    });

    test('returns true for JSON null', () => {
      expect(JsonUtil.isValid('null')).toBe(true);
    });

    test('returns false for invalid JSON', () => {
      expect(JsonUtil.isValid('{invalid}')).toBe(false);
    });

    test('returns false for non-string input', () => {
      expect(JsonUtil.isValid(42)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(JsonUtil.isValid(undefined)).toBe(false);
    });
  });

  describe('validate()', () => {
    test('returns valid result for valid JSON', () => {
      const result = JsonUtil.validate('{"a":1}');
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ a: 1 });
      expect(result.error).toBeNull();
    });

    test('returns invalid result for invalid JSON', () => {
      const result = JsonUtil.validate('{invalid}');
      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    test('returns invalid result for non-string input', () => {
      const result = JsonUtil.validate(42);
      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Input must be a string');
    });

    test('returns invalid result for null input', () => {
      const result = JsonUtil.validate(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Input must be a string');
    });
  });

  // ==================== Object/Array Manipulation ====================

  describe('merge()', () => {
    test('merges two objects', () => {
      const result = JsonUtil.merge({ a: 1 }, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('deep merges nested objects', () => {
      const result = JsonUtil.merge(
        { a: 1, b: { x: 10 } },
        { b: { y: 20 }, c: 3 }
      );
      expect(result).toEqual({ a: 1, b: { x: 10, y: 20 }, c: 3 });
    });

    test('overwrites primitive values', () => {
      const result = JsonUtil.merge({ a: 1 }, { a: 2 });
      expect(result).toEqual({ a: 2 });
    });

    test('handles multiple sources', () => {
      const result = JsonUtil.merge({ a: 1 }, { b: 2 }, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    test('replaces arrays instead of merging them', () => {
      const result = JsonUtil.merge({ a: [1, 2] }, { a: [3, 4] });
      expect(result).toEqual({ a: [3, 4] });
    });

    test('handles null target by creating empty object', () => {
      const result = JsonUtil.merge(null, { a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    test('skips null/non-object sources', () => {
      const result = JsonUtil.merge({ a: 1 }, null, undefined, 'string');
      expect(result).toEqual({ a: 1 });
    });

    test('overwrites object with primitive from source', () => {
      const result = JsonUtil.merge({ a: { x: 1 } }, { a: 42 });
      expect(result).toEqual({ a: 42 });
    });

    test('creates nested object when target has primitive', () => {
      const result = JsonUtil.merge({ a: 1 }, { a: { x: 10 } });
      expect(result).toEqual({ a: { x: 10 } });
    });
  });

  describe('clone()', () => {
    test('deep clones an object', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = JsonUtil.clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    test('deep clones an array', () => {
      const arr = [1, [2, 3], { a: 4 }];
      const cloned = JsonUtil.clone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    test('clones Date objects', () => {
      const date = new Date('2024-01-01');
      const cloned = JsonUtil.clone(date);
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    test('clones RegExp objects', () => {
      const regex = /test/gi;
      const cloned = JsonUtil.clone(regex);
      expect(cloned.source).toBe('test');
      expect(cloned.flags).toBe('gi');
      expect(cloned).not.toBe(regex);
    });

    test('returns primitives as-is', () => {
      expect(JsonUtil.clone(42)).toBe(42);
      expect(JsonUtil.clone('hello')).toBe('hello');
      expect(JsonUtil.clone(null)).toBeNull();
      expect(JsonUtil.clone(true)).toBe(true);
    });
  });

  // ==================== Dot-notation Path Operations ====================

  describe('get()', () => {
    const obj = { a: { b: { c: 42 } }, x: [1, 2, 3] };

    test('gets deeply nested value', () => {
      expect(JsonUtil.get(obj, 'a.b.c')).toBe(42);
    });

    test('gets top-level value', () => {
      expect(JsonUtil.get(obj, 'x')).toEqual([1, 2, 3]);
    });

    test('returns default for missing path', () => {
      expect(JsonUtil.get(obj, 'a.b.d', 'default')).toBe('default');
    });

    test('returns undefined for missing path with no default', () => {
      expect(JsonUtil.get(obj, 'missing.path')).toBeUndefined();
    });

    test('returns default for null input', () => {
      expect(JsonUtil.get(null, 'a.b', 'fallback')).toBe('fallback');
    });

    test('returns default for non-object input', () => {
      expect(JsonUtil.get('string', 'a', 'fallback')).toBe('fallback');
    });

    test('returns default when path traverses through null', () => {
      expect(JsonUtil.get({ a: null }, 'a.b', 'fallback')).toBe('fallback');
    });
  });

  describe('set()', () => {
    test('sets deeply nested value', () => {
      const result = JsonUtil.set({}, 'a.b.c', 42);
      expect(result).toEqual({ a: { b: { c: 42 } } });
    });

    test('sets top-level value', () => {
      const obj = {};
      JsonUtil.set(obj, 'key', 'value');
      expect(obj.key).toBe('value');
    });

    test('overwrites existing value', () => {
      const obj = { a: { b: 1 } };
      JsonUtil.set(obj, 'a.b', 2);
      expect(obj.a.b).toBe(2);
    });

    test('creates intermediate objects', () => {
      const result = JsonUtil.set({}, 'x.y.z', true);
      expect(result.x.y.z).toBe(true);
    });

    test('handles non-object target', () => {
      const result = JsonUtil.set(null, 'a.b', 1);
      expect(result).toEqual({ a: { b: 1 } });
    });

    test('overwrites primitive intermediate values', () => {
      const obj = { a: 'string' };
      JsonUtil.set(obj, 'a.b', 1);
      expect(obj.a.b).toBe(1);
    });
  });

  describe('has()', () => {
    const obj = { a: { b: { c: 42 } }, x: null };

    test('returns true for existing path', () => {
      expect(JsonUtil.has(obj, 'a.b.c')).toBe(true);
    });

    test('returns true for top-level key', () => {
      expect(JsonUtil.has(obj, 'a')).toBe(true);
    });

    test('returns true for null value at path', () => {
      expect(JsonUtil.has(obj, 'x')).toBe(true);
    });

    test('returns false for missing path', () => {
      expect(JsonUtil.has(obj, 'a.b.d')).toBe(false);
    });

    test('returns false for null input', () => {
      expect(JsonUtil.has(null, 'a')).toBe(false);
    });

    test('returns false for non-object input', () => {
      expect(JsonUtil.has('string', 'length')).toBe(false);
    });

    test('returns false when path traverses through null', () => {
      expect(JsonUtil.has({ a: null }, 'a.b')).toBe(false);
    });
  });

  describe('unset()', () => {
    test('removes property at path', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(JsonUtil.unset(obj, 'a.b.c')).toBe(true);
      expect(obj.a.b).toEqual({});
    });

    test('removes top-level property', () => {
      const obj = { a: 1, b: 2 };
      expect(JsonUtil.unset(obj, 'a')).toBe(true);
      expect(obj).toEqual({ b: 2 });
    });

    test('returns false for non-existing path', () => {
      const obj = { a: 1 };
      expect(JsonUtil.unset(obj, 'b')).toBe(false);
    });

    test('returns false for null input', () => {
      expect(JsonUtil.unset(null, 'a')).toBe(false);
    });

    test('returns false for non-object input', () => {
      expect(JsonUtil.unset('string', 'a')).toBe(false);
    });

    test('returns false when intermediate path does not exist', () => {
      const obj = { a: 1 };
      expect(JsonUtil.unset(obj, 'a.b.c')).toBe(false);
    });
  });

  // ==================== Array/Object Utilities ====================

  describe('flatten()', () => {
    test('flattens nested object', () => {
      const result = JsonUtil.flatten({ a: { b: { c: 1 } } });
      expect(result).toEqual({ 'a.b.c': 1 });
    });

    test('flattens object with multiple nested levels', () => {
      const result = JsonUtil.flatten({ a: { b: 1 }, c: { d: 2 } });
      expect(result).toEqual({ 'a.b': 1, 'c.d': 2 });
    });

    test('keeps arrays as leaf values', () => {
      const result = JsonUtil.flatten({ a: { b: [1, 2, 3] } });
      expect(result).toEqual({ 'a.b': [1, 2, 3] });
    });

    test('handles flat object', () => {
      const result = JsonUtil.flatten({ a: 1, b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('handles empty object', () => {
      expect(JsonUtil.flatten({})).toEqual({});
    });

    test('supports custom prefix', () => {
      const result = JsonUtil.flatten({ b: 1 }, 'a');
      expect(result).toEqual({ 'a.b': 1 });
    });
  });

  describe('unflatten()', () => {
    test('unflattens dot notation keys', () => {
      const result = JsonUtil.unflatten({ 'a.b.c': 1 });
      expect(result).toEqual({ a: { b: { c: 1 } } });
    });

    test('unflattens multiple keys', () => {
      const result = JsonUtil.unflatten({ 'a.b': 1, 'a.c': 2, 'd': 3 });
      expect(result).toEqual({ a: { b: 1, c: 2 }, d: 3 });
    });

    test('handles flat keys', () => {
      const result = JsonUtil.unflatten({ a: 1, b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('handles empty object', () => {
      expect(JsonUtil.unflatten({})).toEqual({});
    });

    test('skips inherited properties in unflatten (line 351)', () => {
      const parent = { 'a.inherited': 'skip' };
      const obj = Object.create(parent);
      obj['b.own'] = 'keep';
      const result = JsonUtil.unflatten(obj);
      expect(result).toEqual({ b: { own: 'keep' } });
      expect(result.a).toBeUndefined();
    });
  });

  describe('flatten inherited properties (line 324)', () => {
    test('skips inherited properties in flatten', () => {
      const parent = { inherited: 'skip' };
      const obj = Object.create(parent);
      obj.own = 'keep';
      const result = JsonUtil.flatten(obj);
      expect(result).toEqual({ own: 'keep' });
    });
  });

  describe('keys()', () => {
    test('returns dot notation paths for nested object', () => {
      const result = JsonUtil.keys({ a: { b: 1, c: 2 } });
      expect(result).toEqual(['a.b', 'a.c']);
    });

    test('returns keys for flat object', () => {
      const result = JsonUtil.keys({ x: 1, y: 2 });
      expect(result).toEqual(['x', 'y']);
    });

    test('handles deeply nested object', () => {
      const result = JsonUtil.keys({ a: { b: { c: 1 } } });
      expect(result).toEqual(['a.b.c']);
    });

    test('treats arrays as leaf values', () => {
      const result = JsonUtil.keys({ a: [1, 2] });
      expect(result).toEqual(['a']);
    });

    test('handles empty object', () => {
      expect(JsonUtil.keys({})).toEqual([]);
    });

    test('supports custom prefix', () => {
      const result = JsonUtil.keys({ b: 1 }, 'a');
      expect(result).toEqual(['a.b']);
    });
  });

  describe('filter()', () => {
    test('filters object entries by value', () => {
      const result = JsonUtil.filter({ a: 1, b: 2, c: 3 }, (v) => v > 1);
      expect(result).toEqual({ b: 2, c: 3 });
    });

    test('filters by key', () => {
      const result = JsonUtil.filter({ name: 'John', age: 30 }, (v, k) => k === 'name');
      expect(result).toEqual({ name: 'John' });
    });

    test('returns empty object when nothing matches', () => {
      const result = JsonUtil.filter({ a: 1 }, (v) => v > 10);
      expect(result).toEqual({});
    });

    test('returns all entries when all match', () => {
      const result = JsonUtil.filter({ a: 1, b: 2 }, () => true);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('map()', () => {
    test('maps object values', () => {
      const result = JsonUtil.map({ a: 1, b: 2, c: 3 }, (v) => v * 2);
      expect(result).toEqual({ a: 2, b: 4, c: 6 });
    });

    test('receives key as second argument', () => {
      const result = JsonUtil.map({ x: 1 }, (v, k) => `${k}:${v}`);
      expect(result).toEqual({ x: 'x:1' });
    });

    test('handles empty object', () => {
      expect(JsonUtil.map({}, (v) => v)).toEqual({});
    });
  });

  // ==================== Comparison & Equality ====================

  describe('equals()', () => {
    test('returns true for identical primitives', () => {
      expect(JsonUtil.equals(42, 42)).toBe(true);
      expect(JsonUtil.equals('hello', 'hello')).toBe(true);
    });

    test('returns false for different primitives', () => {
      expect(JsonUtil.equals(42, 43)).toBe(false);
    });

    test('returns true for deeply equal objects', () => {
      expect(JsonUtil.equals({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    });

    test('returns false for different objects', () => {
      expect(JsonUtil.equals({ a: 1 }, { a: 2 })).toBe(false);
    });

    test('returns true for equal arrays', () => {
      expect(JsonUtil.equals([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    test('returns false for different arrays', () => {
      expect(JsonUtil.equals([1, 2], [1, 3])).toBe(false);
    });

    test('returns false for array vs object', () => {
      expect(JsonUtil.equals([1], { 0: 1 })).toBe(false);
    });

    test('returns true for equal Dates', () => {
      expect(JsonUtil.equals(new Date('2024-01-01'), new Date('2024-01-01'))).toBe(true);
    });

    test('returns false for different Dates', () => {
      expect(JsonUtil.equals(new Date('2024-01-01'), new Date('2024-01-02'))).toBe(false);
    });

    test('returns true for equal RegExps', () => {
      expect(JsonUtil.equals(/abc/gi, /abc/gi)).toBe(true);
    });

    test('returns false for different RegExps', () => {
      expect(JsonUtil.equals(/abc/g, /def/g)).toBe(false);
    });

    test('returns false when one is null', () => {
      expect(JsonUtil.equals(null, {})).toBe(false);
      expect(JsonUtil.equals({}, null)).toBe(false);
    });

    test('returns false when one is undefined', () => {
      expect(JsonUtil.equals(undefined, 1)).toBe(false);
    });

    test('returns true for null === null', () => {
      expect(JsonUtil.equals(null, null)).toBe(true);
    });

    test('returns false for objects with different key counts', () => {
      expect(JsonUtil.equals({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });
  });

  describe('diff()', () => {
    test('returns changed keys', () => {
      const result = JsonUtil.diff({ a: 1, b: 2 }, { a: 1, b: 3 });
      expect(result).toEqual({ b: 3 });
    });

    test('returns added keys', () => {
      const result = JsonUtil.diff({ a: 1 }, { a: 1, b: 2 });
      expect(result).toEqual({ b: 2 });
    });

    test('returns empty object when no changes', () => {
      const result = JsonUtil.diff({ a: 1 }, { a: 1 });
      expect(result).toEqual({});
    });

    test('detects nested changes', () => {
      const result = JsonUtil.diff(
        { a: { x: 1 } },
        { a: { x: 2 } }
      );
      expect(result).toEqual({ a: { x: 2 } });
    });

    test('handles empty original', () => {
      const result = JsonUtil.diff({}, { a: 1 });
      expect(result).toEqual({ a: 1 });
    });
  });

  // ==================== Type Conversion ====================

  describe('toQueryString()', () => {
    test('converts simple object to query string', () => {
      const result = JsonUtil.toQueryString({ a: 1, b: 2 });
      expect(result).toBe('a=1&b=2');
    });

    test('encodes special characters', () => {
      const result = JsonUtil.toQueryString({ q: 'hello world' });
      expect(result).toBe('q=hello%20world');
    });

    test('handles nested objects', () => {
      const result = JsonUtil.toQueryString({ user: { name: 'John' } });
      expect(result).toBe('user[name]=John');
    });

    test('handles arrays', () => {
      const result = JsonUtil.toQueryString({ colors: ['red', 'blue'] });
      expect(result).toBe('colors[0]=red&colors[1]=blue');
    });

    test('skips null and undefined values', () => {
      const result = JsonUtil.toQueryString({ a: 1, b: null, c: undefined });
      expect(result).toBe('a=1');
    });

    test('handles empty object', () => {
      expect(JsonUtil.toQueryString({})).toBe('');
    });
  });

  describe('fromQueryString()', () => {
    test('parses simple query string', () => {
      expect(JsonUtil.fromQueryString('a=1&b=2')).toEqual({ a: '1', b: '2' });
    });

    test('removes leading question mark', () => {
      expect(JsonUtil.fromQueryString('?a=1&b=2')).toEqual({ a: '1', b: '2' });
    });

    test('decodes encoded characters', () => {
      const result = JsonUtil.fromQueryString('q=hello%20world');
      expect(result.q).toBe('hello world');
    });

    test('returns empty object for empty string', () => {
      expect(JsonUtil.fromQueryString('')).toEqual({});
    });

    test('returns empty object for null', () => {
      expect(JsonUtil.fromQueryString(null)).toEqual({});
    });

    test('returns empty object for non-string', () => {
      expect(JsonUtil.fromQueryString(42)).toEqual({});
    });

    test('handles key without value', () => {
      const result = JsonUtil.fromQueryString('key');
      expect(result.key).toBe('');
    });
  });

  // ==================== Inherited Property Guards ====================

  describe('inherited property guards (lines 372, 400, 423, 497, 522)', () => {
    function createObjWithInherited() {
      const parent = { inherited: 'should-be-skipped' };
      const obj = Object.create(parent);
      obj.own = 'value';
      return obj;
    }

    test('keys() skips inherited properties', () => {
      const obj = createObjWithInherited();
      const result = JsonUtil.keys(obj);
      expect(result).toEqual(['own']);
      expect(result).not.toContain('inherited');
    });

    test('filter() skips inherited properties', () => {
      const obj = createObjWithInherited();
      const result = JsonUtil.filter(obj, () => true);
      expect(result).toEqual({ own: 'value' });
      expect(result).not.toHaveProperty('inherited');
    });

    test('map() skips inherited properties', () => {
      const obj = createObjWithInherited();
      const result = JsonUtil.map(obj, (v) => v.toUpperCase());
      expect(result).toEqual({ own: 'VALUE' });
      expect(result).not.toHaveProperty('inherited');
    });

    test('diff() skips inherited properties', () => {
      const obj1 = { own: 'value' };
      const obj2 = createObjWithInherited();
      obj2.own = 'changed';
      const result = JsonUtil.diff(obj1, obj2);
      expect(result).toEqual({ own: 'changed' });
      expect(result).not.toHaveProperty('inherited');
    });

    test('toQueryString() skips inherited properties', () => {
      const obj = createObjWithInherited();
      const result = JsonUtil.toQueryString(obj);
      expect(result).toBe('own=value');
      expect(result).not.toContain('inherited');
    });
  });

  describe('_mergeSource inherited property skip (line 149)', () => {
    test('skips inherited properties during merge', () => {
      const parent = { inherited: 'skip' };
      const source = Object.create(parent);
      source.own = 'keep';
      const result = JsonUtil.merge({}, source);
      expect(result.own).toBe('keep');
      expect(result.inherited).toBeUndefined();
    });
  });

  describe('clone inherited property skip (line 194)', () => {
    test('skips inherited properties during clone', () => {
      const parent = { inherited: 'skip' };
      const obj = Object.create(parent);
      obj.own = 'keep';
      const cloned = JsonUtil.clone(obj);
      expect(cloned.own).toBe('keep');
      expect(Object.hasOwn(cloned, 'inherited')).toBe(false);
    });
  });

  describe('fromQueryString empty key skip (line 566)', () => {
    test('skips empty key pairs', () => {
      const result = JsonUtil.fromQueryString('a=1&&b=2');
      expect(result).toEqual({ a: '1', b: '2' });
    });

    test('skips pairs with only separator', () => {
      const result = JsonUtil.fromQueryString('&&&');
      expect(result).toEqual({});
    });
  });

  describe('prettyPrint()', () => {
    test('returns formatted JSON string', () => {
      const result = JsonUtil.prettyPrint({ a: 1, b: 2 });
      expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    test('uses custom space parameter', () => {
      const result = JsonUtil.prettyPrint({ a: 1 }, 4);
      expect(result).toBe('{\n    "a": 1\n}');
    });

    test('handles arrays', () => {
      const result = JsonUtil.prettyPrint([1, 2, 3]);
      expect(result).toBe('[\n  1,\n  2,\n  3\n]');
    });

    test('handles null', () => {
      expect(JsonUtil.prettyPrint(null)).toBe('null');
    });
  });

});
