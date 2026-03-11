const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const ClassMethodsHydrator = require(path.join(projectRoot, 'library/db/hydrator/class-methods-hydrator'));

describe('ClassMethodsHydrator', () => {
  let hydrator;

  beforeEach(() => {
    hydrator = new ClassMethodsHydrator();
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should default underscoreSeparatedKeys to true', () => {
      expect(hydrator.underscoreSeparatedKeys).toBe(true);
    });

    it('should set underscoreSeparatedKeys to false when specified', () => {
      const h = new ClassMethodsHydrator({ underscoreSeparatedKeys: false });
      expect(h.underscoreSeparatedKeys).toBe(false);
    });
  });

  // --- _toPropertyName ---
  describe('_toPropertyName', () => {
    it('should convert snake_case to camelCase', () => {
      const result = hydrator._toPropertyName('user_name');
      expect(result).toBe('userName');
    });

    it('should convert multi-segment snake_case', () => {
      const result = hydrator._toPropertyName('first_name_value');
      expect(result).toBe('firstNameValue');
    });

    it('should lowercase camelCase input (toCamelCase normalises)', () => {
      const result = hydrator._toPropertyName('userName');
      // toCamelCase lowercases the whole string first, so N is lost
      expect(result).toBe('username');
    });

    it('should not convert when underscoreSeparatedKeys is false', () => {
      const h = new ClassMethodsHydrator({ underscoreSeparatedKeys: false });
      expect(h._toPropertyName('user_name')).toBe('user_name');
    });
  });

  describe('_toPropertyName fallback when StringUtil.toCamelCase is unavailable (line 57)', () => {
    it('should use replaceAll fallback when toCamelCase is missing', () => {
      // Temporarily remove toCamelCase from StringUtil
      const StringUtil = require(path.join(projectRoot, 'library/util/string-util'));
      const origToCamelCase = StringUtil.toCamelCase;
      delete StringUtil.toCamelCase;

      const h = new ClassMethodsHydrator();
      const result = h._toPropertyName('user_name');
      expect(result).toBe('userName');

      // Restore
      StringUtil.toCamelCase = origToCamelCase;
    });
  });

  // --- hydrate ---
  describe('hydrate', () => {
    it('should call setter methods when they exist on the object', () => {
      const dto = {
        _userId: null,
        _tenantId: null,
        setUserId(val) { this._userId = val; },
        setTenantId(val) { this._tenantId = val; },
      };

      const result = hydrator.hydrate({ user_id: 1, tenant_id: 't1' }, dto);

      expect(result._userId).toBe(1);
      expect(result._tenantId).toBe('t1');
      expect(result).toBe(dto);
    });

    it('should assign directly when no setter exists', () => {
      const obj = {};

      const result = hydrator.hydrate({ user_id: 1, full_name: 'John' }, obj);

      expect(result.userId).toBe(1);
      expect(result.fullName).toBe('John');
    });

    it('should return object unchanged when data is null', () => {
      const obj = { existing: true };
      const result = hydrator.hydrate(null, obj);
      expect(result).toBe(obj);
      expect(result.existing).toBe(true);
    });

    it('should return object unchanged when data is not an object', () => {
      const obj = { existing: true };
      expect(hydrator.hydrate('string', obj)).toBe(obj);
      expect(hydrator.hydrate(123, obj)).toBe(obj);
      expect(hydrator.hydrate(undefined, obj)).toBe(obj);
    });

    it('should not convert keys when underscoreSeparatedKeys is false', () => {
      const h = new ClassMethodsHydrator({ underscoreSeparatedKeys: false });
      const obj = {};
      h.hydrate({ user_name: 'Alice' }, obj);
      expect(obj.user_name).toBe('Alice');
      expect(obj.userName).toBeUndefined();
    });
  });

  // --- extract ---
  describe('extract', () => {
    it('should return a copy of object properties', () => {
      const obj = { userId: 1, name: 'Alice', active: true };
      const result = hydrator.extract(obj);

      expect(result).toEqual({ userId: 1, name: 'Alice', active: true });
      expect(result).not.toBe(obj);
    });

    it('should return an empty object for an empty input', () => {
      expect(hydrator.extract({})).toEqual({});
    });

    it('should only copy own enumerable properties', () => {
      const parent = { inherited: true };
      const child = Object.create(parent);
      child.own = 'value';

      const result = hydrator.extract(child);
      expect(result).toEqual({ own: 'value' });
      expect(result.inherited).toBeUndefined();
    });
  });
});
