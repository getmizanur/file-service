const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const AbstractEntity = require(path.join(projectRoot, 'library/core/common/abstract-entity'));

// Test subclass with static schema
class TestEntity extends AbstractEntity {
  static schema = { id: null, name: null, email: null, status: 'active', profile: null };
}

// Subclass without static schema (for constructor enforcement test)
class BadEntity extends AbstractEntity {}

describe('AbstractEntity', () => {

  // ==================== Constructor ====================

  describe('constructor', () => {
    it('should initialize storage from static schema with default values', () => {
      const entity = new TestEntity();
      const storage = entity.getStorage();
      expect(storage).toEqual({ id: null, name: null, email: null, status: 'active', profile: null });
    });

    it('should initialize inputFilter as null', () => {
      const entity = new TestEntity();
      expect(entity.getInputFilter()).toBeNull();
    });

    it('should create independent storage copies for each instance', () => {
      const e1 = new TestEntity();
      const e2 = new TestEntity();
      e1.set('name', 'Alice');
      expect(e2.get('name')).toBeNull();
    });

    it('should throw TypeError when subclass has no static schema', () => {
      expect(() => new BadEntity()).toThrow(TypeError);
      expect(() => new BadEntity()).toThrow('BadEntity must define a static schema object');
    });

    it('should throw TypeError when schema is not an object', () => {
      class StringSchemaEntity extends AbstractEntity {}
      StringSchemaEntity.schema = 'not-an-object';
      expect(() => new StringSchemaEntity()).toThrow(TypeError);
    });

    it('should throw TypeError when schema is null', () => {
      class NullSchemaEntity extends AbstractEntity {}
      NullSchemaEntity.schema = null;
      expect(() => new NullSchemaEntity()).toThrow(TypeError);
    });
  });

  // ==================== Static Methods ====================

  describe('static methods', () => {
    describe('columns()', () => {
      it('should return keys from static schema', () => {
        expect(TestEntity.columns()).toEqual(['id', 'name', 'email', 'status', 'profile']);
      });

      it('should fallback to instantiation when no static schema', () => {
        // Create a class that bypasses the constructor schema check
        // but has no static schema on the calling context
        class FallbackEntity extends AbstractEntity {
          static schema = { a: null, b: null };
        }
        // Call columns on a wrapper that temporarily hides schema
        const original = FallbackEntity.schema;
        // Test the fallback path by calling columns via a class without schema
        // We need to simulate a class where `this.schema` is falsy in the static method
        // but the constructor still works (has schema)
        const ColumnsTest = function() {};
        ColumnsTest.prototype = Object.create(FallbackEntity.prototype);
        ColumnsTest.columns = AbstractEntity.columns;
        // No static schema on ColumnsTest, so it will try `new this()` which fails
        // because the constructor requires schema. Let's test the `return []` path.
        // Create a function class that when instantiated has no getStorage
        const PlainClass = function() {};
        PlainClass.columns = AbstractEntity.columns;
        expect(PlainClass.columns()).toEqual([]);
      });

      it('should use getStorage when instance has it but no static schema', () => {
        const StorageClass = function() {
          this.storage = { x: 1, y: 2 };
        };
        StorageClass.prototype.getStorage = function() { return this.storage; };
        StorageClass.columns = AbstractEntity.columns;
        expect(StorageClass.columns()).toEqual(['x', 'y']);
      });
    });

    describe('implementsAbstractEntity()', () => {
      it('should return true', () => {
        expect(AbstractEntity.implementsAbstractEntity()).toBe(true);
      });

      it('should return true on subclass', () => {
        expect(TestEntity.implementsAbstractEntity()).toBe(true);
      });
    });

    describe('getEntityVersion()', () => {
      it('should return "1.0.0"', () => {
        expect(AbstractEntity.getEntityVersion()).toBe('1.0.0');
      });

      it('should return "1.0.0" on subclass', () => {
        expect(TestEntity.getEntityVersion()).toBe('1.0.0');
      });
    });
  });

  // ==================== exchangeObject / fromObject ====================

  describe('exchangeObject()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
    });

    it('should copy matching keys from data into storage', () => {
      entity.exchangeObject({ id: 1, name: 'Alice', email: 'alice@test.com' });
      expect(entity.get('id')).toBe(1);
      expect(entity.get('name')).toBe('Alice');
      expect(entity.get('email')).toBe('alice@test.com');
    });

    it('should ignore keys not present in storage', () => {
      entity.exchangeObject({ id: 1, unknown_field: 'ignored' });
      expect(entity.get('id')).toBe(1);
      expect(entity.has('unknown_field')).toBe(false);
    });

    it('should preserve default values for keys not in data', () => {
      entity.exchangeObject({ id: 1 });
      expect(entity.get('status')).toBe('active');
      expect(entity.get('email')).toBeNull();
    });

    it('should handle null/undefined data gracefully', () => {
      expect(() => entity.exchangeObject(null)).not.toThrow();
      expect(() => entity.exchangeObject(undefined)).not.toThrow();
    });

    it('should handle empty object', () => {
      entity.exchangeObject({});
      expect(entity.get('status')).toBe('active');
    });

    it('should overwrite existing values', () => {
      entity.exchangeObject({ status: 'inactive' });
      expect(entity.get('status')).toBe('inactive');
    });
  });

  describe('fromObject()', () => {
    it('should be an alias for exchangeObject', () => {
      const entity = new TestEntity();
      entity.fromObject({ id: 42, name: 'Bob' });
      expect(entity.get('id')).toBe(42);
      expect(entity.get('name')).toBe('Bob');
    });
  });

  // ==================== toObject / getObjectCopy ====================

  describe('toObject()', () => {
    it('should return a shallow copy of storage', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice' });
      const obj = entity.toObject();
      expect(obj).toEqual({ id: 1, name: 'Alice', email: null, status: 'active', profile: null });
    });

    it('should return a new object (not a reference to storage)', () => {
      const entity = new TestEntity();
      const obj = entity.toObject();
      obj.name = 'Modified';
      expect(entity.get('name')).toBeNull();
    });
  });

  describe('getObjectCopy()', () => {
    it('should be an alias for toObject', () => {
      const entity = new TestEntity();
      entity.set('name', 'Alice');
      expect(entity.getObjectCopy()).toEqual(entity.toObject());
    });
  });

  // ==================== getStorage / setStorage ====================

  describe('getStorage()', () => {
    it('should return a reference to internal storage', () => {
      const entity = new TestEntity();
      const storage = entity.getStorage();
      storage.name = 'Direct';
      expect(entity.get('name')).toBe('Direct');
    });
  });

  describe('setStorage()', () => {
    it('should replace internal storage entirely', () => {
      const entity = new TestEntity();
      entity.setStorage({ x: 1, y: 2 });
      expect(entity.getStorage()).toEqual({ x: 1, y: 2 });
    });

    it('should return this for chaining', () => {
      const entity = new TestEntity();
      const result = entity.setStorage({ a: 1 });
      expect(result).toBe(entity);
    });

    it('should throw TypeError for null', () => {
      const entity = new TestEntity();
      expect(() => entity.setStorage(null)).toThrow(TypeError);
      expect(() => entity.setStorage(null)).toThrow('Storage data must be a non-null object');
    });

    it('should throw TypeError for array', () => {
      const entity = new TestEntity();
      expect(() => entity.setStorage([1, 2])).toThrow(TypeError);
    });

    it('should throw TypeError for string', () => {
      const entity = new TestEntity();
      expect(() => entity.setStorage('bad')).toThrow(TypeError);
    });

    it('should throw TypeError for number', () => {
      const entity = new TestEntity();
      expect(() => entity.setStorage(42)).toThrow(TypeError);
    });

    it('should throw TypeError for undefined', () => {
      const entity = new TestEntity();
      expect(() => entity.setStorage(undefined)).toThrow(TypeError);
    });
  });

  // ==================== get() ====================

  describe('get()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice', profile: { age: 30, address: { city: 'London' } } });
    });

    it('should return value for existing key', () => {
      expect(entity.get('name')).toBe('Alice');
    });

    it('should return null for key with null value', () => {
      expect(entity.get('email')).toBeNull();
    });

    it('should return defaultValue for non-existent key', () => {
      expect(entity.get('nonexistent', 'fallback')).toBe('fallback');
    });

    it('should return undefined when no defaultValue provided for missing key', () => {
      expect(entity.get('nonexistent')).toBeUndefined();
    });

    it('should support dot notation for nested properties', () => {
      expect(entity.get('profile.age')).toBe(30);
      expect(entity.get('profile.address.city')).toBe('London');
    });

    it('should return defaultValue for missing nested path', () => {
      expect(entity.get('profile.nonexistent', 'default')).toBe('default');
    });

    it('should return defaultValue for non-string key', () => {
      expect(entity.get(123, 'default')).toBe('default');
      expect(entity.get(null, 'default')).toBe('default');
      expect(entity.get(undefined, 'default')).toBe('default');
      expect(entity.get(true, 'default')).toBe('default');
      expect(entity.get({}, 'default')).toBe('default');
    });

    it('should return defaultValue for empty string key', () => {
      expect(entity.get('', 'default')).toBe('default');
    });

    it('should return undefined for non-string key when no default given', () => {
      expect(entity.get(123)).toBeUndefined();
    });
  });

  // ==================== set() ====================

  describe('set()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
    });

    it('should set a value and return this for chaining', () => {
      const result = entity.set('name', 'Alice');
      expect(result).toBe(entity);
      expect(entity.get('name')).toBe('Alice');
    });

    it('should support method chaining', () => {
      entity.set('id', 1).set('name', 'Alice').set('email', 'alice@test.com');
      expect(entity.get('id')).toBe(1);
      expect(entity.get('name')).toBe('Alice');
      expect(entity.get('email')).toBe('alice@test.com');
    });

    it('should allow setting keys not in original schema', () => {
      entity.set('extra', 'value');
      expect(entity.get('extra')).toBe('value');
    });

    it('should support dot notation for nested properties', () => {
      entity.set('profile', {});
      entity.set('profile.age', 25);
      expect(entity.get('profile.age')).toBe(25);
    });

    it('should create intermediate objects for dot notation', () => {
      entity.set('profile.address.city', 'Paris');
      expect(entity.get('profile.address.city')).toBe('Paris');
    });

    it('should throw TypeError for non-string key', () => {
      expect(() => entity.set(123, 'value')).toThrow(TypeError);
      expect(() => entity.set(123, 'value')).toThrow('Property key must be a non-empty string');
    });

    it('should throw TypeError for null key', () => {
      expect(() => entity.set(null, 'value')).toThrow(TypeError);
    });

    it('should throw TypeError for undefined key', () => {
      expect(() => entity.set(undefined, 'value')).toThrow(TypeError);
    });

    it('should throw TypeError for boolean key', () => {
      expect(() => entity.set(true, 'value')).toThrow(TypeError);
    });

    it('should throw TypeError for object key', () => {
      expect(() => entity.set({}, 'value')).toThrow(TypeError);
    });

    it('should throw TypeError for empty string key', () => {
      expect(() => entity.set('', 'value')).toThrow(TypeError);
    });

    it('should allow setting value to null', () => {
      entity.set('name', 'Alice');
      entity.set('name', null);
      expect(entity.get('name')).toBeNull();
    });

    it('should allow setting value to undefined', () => {
      entity.set('name', undefined);
      expect(entity.get('name')).toBeUndefined();
    });

    it('should allow setting value to an object', () => {
      entity.set('profile', { age: 30, city: 'NYC' });
      expect(entity.get('profile')).toEqual({ age: 30, city: 'NYC' });
    });

    it('should allow setting value to an array', () => {
      entity.set('profile', [1, 2, 3]);
      expect(entity.get('profile')).toEqual([1, 2, 3]);
    });
  });

  // ==================== has() ====================

  describe('has()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice', profile: { age: 30 } });
    });

    it('should return true for existing key', () => {
      expect(entity.has('id')).toBe(true);
      expect(entity.has('name')).toBe(true);
    });

    it('should return true for key with null value', () => {
      expect(entity.has('email')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(entity.has('nonexistent')).toBe(false);
    });

    it('should support dot notation', () => {
      expect(entity.has('profile.age')).toBe(true);
      expect(entity.has('profile.missing')).toBe(false);
    });

    it('should return false for non-string key', () => {
      expect(entity.has(123)).toBe(false);
      expect(entity.has(null)).toBe(false);
      expect(entity.has(undefined)).toBe(false);
      expect(entity.has(true)).toBe(false);
      expect(entity.has({})).toBe(false);
    });

    it('should return false for empty string key', () => {
      expect(entity.has('')).toBe(false);
    });
  });

  // ==================== unset() ====================

  describe('unset()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice', profile: { age: 30, city: 'London' } });
    });

    it('should remove an existing key and return true', () => {
      expect(entity.unset('name')).toBe(true);
      expect(entity.has('name')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      expect(entity.unset('nonexistent')).toBe(false);
    });

    it('should support dot notation for nested removal', () => {
      expect(entity.unset('profile.age')).toBe(true);
      expect(entity.has('profile.age')).toBe(false);
      expect(entity.has('profile.city')).toBe(true);
    });

    it('should return false for non-string key', () => {
      expect(entity.unset(123)).toBe(false);
      expect(entity.unset(null)).toBe(false);
      expect(entity.unset(undefined)).toBe(false);
      expect(entity.unset(true)).toBe(false);
      expect(entity.unset({})).toBe(false);
    });

    it('should return false for empty string key', () => {
      expect(entity.unset('')).toBe(false);
    });
  });

  // ==================== keys() ====================

  describe('keys()', () => {
    it('should return all top-level keys', () => {
      const entity = new TestEntity();
      expect(entity.keys()).toEqual(['id', 'name', 'email', 'status', 'profile']);
    });

    it('should reflect added keys', () => {
      const entity = new TestEntity();
      entity.set('extra', 'val');
      expect(entity.keys()).toContain('extra');
    });

    it('should reflect removed keys', () => {
      const entity = new TestEntity();
      entity.unset('email');
      expect(entity.keys()).not.toContain('email');
    });
  });

  // ==================== toJSON() ====================

  describe('toJSON()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice' });
    });

    it('should return compact JSON by default', () => {
      const json = entity.toJSON();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('Alice');
      // Compact should not have indentation
      expect(json).not.toContain('\n');
    });

    it('should return pretty JSON when pretty=true', () => {
      const json = entity.toJSON(true);
      expect(json).toContain('\n');
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
    });

    it('should encode all storage keys', () => {
      const json = entity.toJSON();
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toEqual(['id', 'name', 'email', 'status', 'profile']);
    });
  });

  // ==================== fromJSON() ====================

  describe('fromJSON()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
    });

    it('should populate entity from valid JSON', () => {
      entity.fromJSON('{"id":5,"name":"Bob","email":"bob@test.com"}');
      expect(entity.get('id')).toBe(5);
      expect(entity.get('name')).toBe('Bob');
      expect(entity.get('email')).toBe('bob@test.com');
    });

    it('should only set keys that exist in storage (via exchangeObject)', () => {
      entity.fromJSON('{"id":1,"unknown":"ignored"}');
      expect(entity.get('id')).toBe(1);
      expect(entity.has('unknown')).toBe(false);
    });

    it('should throw Error for invalid JSON', () => {
      expect(() => entity.fromJSON('not-json')).toThrow(Error);
      expect(() => entity.fromJSON('not-json')).toThrow('Invalid JSON string provided');
    });

    it('should throw Error for non-string input (decode returns null)', () => {
      expect(() => entity.fromJSON(123)).toThrow('Invalid JSON string provided');
      expect(() => entity.fromJSON(null)).toThrow('Invalid JSON string provided');
      expect(() => entity.fromJSON(undefined)).toThrow('Invalid JSON string provided');
    });
  });

  // ==================== clone() ====================

  describe('clone()', () => {
    it('should create a new instance of the same class', () => {
      const entity = new TestEntity();
      const cloned = entity.clone();
      expect(cloned).toBeInstanceOf(TestEntity);
      expect(cloned).not.toBe(entity);
    });

    it('should deep copy storage data', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice', profile: { age: 30 } });
      const cloned = entity.clone();

      expect(cloned.get('id')).toBe(1);
      expect(cloned.get('name')).toBe('Alice');
      expect(cloned.get('profile')).toEqual({ age: 30 });

      // Verify deep copy: modifying clone should not affect original
      cloned.set('name', 'Bob');
      expect(entity.get('name')).toBe('Alice');

      // Verify nested objects are also independent
      cloned.get('profile').age = 99;
      expect(entity.get('profile').age).toBe(30);
    });

    it('should copy inputFilter reference', () => {
      const entity = new TestEntity();
      const mockFilter = { setData: jest.fn(), isValid: jest.fn() };
      entity.setInputFilter(mockFilter);
      const cloned = entity.clone();
      expect(cloned.getInputFilter()).toBe(mockFilter);
    });

    it('should not copy inputFilter if not set', () => {
      const entity = new TestEntity();
      const cloned = entity.clone();
      expect(cloned.getInputFilter()).toBeNull();
    });
  });

  // ==================== merge() ====================

  describe('merge()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice', profile: { age: 30 } });
    });

    it('should deep merge data into storage', () => {
      entity.merge({ name: 'Bob', email: 'bob@test.com' });
      expect(entity.get('name')).toBe('Bob');
      expect(entity.get('email')).toBe('bob@test.com');
      expect(entity.get('id')).toBe(1); // unchanged
    });

    it('should deep merge nested objects', () => {
      entity.merge({ profile: { city: 'London' } });
      expect(entity.get('profile')).toEqual({ age: 30, city: 'London' });
    });

    it('should return this for chaining', () => {
      const result = entity.merge({ name: 'Bob' });
      expect(result).toBe(entity);
    });

    it('should throw TypeError for null', () => {
      expect(() => entity.merge(null)).toThrow(TypeError);
      expect(() => entity.merge(null)).toThrow('Merge data must be a non-null object');
    });

    it('should throw TypeError for string', () => {
      expect(() => entity.merge('bad')).toThrow(TypeError);
    });

    it('should throw TypeError for number', () => {
      expect(() => entity.merge(42)).toThrow(TypeError);
    });

    it('should throw TypeError for array', () => {
      expect(() => entity.merge([1, 2])).toThrow(TypeError);
    });

    it('should throw TypeError for undefined', () => {
      expect(() => entity.merge(undefined)).toThrow(TypeError);
    });
  });

  // ==================== diff() ====================

  describe('diff()', () => {
    let entity;
    beforeEach(() => {
      entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice', email: 'alice@test.com' });
    });

    it('should return changed properties', () => {
      const changes = entity.diff({ id: 1, name: 'Bob', email: 'alice@test.com' });
      expect(changes).toEqual({ name: 'Bob' });
    });

    it('should return empty object when equal', () => {
      const changes = entity.diff({ id: 1, name: 'Alice', email: 'alice@test.com', status: 'active', profile: null });
      expect(changes).toEqual({});
    });

    it('should detect added properties', () => {
      const changes = entity.diff({ extra: 'new' });
      expect(changes).toEqual({ extra: 'new' });
    });

    it('should throw TypeError for null', () => {
      expect(() => entity.diff(null)).toThrow(TypeError);
      expect(() => entity.diff(null)).toThrow('Diff comparison requires a non-null object');
    });

    it('should throw TypeError for string', () => {
      expect(() => entity.diff('bad')).toThrow(TypeError);
    });

    it('should throw TypeError for number', () => {
      expect(() => entity.diff(42)).toThrow(TypeError);
    });

    it('should throw TypeError for array', () => {
      expect(() => entity.diff([1, 2])).toThrow(TypeError);
    });

    it('should throw TypeError for undefined', () => {
      expect(() => entity.diff(undefined)).toThrow(TypeError);
    });
  });

  // ==================== equals() ====================

  describe('equals()', () => {
    it('should return true for entities with same data', () => {
      const e1 = new TestEntity();
      const e2 = new TestEntity();
      e1.exchangeObject({ id: 1, name: 'Alice' });
      e2.exchangeObject({ id: 1, name: 'Alice' });
      expect(e1.equals(e2)).toBe(true);
    });

    it('should return false for entities with different data', () => {
      const e1 = new TestEntity();
      const e2 = new TestEntity();
      e1.exchangeObject({ id: 1, name: 'Alice' });
      e2.exchangeObject({ id: 1, name: 'Bob' });
      expect(e1.equals(e2)).toBe(false);
    });

    it('should accept plain object for comparison', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice' });
      const plain = { id: 1, name: 'Alice', email: null, status: 'active', profile: null };
      expect(entity.equals(plain)).toBe(true);
    });

    it('should return false for plain object with different values', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice' });
      expect(entity.equals({ id: 2, name: 'Alice' })).toBe(false);
    });

    it('should return false for non-object arguments', () => {
      const entity = new TestEntity();
      expect(entity.equals(null)).toBe(false);
      expect(entity.equals(undefined)).toBe(false);
      expect(entity.equals('string')).toBe(false);
      expect(entity.equals(42)).toBe(false);
      expect(entity.equals(true)).toBe(false);
    });
  });

  // ==================== flatten() ====================

  describe('flatten()', () => {
    it('should flatten nested storage to dot notation', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, profile: { age: 30, address: { city: 'NYC' } } });
      const flat = entity.flatten();
      expect(flat['id']).toBe(1);
      expect(flat['profile.age']).toBe(30);
      expect(flat['profile.address.city']).toBe('NYC');
    });

    it('should handle flat storage (no nesting)', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice' });
      const flat = entity.flatten();
      expect(flat['id']).toBe(1);
      expect(flat['name']).toBe('Alice');
    });

    it('should handle null values', () => {
      const entity = new TestEntity();
      const flat = entity.flatten();
      expect(flat['id']).toBeNull();
      expect(flat['name']).toBeNull();
    });
  });

  // ==================== unflatten() ====================

  describe('unflatten()', () => {
    it('should replace storage with unflattened data', () => {
      const entity = new TestEntity();
      entity.unflatten({ 'id': 1, 'profile.name': 'Alice', 'profile.address.city': 'NYC' });
      expect(entity.get('id')).toBe(1);
      expect(entity.get('profile.name')).toBe('Alice');
      expect(entity.get('profile.address.city')).toBe('NYC');
    });

    it('should return this for chaining', () => {
      const entity = new TestEntity();
      const result = entity.unflatten({ id: 1 });
      expect(result).toBe(entity);
    });

    it('should throw TypeError for null', () => {
      const entity = new TestEntity();
      expect(() => entity.unflatten(null)).toThrow(TypeError);
      expect(() => entity.unflatten(null)).toThrow('Unflatten data must be a non-null object');
    });

    it('should throw TypeError for string', () => {
      const entity = new TestEntity();
      expect(() => entity.unflatten('bad')).toThrow(TypeError);
    });

    it('should throw TypeError for number', () => {
      const entity = new TestEntity();
      expect(() => entity.unflatten(42)).toThrow(TypeError);
    });

    it('should throw TypeError for array', () => {
      const entity = new TestEntity();
      expect(() => entity.unflatten([1, 2])).toThrow(TypeError);
    });

    it('should throw TypeError for undefined', () => {
      const entity = new TestEntity();
      expect(() => entity.unflatten(undefined)).toThrow(TypeError);
    });
  });

  // ==================== setInputFilter / getInputFilter ====================

  describe('setInputFilter() / getInputFilter()', () => {
    it('should set and retrieve input filter', () => {
      const entity = new TestEntity();
      const mockFilter = { setData: jest.fn(), isValid: jest.fn() };
      entity.setInputFilter(mockFilter);
      expect(entity.getInputFilter()).toBe(mockFilter);
    });

    it('should return this for chaining', () => {
      const entity = new TestEntity();
      const result = entity.setInputFilter({});
      expect(result).toBe(entity);
    });

    it('should return null when no filter is set', () => {
      const entity = new TestEntity();
      expect(entity.getInputFilter()).toBeNull();
    });

    it('should allow overwriting the input filter', () => {
      const entity = new TestEntity();
      const filter1 = { id: 1 };
      const filter2 = { id: 2 };
      entity.setInputFilter(filter1);
      entity.setInputFilter(filter2);
      expect(entity.getInputFilter()).toBe(filter2);
    });
  });

  // ==================== isValid() ====================

  describe('isValid()', () => {
    it('should throw Error when no inputFilter is set', () => {
      const entity = new TestEntity();
      expect(() => entity.isValid()).toThrow(Error);
      expect(() => entity.isValid()).toThrow('TestEntity::isValid() requires an InputFilter to be set');
    });

    it('should call setData and isValid on the inputFilter', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice' });

      const mockFilter = {
        setData: jest.fn(),
        isValid: jest.fn().mockReturnValue(true)
      };
      entity.setInputFilter(mockFilter);

      const result = entity.isValid();

      expect(mockFilter.setData).toHaveBeenCalledWith(entity.getStorage());
      expect(mockFilter.isValid).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when inputFilter.isValid() returns false', () => {
      const entity = new TestEntity();
      const mockFilter = {
        setData: jest.fn(),
        isValid: jest.fn().mockReturnValue(false)
      };
      entity.setInputFilter(mockFilter);

      expect(entity.isValid()).toBe(false);
    });
  });

  // ==================== Round-trip / Integration ====================

  describe('round-trip operations', () => {
    it('should survive toJSON -> fromJSON round-trip', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice', email: 'alice@test.com', status: 'active' });
      const json = entity.toJSON();

      const restored = new TestEntity();
      restored.fromJSON(json);
      expect(restored.toObject()).toEqual(entity.toObject());
    });

    it('should survive flatten -> unflatten round-trip', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Alice', profile: { age: 30, city: 'NYC' } });
      const flat = entity.flatten();

      const restored = new TestEntity();
      restored.unflatten(flat);
      expect(restored.get('id')).toBe(1);
      expect(restored.get('name')).toBe('Alice');
      expect(restored.get('profile.age')).toBe(30);
      expect(restored.get('profile.city')).toBe('NYC');
    });

    it('should survive clone -> modify -> verify independence', () => {
      const original = new TestEntity();
      original.exchangeObject({ id: 1, name: 'Alice' });
      const cloned = original.clone();
      cloned.set('id', 2).set('name', 'Bob');

      expect(original.get('id')).toBe(1);
      expect(original.get('name')).toBe('Alice');
      expect(cloned.get('id')).toBe(2);
      expect(cloned.get('name')).toBe('Bob');
    });

    it('should support exchangeObject after setStorage', () => {
      const entity = new TestEntity();
      entity.setStorage({ foo: null, bar: null });
      entity.exchangeObject({ foo: 'hello', bar: 'world', baz: 'ignored' });
      expect(entity.get('foo')).toBe('hello');
      expect(entity.get('bar')).toBe('world');
      expect(entity.has('baz')).toBe(false);
    });
  });
});
