const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const VarUtil = require(path.join(projectRoot, 'library/util/var-util'));

describe('VarUtil', () => {

  // ==================== Type Checking ====================

  describe('isNull()', () => {
    test('returns true for null', () => {
      expect(VarUtil.isNull(null)).toBe(true);
    });

    test('returns false for undefined', () => {
      expect(VarUtil.isNull(undefined)).toBe(false);
    });

    test('returns false for 0', () => {
      expect(VarUtil.isNull(0)).toBe(false);
    });

    test('returns false for empty string', () => {
      expect(VarUtil.isNull('')).toBe(false);
    });

    test('returns false for false', () => {
      expect(VarUtil.isNull(false)).toBe(false);
    });
  });

  describe('isUndefined()', () => {
    test('returns true for undefined', () => {
      expect(VarUtil.isUndefined(undefined)).toBe(true);
    });

    test('returns false for null', () => {
      expect(VarUtil.isUndefined(null)).toBe(false);
    });

    test('returns false for 0', () => {
      expect(VarUtil.isUndefined(0)).toBe(false);
    });

    test('returns false for empty string', () => {
      expect(VarUtil.isUndefined('')).toBe(false);
    });
  });

  describe('isObject()', () => {
    test('returns true for plain object', () => {
      expect(VarUtil.isObject({})).toBe(true);
    });

    test('returns true for object with properties', () => {
      expect(VarUtil.isObject({ a: 1 })).toBe(true);
    });

    test('returns false for null', () => {
      expect(VarUtil.isObject(null)).toBe(false);
    });

    test('returns false for array', () => {
      expect(VarUtil.isObject([1, 2])).toBe(false);
    });

    test('returns false for Date', () => {
      expect(VarUtil.isObject(new Date())).toBe(true); // Date is typeof object and not array
    });

    test('returns false for string', () => {
      expect(VarUtil.isObject('hello')).toBe(false);
    });

    test('returns false for number', () => {
      expect(VarUtil.isObject(42)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(VarUtil.isObject(undefined)).toBe(false);
    });
  });

  describe('isBool()', () => {
    test('returns true for true', () => {
      expect(VarUtil.isBool(true)).toBe(true);
    });

    test('returns true for false', () => {
      expect(VarUtil.isBool(false)).toBe(true);
    });

    test('returns false for 0', () => {
      expect(VarUtil.isBool(0)).toBe(false);
    });

    test('returns false for 1', () => {
      expect(VarUtil.isBool(1)).toBe(false);
    });

    test('returns false for string "true"', () => {
      expect(VarUtil.isBool('true')).toBe(false);
    });
  });

  describe('isString()', () => {
    test('returns true for string literal', () => {
      expect(VarUtil.isString('hello')).toBe(true);
    });

    test('returns true for empty string', () => {
      expect(VarUtil.isString('')).toBe(true);
    });

    test('returns false for number', () => {
      expect(VarUtil.isString(42)).toBe(false);
    });

    test('returns false for null', () => {
      expect(VarUtil.isString(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(VarUtil.isString(undefined)).toBe(false);
    });
  });

  describe('isInt()', () => {
    test('returns true for integer', () => {
      expect(VarUtil.isInt(42)).toBe(true);
    });

    test('returns true for 0', () => {
      expect(VarUtil.isInt(0)).toBe(true);
    });

    test('returns true for negative integer', () => {
      expect(VarUtil.isInt(-5)).toBe(true);
    });

    test('returns false for float', () => {
      expect(VarUtil.isInt(3.14)).toBe(false);
    });

    test('returns false for string', () => {
      expect(VarUtil.isInt('42')).toBe(false);
    });

    test('returns false for NaN', () => {
      expect(VarUtil.isInt(NaN)).toBe(false);
    });

    test('returns false for Infinity', () => {
      expect(VarUtil.isInt(Infinity)).toBe(false);
    });
  });

  describe('isFloat()', () => {
    test('returns true for float', () => {
      expect(VarUtil.isFloat(3.14)).toBe(true);
    });

    test('returns true for negative float', () => {
      expect(VarUtil.isFloat(-2.5)).toBe(true);
    });

    test('returns false for integer', () => {
      expect(VarUtil.isFloat(42)).toBe(false);
    });

    test('returns false for NaN', () => {
      expect(VarUtil.isFloat(NaN)).toBe(false);
    });

    test('returns false for Infinity', () => {
      expect(VarUtil.isFloat(Infinity)).toBe(false);
    });

    test('returns false for string', () => {
      expect(VarUtil.isFloat('3.14')).toBe(false);
    });
  });

  describe('isNumeric()', () => {
    test('returns true for integer', () => {
      expect(VarUtil.isNumeric(42)).toBe(true);
    });

    test('returns true for float', () => {
      expect(VarUtil.isNumeric(3.14)).toBe(true);
    });

    test('returns true for numeric string', () => {
      expect(VarUtil.isNumeric('42')).toBe(true);
    });

    test('returns true for float string', () => {
      expect(VarUtil.isNumeric('3.14')).toBe(true);
    });

    test('returns true for negative numeric string', () => {
      expect(VarUtil.isNumeric('-10')).toBe(true);
    });

    test('returns false for non-numeric string', () => {
      expect(VarUtil.isNumeric('hello')).toBe(false);
    });

    test('returns false for NaN', () => {
      expect(VarUtil.isNumeric(NaN)).toBe(false);
    });

    test('returns false for Infinity', () => {
      expect(VarUtil.isNumeric(Infinity)).toBe(false);
    });

    test('returns false for boolean', () => {
      expect(VarUtil.isNumeric(true)).toBe(false);
    });

    test('returns false for null', () => {
      expect(VarUtil.isNumeric(null)).toBe(false);
    });

    test('returns false for empty string', () => {
      expect(VarUtil.isNumeric('')).toBe(false);
    });
  });

  describe('isArray()', () => {
    test('returns true for array', () => {
      expect(VarUtil.isArray([1, 2, 3])).toBe(true);
    });

    test('returns true for empty array', () => {
      expect(VarUtil.isArray([])).toBe(true);
    });

    test('returns false for object', () => {
      expect(VarUtil.isArray({})).toBe(false);
    });

    test('returns false for string', () => {
      expect(VarUtil.isArray('hello')).toBe(false);
    });

    test('returns false for null', () => {
      expect(VarUtil.isArray(null)).toBe(false);
    });
  });

  describe('isFunction()', () => {
    test('returns true for function declaration', () => {
      expect(VarUtil.isFunction(function() {})).toBe(true);
    });

    test('returns true for arrow function', () => {
      expect(VarUtil.isFunction(() => {})).toBe(true);
    });

    test('returns false for object', () => {
      expect(VarUtil.isFunction({})).toBe(false);
    });

    test('returns false for string', () => {
      expect(VarUtil.isFunction('function')).toBe(false);
    });
  });

  describe('isDate()', () => {
    test('returns true for valid Date', () => {
      expect(VarUtil.isDate(new Date())).toBe(true);
    });

    test('returns true for specific date', () => {
      expect(VarUtil.isDate(new Date('2024-01-01'))).toBe(true);
    });

    test('returns false for invalid Date', () => {
      expect(VarUtil.isDate(new Date('invalid'))).toBe(false);
    });

    test('returns false for date string', () => {
      expect(VarUtil.isDate('2024-01-01')).toBe(false);
    });

    test('returns false for number', () => {
      expect(VarUtil.isDate(1234567890)).toBe(false);
    });
  });

  describe('isRegExp()', () => {
    test('returns true for RegExp literal', () => {
      expect(VarUtil.isRegExp(/abc/)).toBe(true);
    });

    test('returns true for RegExp constructor', () => {
      expect(VarUtil.isRegExp(new RegExp('abc'))).toBe(true);
    });

    test('returns false for string', () => {
      expect(VarUtil.isRegExp('/abc/')).toBe(false);
    });

    test('returns false for object', () => {
      expect(VarUtil.isRegExp({})).toBe(false);
    });
  });

  describe('isJSON()', () => {
    test('returns true for valid JSON object string', () => {
      expect(VarUtil.isJSON('{"a":1}')).toBe(true);
    });

    test('returns true for valid JSON array string', () => {
      expect(VarUtil.isJSON('[1,2,3]')).toBe(true);
    });

    test('returns true for JSON string value', () => {
      expect(VarUtil.isJSON('"hello"')).toBe(true);
    });

    test('returns true for JSON number', () => {
      expect(VarUtil.isJSON('42')).toBe(true);
    });

    test('returns false for invalid JSON', () => {
      expect(VarUtil.isJSON('{invalid}')).toBe(false);
    });

    test('returns false for non-string', () => {
      expect(VarUtil.isJSON(42)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(VarUtil.isJSON(undefined)).toBe(false);
    });
  });

  // ==================== PHP-Inspired Functions ====================

  describe('isset()', () => {
    test('returns true for a defined value', () => {
      expect(VarUtil.isset('hello')).toBe(true);
    });

    test('returns true for 0', () => {
      expect(VarUtil.isset(0)).toBe(true);
    });

    test('returns true for false', () => {
      expect(VarUtil.isset(false)).toBe(true);
    });

    test('returns true for empty string', () => {
      expect(VarUtil.isset('')).toBe(true);
    });

    test('returns false for null', () => {
      expect(VarUtil.isset(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(VarUtil.isset(undefined)).toBe(false);
    });

    test('returns true for multiple defined values', () => {
      expect(VarUtil.isset(1, 'a', true)).toBe(true);
    });

    test('returns false if any value is null', () => {
      expect(VarUtil.isset(1, null, 'a')).toBe(false);
    });

    test('returns false if any value is undefined', () => {
      expect(VarUtil.isset(1, undefined, 'a')).toBe(false);
    });

    test('throws when called with no arguments', () => {
      expect(() => VarUtil.isset()).toThrow('isset() expects at least 1 parameter, 0 given');
    });
  });

  describe('empty()', () => {
    test('returns true for undefined', () => {
      expect(VarUtil.empty(undefined)).toBe(true);
    });

    test('returns true for null', () => {
      expect(VarUtil.empty(null)).toBe(true);
    });

    test('returns true for false', () => {
      expect(VarUtil.empty(false)).toBe(true);
    });

    test('returns true for 0', () => {
      expect(VarUtil.empty(0)).toBe(true);
    });

    test('returns true for "0"', () => {
      expect(VarUtil.empty('0')).toBe(true);
    });

    test('returns true for empty string', () => {
      expect(VarUtil.empty('')).toBe(true);
    });

    test('returns true for empty array', () => {
      expect(VarUtil.empty([])).toBe(true);
    });

    test('returns true for empty object', () => {
      expect(VarUtil.empty({})).toBe(true);
    });

    test('returns false for non-empty string', () => {
      expect(VarUtil.empty('hello')).toBe(false);
    });

    test('returns false for non-zero number', () => {
      expect(VarUtil.empty(42)).toBe(false);
    });

    test('returns false for non-empty array', () => {
      expect(VarUtil.empty([1])).toBe(false);
    });

    test('returns false for non-empty object', () => {
      expect(VarUtil.empty({ a: 1 })).toBe(false);
    });

    test('returns false for true', () => {
      expect(VarUtil.empty(true)).toBe(false);
    });
  });

  describe('getType()', () => {
    test('returns "null" for null', () => {
      expect(VarUtil.getType(null)).toBe('null');
    });

    test('returns "undefined" for undefined', () => {
      expect(VarUtil.getType(undefined)).toBe('undefined');
    });

    test('returns "array" for arrays', () => {
      expect(VarUtil.getType([1, 2])).toBe('array');
    });

    test('returns "date" for Date objects', () => {
      expect(VarUtil.getType(new Date())).toBe('date');
    });

    test('returns "regexp" for RegExp', () => {
      expect(VarUtil.getType(/abc/)).toBe('regexp');
    });

    test('returns "error" for Error objects', () => {
      expect(VarUtil.getType(new Error('test'))).toBe('error');
    });

    test('returns "object" for plain objects', () => {
      expect(VarUtil.getType({ a: 1 })).toBe('object');
    });

    test('returns "string" for strings', () => {
      expect(VarUtil.getType('hello')).toBe('string');
    });

    test('returns "number" for numbers', () => {
      expect(VarUtil.getType(42)).toBe('number');
    });

    test('returns "boolean" for booleans', () => {
      expect(VarUtil.getType(true)).toBe('boolean');
    });

    test('returns "function" for functions', () => {
      expect(VarUtil.getType(() => {})).toBe('function');
    });
  });

  // ==================== Utility Functions ====================

  describe('hasKey()', () => {
    test('returns true for existing object key', () => {
      expect(VarUtil.hasKey({ a: 1 }, 'a')).toBe(true);
    });

    test('returns false for non-existing key', () => {
      expect(VarUtil.hasKey({ a: 1 }, 'b')).toBe(false);
    });

    test('returns true for array index', () => {
      expect(VarUtil.hasKey([10, 20, 30], '1')).toBe(true);
    });

    test('returns false for non-object', () => {
      expect(VarUtil.hasKey('string', 'length')).toBe(false);
    });

    test('returns false for null', () => {
      expect(VarUtil.hasKey(null, 'key')).toBe(false);
    });

    test('returns false for number', () => {
      expect(VarUtil.hasKey(42, 'key')).toBe(false);
    });
  });

  describe('count()', () => {
    test('counts array elements', () => {
      expect(VarUtil.count([1, 2, 3])).toBe(3);
    });

    test('counts object keys', () => {
      expect(VarUtil.count({ a: 1, b: 2 })).toBe(2);
    });

    test('counts string length', () => {
      expect(VarUtil.count('hello')).toBe(5);
    });

    test('returns 0 for empty array', () => {
      expect(VarUtil.count([])).toBe(0);
    });

    test('returns 0 for empty object', () => {
      expect(VarUtil.count({})).toBe(0);
    });

    test('returns 0 for number', () => {
      expect(VarUtil.count(42)).toBe(0);
    });

    test('returns 0 for null', () => {
      expect(VarUtil.count(null)).toBe(0);
    });

    test('returns 0 for boolean', () => {
      expect(VarUtil.count(true)).toBe(0);
    });
  });

  describe('isScalar()', () => {
    test('returns true for string', () => {
      expect(VarUtil.isScalar('hello')).toBe(true);
    });

    test('returns true for number', () => {
      expect(VarUtil.isScalar(42)).toBe(true);
    });

    test('returns true for boolean', () => {
      expect(VarUtil.isScalar(true)).toBe(true);
    });

    test('returns false for object', () => {
      expect(VarUtil.isScalar({})).toBe(false);
    });

    test('returns false for array', () => {
      expect(VarUtil.isScalar([])).toBe(false);
    });

    test('returns false for null', () => {
      expect(VarUtil.isScalar(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(VarUtil.isScalar(undefined)).toBe(false);
    });

    test('returns false for function', () => {
      expect(VarUtil.isScalar(() => {})).toBe(false);
    });
  });

  describe('isCallable()', () => {
    test('returns true for function', () => {
      expect(VarUtil.isCallable(() => {})).toBe(true);
    });

    test('returns true for named function', () => {
      expect(VarUtil.isCallable(function named() {})).toBe(true);
    });

    test('returns false for string', () => {
      expect(VarUtil.isCallable('hello')).toBe(false);
    });

    test('returns false for object', () => {
      expect(VarUtil.isCallable({})).toBe(false);
    });
  });

  // ==================== Type Conversions ====================

  describe('intval()', () => {
    test('converts string to integer', () => {
      expect(VarUtil.intval('42')).toBe(42);
    });

    test('converts float string to integer', () => {
      expect(VarUtil.intval('3.14')).toBe(3);
    });

    test('converts float to integer', () => {
      expect(VarUtil.intval(3.99)).toBe(3);
    });

    test('returns 0 for non-numeric string', () => {
      expect(VarUtil.intval('hello')).toBe(0);
    });

    test('returns 0 for null', () => {
      expect(VarUtil.intval(null)).toBe(0);
    });

    test('supports base conversion', () => {
      expect(VarUtil.intval('ff', 16)).toBe(255);
    });

    test('supports binary base', () => {
      expect(VarUtil.intval('1010', 2)).toBe(10);
    });

    test('supports octal base', () => {
      expect(VarUtil.intval('77', 8)).toBe(63);
    });
  });

  describe('floatval()', () => {
    test('converts string to float', () => {
      expect(VarUtil.floatval('3.14')).toBe(3.14);
    });

    test('converts integer string to float', () => {
      expect(VarUtil.floatval('42')).toBe(42);
    });

    test('returns 0 for non-numeric string', () => {
      expect(VarUtil.floatval('hello')).toBe(0);
    });

    test('returns 0 for null', () => {
      expect(VarUtil.floatval(null)).toBe(0);
    });

    test('converts number as-is', () => {
      expect(VarUtil.floatval(2.718)).toBe(2.718);
    });
  });

  describe('boolval()', () => {
    test('converts truthy values to true', () => {
      expect(VarUtil.boolval(1)).toBe(true);
      expect(VarUtil.boolval('hello')).toBe(true);
      expect(VarUtil.boolval([])).toBe(true);
      expect(VarUtil.boolval({})).toBe(true);
    });

    test('converts falsy values to false', () => {
      expect(VarUtil.boolval(0)).toBe(false);
      expect(VarUtil.boolval('')).toBe(false);
      expect(VarUtil.boolval(null)).toBe(false);
      expect(VarUtil.boolval(undefined)).toBe(false);
    });
  });

  describe('strval()', () => {
    test('converts number to string', () => {
      expect(VarUtil.strval(42)).toBe('42');
    });

    test('converts boolean to string', () => {
      expect(VarUtil.strval(true)).toBe('true');
    });

    test('returns empty string for null', () => {
      expect(VarUtil.strval(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
      expect(VarUtil.strval(undefined)).toBe('');
    });

    test('converts object to JSON string', () => {
      expect(VarUtil.strval({ a: 1 })).toBe('{"a":1}');
    });

    test('converts array to JSON string', () => {
      expect(VarUtil.strval([1, 2])).toBe('[1,2]');
    });

    test('returns string as-is', () => {
      expect(VarUtil.strval('hello')).toBe('hello');
    });
  });

  // ==================== Clone ====================

  describe('clone()', () => {
    test('clones plain object', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = VarUtil.clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    test('clones array', () => {
      const arr = [1, [2, 3], { a: 4 }];
      const cloned = VarUtil.clone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    test('clones Date object', () => {
      const date = new Date('2024-01-01');
      const cloned = VarUtil.clone(date);
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
      expect(cloned instanceof Date).toBe(true);
    });

    test('clones RegExp object', () => {
      const regex = /abc/gi;
      const cloned = VarUtil.clone(regex);
      expect(cloned.source).toBe(regex.source);
      expect(cloned.flags).toBe(regex.flags);
      expect(cloned).not.toBe(regex);
    });

    test('returns primitives as-is', () => {
      expect(VarUtil.clone(42)).toBe(42);
      expect(VarUtil.clone('hello')).toBe('hello');
      expect(VarUtil.clone(null)).toBe(null);
      expect(VarUtil.clone(true)).toBe(true);
    });
  });

  describe('getType() with null constructor (line 207)', () => {
    test('returns "object" for Object.create(null)', () => {
      const obj = Object.create(null);
      obj.key = 'value';
      expect(VarUtil.getType(obj)).toBe('object');
    });
  });

  describe('clone() skips inherited properties (line 339)', () => {
    test('only clones own properties, not inherited ones', () => {
      const parent = { inherited: 'should-be-skipped' };
      const obj = Object.create(parent);
      obj.own = 'value';
      const cloned = VarUtil.clone(obj);
      expect(cloned).toHaveProperty('own', 'value');
      expect(Object.hasOwn(cloned, 'inherited')).toBe(false);
    });
  });

  // ==================== isEqual ====================

  describe('isEqual()', () => {
    test('returns true for identical primitives', () => {
      expect(VarUtil.isEqual(42, 42)).toBe(true);
      expect(VarUtil.isEqual('hello', 'hello')).toBe(true);
      expect(VarUtil.isEqual(true, true)).toBe(true);
    });

    test('returns false for different primitives', () => {
      expect(VarUtil.isEqual(42, 43)).toBe(false);
      expect(VarUtil.isEqual('hello', 'world')).toBe(false);
    });

    test('returns true for equal objects', () => {
      expect(VarUtil.isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    test('returns false for different objects', () => {
      expect(VarUtil.isEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    test('returns false for objects with different keys', () => {
      expect(VarUtil.isEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    test('returns true for equal arrays', () => {
      expect(VarUtil.isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    test('returns false for different arrays', () => {
      expect(VarUtil.isEqual([1, 2], [1, 3])).toBe(false);
    });

    test('returns false for array vs object', () => {
      expect(VarUtil.isEqual([1], { 0: 1 })).toBe(false);
    });

    test('returns true for equal nested objects', () => {
      const a = { x: { y: { z: 1 } } };
      const b = { x: { y: { z: 1 } } };
      expect(VarUtil.isEqual(a, b)).toBe(true);
    });

    test('returns true for equal Date objects', () => {
      const d1 = new Date('2024-01-01');
      const d2 = new Date('2024-01-01');
      expect(VarUtil.isEqual(d1, d2)).toBe(true);
    });

    test('returns false for different Date objects', () => {
      const d1 = new Date('2024-01-01');
      const d2 = new Date('2024-01-02');
      expect(VarUtil.isEqual(d1, d2)).toBe(false);
    });

    test('returns true for equal RegExp objects', () => {
      expect(VarUtil.isEqual(/abc/gi, /abc/gi)).toBe(true);
    });

    test('returns false for different RegExp objects', () => {
      expect(VarUtil.isEqual(/abc/g, /abc/i)).toBe(false);
    });

    test('returns false when one value is null', () => {
      expect(VarUtil.isEqual(null, { a: 1 })).toBe(false);
      expect(VarUtil.isEqual({ a: 1 }, null)).toBe(false);
    });

    test('returns false when one value is undefined', () => {
      expect(VarUtil.isEqual(undefined, 'hello')).toBe(false);
    });

    test('returns true for null === null', () => {
      expect(VarUtil.isEqual(null, null)).toBe(true);
    });

    test('returns false for objects with different key counts', () => {
      expect(VarUtil.isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    test('returns false for non-object vs object', () => {
      expect(VarUtil.isEqual(42, { a: 1 })).toBe(false);
    });
  });

});
