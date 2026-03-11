const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const AbstractEntity = require(global.applicationPath('/library/core/common/abstract-entity'));

// Concrete subclass for testing (AbstractEntity requires a static schema)
class TestEntity extends AbstractEntity {
  static schema = {
    id: null,
    name: null,
    email: null,
    role: 'user',
    profile: null
  };
}

// Entity without static schema to test constructor guard
class BadEntity extends AbstractEntity {}

describe('AbstractEntity', () => {

  describe('constructor', () => {
    it('should initialize storage from static schema', () => {
      const entity = new TestEntity();
      expect(entity.storage).toEqual({
        id: null,
        name: null,
        email: null,
        role: 'user',
        profile: null
      });
    });

    it('should initialize inputFilter to null', () => {
      const entity = new TestEntity();
      expect(entity.inputFilter).toBeNull();
    });

    it('should throw TypeError if subclass has no static schema', () => {
      expect(() => new BadEntity()).toThrow(TypeError);
      expect(() => new BadEntity()).toThrow('BadEntity must define a static schema object');
    });
  });

  describe('static columns()', () => {
    it('should return keys from static schema', () => {
      const cols = TestEntity.columns();
      expect(cols).toEqual(['id', 'name', 'email', 'role', 'profile']);
    });

    it('should fall back to instantiation when schema is falsy (lines 79-82)', () => {
      // Use a getter that returns falsy on first access (columns() check)
      // but valid schema on subsequent accesses (constructor guard)
      let accessCount = 0;
      class FallbackEntity extends AbstractEntity {
        static get schema() {
          accessCount++;
          if (accessCount === 1) return null; // columns() line 73 check → falsy
          return { id: null, name: null };    // constructor line 48 check → truthy
        }
      }
      const cols = FallbackEntity.columns();
      expect(cols).toEqual(expect.arrayContaining(['id', 'name']));
      expect(cols).toHaveLength(2);
    });

    it('should return empty array when instance has no getStorage (line 83)', () => {
      let accessCount = 0;
      class NoStorageEntity extends AbstractEntity {
        static get schema() {
          accessCount++;
          if (accessCount === 1) return null;
          return { x: null };
        }
        // Override getStorage to be falsy so line 80 check fails
        get getStorage() { return null; }
      }
      expect(NoStorageEntity.columns()).toEqual([]);
    });
  });

  describe('exchangeObject()', () => {
    it('should populate storage from data object', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'John', email: 'john@test.com' });
      expect(entity.get('id')).toBe(1);
      expect(entity.get('name')).toBe('John');
      expect(entity.get('email')).toBe('john@test.com');
    });

    it('should only set keys that exist in storage', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, unknown: 'value' });
      expect(entity.get('id')).toBe(1);
      expect(entity.storage.unknown).toBeUndefined();
    });

    it('should do nothing for null/undefined data', () => {
      const entity = new TestEntity();
      entity.exchangeObject(null);
      expect(entity.get('id')).toBeNull();
    });
  });

  describe('fromObject()', () => {
    it('should be an alias for exchangeObject', () => {
      const entity = new TestEntity();
      entity.fromObject({ id: 5, name: 'Jane' });
      expect(entity.get('id')).toBe(5);
      expect(entity.get('name')).toBe('Jane');
    });
  });

  describe('toObject() / getObjectCopy()', () => {
    it('should return a shallow copy of storage', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'Test' });
      const copy = entity.toObject();
      expect(copy).toEqual({ id: 1, name: 'Test', email: null, role: 'user', profile: null });
      // Should be a copy, not same reference
      copy.name = 'Changed';
      expect(entity.get('name')).toBe('Test');
    });

    it('getObjectCopy should delegate to toObject', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 2 });
      expect(entity.getObjectCopy()).toEqual(entity.toObject());
    });
  });

  describe('getStorage() / setStorage()', () => {
    it('should return the internal storage reference', () => {
      const entity = new TestEntity();
      expect(entity.getStorage()).toBe(entity.storage);
    });

    it('should replace storage and return entity for chaining', () => {
      const entity = new TestEntity();
      const newData = { id: 99, name: 'New' };
      const result = entity.setStorage(newData);
      expect(entity.getStorage()).toBe(newData);
      expect(result).toBe(entity);
    });

    it('should throw TypeError for non-object data', () => {
      const entity = new TestEntity();
      expect(() => entity.setStorage(null)).toThrow(TypeError);
      expect(() => entity.setStorage('string')).toThrow(TypeError);
      expect(() => entity.setStorage(42)).toThrow(TypeError);
    });
  });

  describe('get()', () => {
    it('should return property value by key', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'John' });
      expect(entity.get('id')).toBe(1);
      expect(entity.get('name')).toBe('John');
    });

    it('should return defaultValue for missing key', () => {
      const entity = new TestEntity();
      expect(entity.get('nonexistent', 'default')).toBe('default');
    });

    it('should return defaultValue for non-string or empty key', () => {
      const entity = new TestEntity();
      expect(entity.get(null, 'def')).toBe('def');
      expect(entity.get('', 'def')).toBe('def');
      expect(entity.get(123, 'def')).toBe('def');
    });

    it('should support dot notation for nested properties', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ profile: { name: 'John', age: 30 } });
      expect(entity.get('profile.name')).toBe('John');
      expect(entity.get('profile.age')).toBe(30);
    });

    it('should return defaultValue for missing nested property', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ profile: { name: 'John' } });
      expect(entity.get('profile.missing', 'nope')).toBe('nope');
    });
  });

  describe('set()', () => {
    it('should set a property and return entity for chaining', () => {
      const entity = new TestEntity();
      const result = entity.set('name', 'John');
      expect(entity.get('name')).toBe('John');
      expect(result).toBe(entity);
    });

    it('should throw TypeError for non-string or empty key', () => {
      const entity = new TestEntity();
      expect(() => entity.set(null, 'value')).toThrow(TypeError);
      expect(() => entity.set('', 'value')).toThrow(TypeError);
      expect(() => entity.set(123, 'value')).toThrow(TypeError);
    });

    it('should support dot notation for nested properties', () => {
      const entity = new TestEntity();
      entity.set('profile', {});
      entity.set('profile.name', 'John');
      expect(entity.get('profile.name')).toBe('John');
    });
  });

  describe('setInputFilter() / getInputFilter()', () => {
    it('should set and get input filter', () => {
      const entity = new TestEntity();
      const mockFilter = { setData: jest.fn(), isValid: jest.fn() };
      const result = entity.setInputFilter(mockFilter);
      expect(entity.getInputFilter()).toBe(mockFilter);
      expect(result).toBe(entity);
    });
  });

  describe('isValid()', () => {
    it('should throw if no inputFilter is set', () => {
      const entity = new TestEntity();
      expect(() => entity.isValid()).toThrow('TestEntity::isValid() requires an InputFilter to be set');
    });

    it('should call setData and isValid on the inputFilter', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'John' });
      const mockFilter = {
        setData: jest.fn(),
        isValid: jest.fn().mockReturnValue(true)
      };
      entity.setInputFilter(mockFilter);

      const result = entity.isValid();
      expect(mockFilter.setData).toHaveBeenCalledWith(entity.storage);
      expect(mockFilter.isValid).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when inputFilter says invalid', () => {
      const entity = new TestEntity();
      const mockFilter = {
        setData: jest.fn(),
        isValid: jest.fn().mockReturnValue(false)
      };
      entity.setInputFilter(mockFilter);

      expect(entity.isValid()).toBe(false);
    });
  });

  describe('has()', () => {
    it('should return true for existing key', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1 });
      expect(entity.has('id')).toBe(true);
    });

    it('should return true for key with null value', () => {
      const entity = new TestEntity();
      expect(entity.has('name')).toBe(true);
    });

    it('should return false for non-string or empty key', () => {
      const entity = new TestEntity();
      expect(entity.has(null)).toBe(false);
      expect(entity.has('')).toBe(false);
      expect(entity.has(123)).toBe(false);
    });

    it('should support dot notation', () => {
      const entity = new TestEntity();
      entity.set('profile', { name: 'John' });
      expect(entity.has('profile.name')).toBe(true);
      expect(entity.has('profile.missing')).toBe(false);
    });
  });

  describe('unset()', () => {
    it('should remove a property and return true', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'John' });
      expect(entity.unset('name')).toBe(true);
      expect(entity.has('name')).toBe(false);
    });

    it('should return false for non-string or empty key', () => {
      const entity = new TestEntity();
      expect(entity.unset(null)).toBe(false);
      expect(entity.unset('')).toBe(false);
    });

    it('should support dot notation', () => {
      const entity = new TestEntity();
      entity.set('profile', { name: 'John', email: 'j@test.com' });
      expect(entity.unset('profile.email')).toBe(true);
      expect(entity.has('profile.email')).toBe(false);
      expect(entity.has('profile.name')).toBe(true);
    });
  });

  describe('keys()', () => {
    it('should return all storage keys', () => {
      const entity = new TestEntity();
      expect(entity.keys()).toEqual(['id', 'name', 'email', 'role', 'profile']);
    });
  });

  describe('toJSON()', () => {
    it('should return compact JSON string', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'John' });
      const json = entity.toJSON();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('John');
    });

    it('should return pretty JSON when requested', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1 });
      const json = entity.toJSON(true);
      expect(json).toContain('\n');
    });
  });

  describe('fromJSON()', () => {
    it('should populate entity from JSON string', () => {
      const entity = new TestEntity();
      entity.fromJSON('{"id":5,"name":"Jane"}');
      expect(entity.get('id')).toBe(5);
      expect(entity.get('name')).toBe('Jane');
    });

    it('should throw for invalid JSON', () => {
      const entity = new TestEntity();
      expect(() => entity.fromJSON('not json')).toThrow('Invalid JSON string provided');
    });
  });

  describe('clone()', () => {
    it('should create a deep copy of the entity', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'John', profile: { age: 30 } });

      const cloned = entity.clone();
      expect(cloned).toBeInstanceOf(TestEntity);
      expect(cloned.get('id')).toBe(1);
      expect(cloned.get('name')).toBe('John');

      // Verify deep clone
      cloned.set('name', 'Jane');
      expect(entity.get('name')).toBe('John');
    });

    it('should copy inputFilter to cloned entity', () => {
      const entity = new TestEntity();
      const mockFilter = { setData: jest.fn(), isValid: jest.fn() };
      entity.setInputFilter(mockFilter);

      const cloned = entity.clone();
      expect(cloned.getInputFilter()).toBe(mockFilter);
    });

    it('should not copy inputFilter when none is set', () => {
      const entity = new TestEntity();
      const cloned = entity.clone();
      expect(cloned.getInputFilter()).toBeNull();
    });
  });

  describe('merge()', () => {
    it('should deep merge data into entity storage', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, profile: { name: 'John' } });
      const result = entity.merge({ profile: { age: 30 }, email: 'j@test.com' });
      expect(entity.get('profile.name')).toBe('John');
      expect(entity.get('profile.age')).toBe(30);
      expect(entity.get('email')).toBe('j@test.com');
      expect(result).toBe(entity);
    });

    it('should throw TypeError for non-object data', () => {
      const entity = new TestEntity();
      expect(() => entity.merge(null)).toThrow(TypeError);
      expect(() => entity.merge('string')).toThrow(TypeError);
    });
  });

  describe('diff()', () => {
    it('should return changed properties', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'John', email: 'john@test.com' });
      const changes = entity.diff({ id: 1, name: 'Jane', email: 'john@test.com', role: 'user', profile: null });
      expect(changes).toEqual({ name: 'Jane' });
    });

    it('should throw TypeError for non-object', () => {
      const entity = new TestEntity();
      expect(() => entity.diff(null)).toThrow(TypeError);
      expect(() => entity.diff('string')).toThrow(TypeError);
    });
  });

  describe('equals()', () => {
    it('should return true for equal entities', () => {
      const entity1 = new TestEntity();
      entity1.exchangeObject({ id: 1, name: 'John' });
      const entity2 = new TestEntity();
      entity2.exchangeObject({ id: 1, name: 'John' });
      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should return false for different entities', () => {
      const entity1 = new TestEntity();
      entity1.exchangeObject({ id: 1, name: 'John' });
      const entity2 = new TestEntity();
      entity2.exchangeObject({ id: 2, name: 'Jane' });
      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should compare against plain objects', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, name: 'John' });
      expect(entity.equals({ id: 1, name: 'John', email: null, role: 'user', profile: null })).toBe(true);
    });

    it('should return false for non-object argument', () => {
      const entity = new TestEntity();
      expect(entity.equals(null)).toBe(false);
      expect(entity.equals('string')).toBe(false);
      expect(entity.equals(42)).toBe(false);
    });
  });

  describe('flatten()', () => {
    it('should flatten nested storage to dot notation', () => {
      const entity = new TestEntity();
      entity.exchangeObject({ id: 1, profile: { name: 'John', age: 30 } });
      const flat = entity.flatten();
      expect(flat['profile.name']).toBe('John');
      expect(flat['profile.age']).toBe(30);
      expect(flat.id).toBe(1);
    });
  });

  describe('unflatten()', () => {
    it('should populate storage from flattened object', () => {
      const entity = new TestEntity();
      const result = entity.unflatten({ id: 1, 'profile.name': 'John', 'profile.age': 30 });
      expect(entity.get('id')).toBe(1);
      expect(entity.get('profile.name')).toBe('John');
      expect(result).toBe(entity);
    });

    it('should throw TypeError for non-object', () => {
      const entity = new TestEntity();
      expect(() => entity.unflatten(null)).toThrow(TypeError);
      expect(() => entity.unflatten('string')).toThrow(TypeError);
    });
  });

  describe('static methods', () => {
    it('implementsAbstractEntity() should return true', () => {
      expect(TestEntity.implementsAbstractEntity()).toBe(true);
    });

    it('getEntityVersion() should return version string', () => {
      expect(TestEntity.getEntityVersion()).toBe('1.0.0');
    });
  });
});
