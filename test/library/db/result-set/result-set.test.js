const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const ResultSet = require(path.join(projectRoot, 'library/db/result-set/result-set'));

describe('ResultSet', () => {
  let resultSet;

  beforeEach(() => {
    resultSet = new ResultSet();
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should initialise with empty rows and null prototype', () => {
      expect(resultSet._rows).toEqual([]);
      expect(resultSet._prototype).toBeNull();
    });

    it('should accept arrayObjectPrototype via options', () => {
      const proto = { type: 'Post' };
      const rs = new ResultSet({ arrayObjectPrototype: proto });
      expect(rs._prototype).toBe(proto);
    });
  });

  // --- setArrayObjectPrototype ---
  describe('setArrayObjectPrototype', () => {
    it('should set the prototype and return this for chaining', () => {
      const proto = { type: 'User' };
      const result = resultSet.setArrayObjectPrototype(proto);
      expect(result).toBe(resultSet);
      expect(resultSet._prototype).toBe(proto);
    });
  });

  // --- initialize ---
  describe('initialize', () => {
    it('should store rows from an array', () => {
      const rows = [{ id: 1 }, { id: 2 }];
      resultSet.initialize(rows);
      expect(resultSet._rows).toEqual(rows);
    });

    it('should default to empty array for non-array input', () => {
      resultSet.initialize('not-an-array');
      expect(resultSet._rows).toEqual([]);

      resultSet.initialize(null);
      expect(resultSet._rows).toEqual([]);
    });

    it('should return this for chaining', () => {
      expect(resultSet.initialize([])).toBe(resultSet);
    });
  });

  // --- toArray (plain rows) ---
  describe('toArray (no prototype)', () => {
    it('should return the raw rows', () => {
      const rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      resultSet.initialize(rows);
      expect(resultSet.toArray()).toEqual(rows);
    });

    it('should return empty array when no rows', () => {
      expect(resultSet.toArray()).toEqual([]);
    });
  });

  // --- toArray (with prototype) ---
  describe('toArray (with prototype)', () => {
    it('should return hydrated objects based on prototype', () => {
      class UserEntity {
        constructor() {
          this.id = null;
          this.name = null;
        }
        getDisplayName() {
          return `User #${this.id}: ${this.name}`;
        }
      }

      const proto = new UserEntity();
      resultSet.setArrayObjectPrototype(proto);
      resultSet.initialize([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const arr = resultSet.toArray();

      expect(arr).toHaveLength(2);
      expect(arr[0].id).toBe(1);
      expect(arr[0].name).toBe('Alice');
      expect(arr[0].getDisplayName()).toBe('User #1: Alice');
      expect(arr[1].id).toBe(2);
      expect(arr[1].name).toBe('Bob');

      // Each object should be a distinct clone, not the original prototype
      expect(arr[0]).not.toBe(proto);
      expect(arr[1]).not.toBe(proto);
      expect(arr[0]).not.toBe(arr[1]);
    });

    it('should preserve prototype chain on cloned objects', () => {
      class Entity {
        greet() { return 'hello'; }
      }

      const proto = new Entity();
      resultSet.setArrayObjectPrototype(proto);
      resultSet.initialize([{ id: 1 }]);

      const arr = resultSet.toArray();
      expect(arr[0]).toBeInstanceOf(Entity);
      expect(arr[0].greet()).toBe('hello');
    });
  });

  // --- current ---
  describe('current', () => {
    it('should return the first item', () => {
      resultSet.initialize([{ id: 10 }, { id: 20 }]);
      expect(resultSet.current()).toEqual({ id: 10 });
    });

    it('should return null when no rows', () => {
      expect(resultSet.current()).toBeNull();
    });

    it('should return hydrated first item when prototype is set', () => {
      class Item {
        constructor() { this.id = null; }
        getId() { return this.id; }
      }

      resultSet.setArrayObjectPrototype(new Item());
      resultSet.initialize([{ id: 42 }]);

      const item = resultSet.current();
      expect(item.id).toBe(42);
      expect(item).toBeInstanceOf(Item);
    });
  });

  // --- count ---
  describe('count', () => {
    it('should return the number of rows', () => {
      resultSet.initialize([{ id: 1 }, { id: 2 }, { id: 3 }]);
      expect(resultSet.count()).toBe(3);
    });

    it('should return 0 when no rows', () => {
      expect(resultSet.count()).toBe(0);
    });
  });

  // --- _clonePrototype ---
  describe('_clonePrototype', () => {
    it('should create a distinct copy preserving the prototype chain', () => {
      class MyEntity {
        constructor() { this.value = 'original'; }
        getValue() { return this.value; }
      }

      const proto = new MyEntity();
      resultSet.setArrayObjectPrototype(proto);

      const clone = resultSet._clonePrototype();
      expect(clone).not.toBe(proto);
      expect(clone.value).toBe('original');
      expect(clone.getValue()).toBe('original');
      expect(clone).toBeInstanceOf(MyEntity);

      // Mutating clone should not affect prototype
      clone.value = 'changed';
      expect(proto.value).toBe('original');
    });
  });
});
