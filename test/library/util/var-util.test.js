const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const VarUtil = require(path.join(projectRoot, 'library/util/var-util'));

describe('VarUtil', () => {

  // ==================== Type Checking ====================

  describe('isNull', () => {
    it('should return true for null', () => {
      expect(VarUtil.isNull(null)).toBe(true);
    });
    it('should return false for non-null', () => {
      expect(VarUtil.isNull(undefined)).toBe(false);
      expect(VarUtil.isNull(0)).toBe(false);
      expect(VarUtil.isNull('')).toBe(false);
    });
  });

  describe('isUndefined', () => {
    it('should return true for undefined', () => {
      expect(VarUtil.isUndefined(undefined)).toBe(true);
    });
    it('should return false for defined values', () => {
      expect(VarUtil.isUndefined(null)).toBe(false);
      expect(VarUtil.isUndefined(0)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(VarUtil.isObject({})).toBe(true);
      expect(VarUtil.isObject({ a: 1 })).toBe(true);
    });
    it('should return false for arrays, null, primitives', () => {
      expect(VarUtil.isObject([])).toBe(false);
      expect(VarUtil.isObject(null)).toBe(false);
      expect(VarUtil.isObject('string')).toBe(false);
      expect(VarUtil.isObject(42)).toBe(false);
    });
  });

  describe('isBool', () => {
    it('should return true for booleans', () => {
      expect(VarUtil.isBool(true)).toBe(true);
      expect(VarUtil.isBool(false)).toBe(true);
    });
    it('should return false for non-booleans', () => {
      expect(VarUtil.isBool(0)).toBe(false);
      expect(VarUtil.isBool('true')).toBe(false);
    });
  });

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(VarUtil.isString('')).toBe(true);
      expect(VarUtil.isString('hello')).toBe(true);
    });
    it('should return false for non-strings', () => {
      expect(VarUtil.isString(123)).toBe(false);
      expect(VarUtil.isString(null)).toBe(false);
    });
  });

  describe('isInt', () => {
    it('should return true for integers', () => {
      expect(VarUtil.isInt(42)).toBe(true);
      expect(VarUtil.isInt(0)).toBe(true);
      expect(VarUtil.isInt(-5)).toBe(true);
    });
    it('should return false for non-integers', () => {
      expect(VarUtil.isInt(3.14)).toBe(false);
      expect(VarUtil.isInt('42')).toBe(false);
      expect(VarUtil.isInt(NaN)).toBe(false);
    });
  });

  describe('isFloat', () => {
    it('should return true for floats', () => {
      expect(VarUtil.isFloat(3.14)).toBe(true);
      expect(VarUtil.isFloat(-1.5)).toBe(true);
    });
    it('should return false for integers and non-numbers', () => {
      expect(VarUtil.isFloat(42)).toBe(false);
      expect(VarUtil.isFloat(NaN)).toBe(false);
      expect(VarUtil.isFloat(Infinity)).toBe(false);
      expect(VarUtil.isFloat('3.14')).toBe(false);
    });
  });

  describe('isNumeric', () => {
    it('should return true for numbers', () => {
      expect(VarUtil.isNumeric(42)).toBe(true);
      expect(VarUtil.isNumeric(3.14)).toBe(true);
    });
    it('should return true for numeric strings', () => {
      expect(VarUtil.isNumeric('42')).toBe(true);
      expect(VarUtil.isNumeric('3.14')).toBe(true);
    });
    it('should return false for non-numeric', () => {
      expect(VarUtil.isNumeric('abc')).toBe(false);
      expect(VarUtil.isNumeric(NaN)).toBe(false);
      expect(VarUtil.isNumeric(Infinity)).toBe(false);
      expect(VarUtil.isNumeric(null)).toBe(false);
      expect(VarUtil.isNumeric([])).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(VarUtil.isArray([])).toBe(true);
      expect(VarUtil.isArray([1, 2])).toBe(true);
    });
    it('should return false for non-arrays', () => {
      expect(VarUtil.isArray({})).toBe(false);
      expect(VarUtil.isArray('array')).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(VarUtil.isFunction(() => {})).toBe(true);
      expect(VarUtil.isFunction(function() {})).toBe(true);
    });
    it('should return false for non-functions', () => {
      expect(VarUtil.isFunction({})).toBe(false);
      expect(VarUtil.isFunction('fn')).toBe(false);
    });
  });

  describe('isDate', () => {
    it('should return true for valid Date', () => {
      expect(VarUtil.isDate(new Date())).toBe(true);
    });
    it('should return false for invalid Date', () => {
      expect(VarUtil.isDate(new Date('invalid'))).toBe(false);
    });
    it('should return false for non-Date', () => {
      expect(VarUtil.isDate('2025-01-01')).toBe(false);
    });
  });

  describe('isRegExp', () => {
    it('should return true for RegExp', () => {
      expect(VarUtil.isRegExp(/test/)).toBe(true);
      expect(VarUtil.isRegExp(new RegExp('test'))).toBe(true);
    });
    it('should return false for non-RegExp', () => {
      expect(VarUtil.isRegExp('/test/')).toBe(false);
    });
  });

  describe('isJSON', () => {
    it('should return true for valid JSON', () => {
      expect(VarUtil.isJSON('{"a":1}')).toBe(true);
      expect(VarUtil.isJSON('"hello"')).toBe(true);
      expect(VarUtil.isJSON('null')).toBe(true);
    });
    it('should return false for invalid JSON', () => {
      expect(VarUtil.isJSON('{a:1}')).toBe(false);
      expect(VarUtil.isJSON('not json')).toBe(false);
    });
    it('should return false for non-string', () => {
      expect(VarUtil.isJSON(123)).toBe(false);
      expect(VarUtil.isJSON(null)).toBe(false);
    });
  });

  // ==================== PHP-Inspired Functions ====================

  describe('isset', () => {
    it('should return true when all args are set', () => {
      expect(VarUtil.isset(1, 'a', true, {})).toBe(true);
    });
    it('should return false when any arg is null', () => {
      expect(VarUtil.isset(1, null)).toBe(false);
    });
    it('should return false when any arg is undefined', () => {
      expect(VarUtil.isset(1, undefined)).toBe(false);
    });
    it('should throw when no args', () => {
      expect(() => VarUtil.isset()).toThrow('isset() expects at least 1 parameter');
    });
  });

  describe('empty', () => {
    it('should return true for empty values', () => {
      expect(VarUtil.empty(undefined)).toBe(true);
      expect(VarUtil.empty(null)).toBe(true);
      expect(VarUtil.empty(false)).toBe(true);
      expect(VarUtil.empty(0)).toBe(true);
      expect(VarUtil.empty('0')).toBe(true);
      expect(VarUtil.empty('')).toBe(true);
      expect(VarUtil.empty([])).toBe(true);
      expect(VarUtil.empty({})).toBe(true);
    });
    it('should return false for non-empty values', () => {
      expect(VarUtil.empty(1)).toBe(false);
      expect(VarUtil.empty('hello')).toBe(false);
      expect(VarUtil.empty([1])).toBe(false);
      expect(VarUtil.empty({ a: 1 })).toBe(false);
      expect(VarUtil.empty(true)).toBe(false);
    });
  });

  describe('getType', () => {
    it('should return correct type for all types', () => {
      expect(VarUtil.getType(null)).toBe('null');
      expect(VarUtil.getType(undefined)).toBe('undefined');
      expect(VarUtil.getType([])).toBe('array');
      expect(VarUtil.getType(new Date())).toBe('date');
      expect(VarUtil.getType(/test/)).toBe('regexp');
      expect(VarUtil.getType(new Error())).toBe('error');
      expect(VarUtil.getType({})).toBe('object');
      expect(VarUtil.getType(42)).toBe('number');
      expect(VarUtil.getType('str')).toBe('string');
      expect(VarUtil.getType(true)).toBe('boolean');
      expect(VarUtil.getType(() => {})).toBe('function');
    });
    it('should return constructor name for custom objects', () => {
      class MyClass {}
      expect(VarUtil.getType(new MyClass())).toBe('myclass');
    });
    it('should return "object" when no constructor', () => {
      const obj = Object.create(null);
      expect(VarUtil.getType(obj)).toBe('object');
    });
  });

  // ==================== Utility Functions ====================

  describe('hasKey', () => {
    it('should return true for existing key in object', () => {
      expect(VarUtil.hasKey({ a: 1 }, 'a')).toBe(true);
    });
    it('should return false for missing key', () => {
      expect(VarUtil.hasKey({ a: 1 }, 'b')).toBe(false);
    });
    it('should work with arrays', () => {
      expect(VarUtil.hasKey([10, 20], 0)).toBe(true);
      expect(VarUtil.hasKey([10, 20], 5)).toBe(false);
    });
    it('should return false for non-object/non-array', () => {
      expect(VarUtil.hasKey('string', 0)).toBe(false);
      expect(VarUtil.hasKey(42, 'a')).toBe(false);
    });
  });

  describe('count', () => {
    it('should count array elements', () => {
      expect(VarUtil.count([1, 2, 3])).toBe(3);
    });
    it('should count object keys', () => {
      expect(VarUtil.count({ a: 1, b: 2 })).toBe(2);
    });
    it('should count string length', () => {
      expect(VarUtil.count('hello')).toBe(5);
    });
    it('should return 0 for other types', () => {
      expect(VarUtil.count(42)).toBe(0);
      expect(VarUtil.count(null)).toBe(0);
    });
  });

  describe('isScalar', () => {
    it('should return true for scalar types', () => {
      expect(VarUtil.isScalar('string')).toBe(true);
      expect(VarUtil.isScalar(42)).toBe(true);
      expect(VarUtil.isScalar(true)).toBe(true);
    });
    it('should return false for non-scalar types', () => {
      expect(VarUtil.isScalar({})).toBe(false);
      expect(VarUtil.isScalar([])).toBe(false);
      expect(VarUtil.isScalar(null)).toBe(false);
    });
  });

  describe('isCallable', () => {
    it('should return true for functions', () => {
      expect(VarUtil.isCallable(() => {})).toBe(true);
    });
    it('should return false for non-functions', () => {
      expect(VarUtil.isCallable('fn')).toBe(false);
    });
  });

  // ==================== Type Conversion ====================

  describe('intval', () => {
    it('should convert to integer', () => {
      expect(VarUtil.intval('42')).toBe(42);
      expect(VarUtil.intval(3.14)).toBe(3);
    });
    it('should return 0 for non-numeric', () => {
      expect(VarUtil.intval('abc')).toBe(0);
      expect(VarUtil.intval(null)).toBe(0);
    });
    it('should support different bases', () => {
      expect(VarUtil.intval('ff', 16)).toBe(255);
      expect(VarUtil.intval('10', 2)).toBe(2);
    });
  });

  describe('floatval', () => {
    it('should convert to float', () => {
      expect(VarUtil.floatval('3.14')).toBe(3.14);
      expect(VarUtil.floatval(42)).toBe(42);
    });
    it('should return 0 for non-numeric', () => {
      expect(VarUtil.floatval('abc')).toBe(0);
      expect(VarUtil.floatval(null)).toBe(0);
    });
  });

  describe('boolval', () => {
    it('should convert to boolean', () => {
      expect(VarUtil.boolval(1)).toBe(true);
      expect(VarUtil.boolval(0)).toBe(false);
      expect(VarUtil.boolval('')).toBe(false);
      expect(VarUtil.boolval('hello')).toBe(true);
    });
  });

  describe('strval', () => {
    it('should convert to string', () => {
      expect(VarUtil.strval(42)).toBe('42');
      expect(VarUtil.strval(true)).toBe('true');
    });
    it('should return empty for null/undefined', () => {
      expect(VarUtil.strval(null)).toBe('');
      expect(VarUtil.strval(undefined)).toBe('');
    });
    it('should JSON stringify objects', () => {
      expect(VarUtil.strval({ a: 1 })).toBe('{"a":1}');
    });
  });

  // ==================== Deep Operations ====================

  describe('clone', () => {
    it('should clone primitives', () => {
      expect(VarUtil.clone(42)).toBe(42);
      expect(VarUtil.clone('hello')).toBe('hello');
      expect(VarUtil.clone(null)).toBe(null);
    });
    it('should deep clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = VarUtil.clone(obj);
      expect(cloned).toEqual(obj);
      cloned.b.c = 99;
      expect(obj.b.c).toBe(2);
    });
    it('should clone arrays', () => {
      const arr = [1, [2, 3]];
      const cloned = VarUtil.clone(arr);
      expect(cloned).toEqual(arr);
      cloned[1][0] = 99;
      expect(arr[1][0]).toBe(2);
    });
    it('should clone Date', () => {
      const d = new Date('2025-01-01');
      const cloned = VarUtil.clone(d);
      expect(cloned).toEqual(d);
      expect(cloned).not.toBe(d);
    });
    it('should clone RegExp', () => {
      const r = /test/gi;
      const cloned = VarUtil.clone(r);
      expect(cloned.source).toBe('test');
      expect(cloned.flags).toBe('gi');
      expect(cloned).not.toBe(r);
    });
    it('should skip inherited properties in clone (branch line 339)', () => {
      const parent = { inherited: 'skip' };
      const obj = Object.create(parent);
      obj.own = 1;
      const cloned = VarUtil.clone(obj);
      expect(cloned).toEqual({ own: 1 });
      expect(cloned.inherited).toBeUndefined();
    });
  });

  describe('isEqual', () => {
    it('should return true for identical primitives', () => {
      expect(VarUtil.isEqual(42, 42)).toBe(true);
      expect(VarUtil.isEqual('hello', 'hello')).toBe(true);
    });
    it('should return false for different primitives', () => {
      expect(VarUtil.isEqual(42, 43)).toBe(false);
      expect(VarUtil.isEqual('a', 'b')).toBe(false);
    });
    it('should handle null/undefined', () => {
      expect(VarUtil.isEqual(null, null)).toBe(true);
      expect(VarUtil.isEqual(null, undefined)).toBe(false);
      expect(VarUtil.isEqual(1, null)).toBe(false);
      expect(VarUtil.isEqual(null, 1)).toBe(false);
    });
    it('should deep compare objects', () => {
      expect(VarUtil.isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(VarUtil.isEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(VarUtil.isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });
    it('should deep compare arrays', () => {
      expect(VarUtil.isEqual([1, 2], [1, 2])).toBe(true);
      expect(VarUtil.isEqual([1, 2], [1, 3])).toBe(false);
    });
    it('should compare Date objects', () => {
      const d1 = new Date('2025-01-01');
      const d2 = new Date('2025-01-01');
      const d3 = new Date('2025-06-01');
      expect(VarUtil.isEqual(d1, d2)).toBe(true);
      expect(VarUtil.isEqual(d1, d3)).toBe(false);
    });
    it('should compare RegExp objects', () => {
      expect(VarUtil.isEqual(/test/g, /test/g)).toBe(true);
      expect(VarUtil.isEqual(/test/g, /test/i)).toBe(false);
    });
    it('should return false for mixed types', () => {
      expect(VarUtil.isEqual([], {})).toBe(false);
      expect(VarUtil.isEqual(42, '42')).toBe(false);
    });
    it('should return false when key is missing in second object', () => {
      expect(VarUtil.isEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
    });
  });
});
