const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const HydratingResultSet = require(path.join(projectRoot, 'library/db/result-set/hydrating-result-set'));

function createMockHydrator() {
  return {
    hydrate: jest.fn((row, obj) => {
      Object.assign(obj, row);
      return obj;
    })
  };
}

function createMockPrototype() {
  return { id: null, name: null };
}

describe('HydratingResultSet', () => {

  describe('constructor', () => {
    it('should create instance with hydrator and prototype', () => {
      const hydrator = createMockHydrator();
      const proto = createMockPrototype();
      const rs = new HydratingResultSet(hydrator, proto);
      expect(rs.getHydrator()).toBe(hydrator);
      expect(rs.getObjectPrototype()).toBe(proto);
    });

    it('should throw if hydrator is missing', () => {
      expect(() => new HydratingResultSet(null, {})).toThrow('requires a hydrator');
    });

    it('should throw if prototype is missing', () => {
      expect(() => new HydratingResultSet({}, null)).toThrow('requires an object prototype');
    });

    it('should initialize with empty rows', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      expect(rs.getRows()).toEqual([]);
      expect(rs.count()).toBe(0);
    });
  });

  describe('setHydrator', () => {
    it('should update the hydrator', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      const newHydrator = createMockHydrator();
      rs.setHydrator(newHydrator);
      expect(rs.getHydrator()).toBe(newHydrator);
    });

    it('should throw if null hydrator given', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      expect(() => rs.setHydrator(null)).toThrow('requires a hydrator');
    });

    it('should reset cache when hydrator changes', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([{ id: 1 }]);
      rs.toArray(); // build cache
      rs.setHydrator(createMockHydrator());
      // cache was reset, so toArray re-hydrates
      const result = rs.toArray();
      expect(result).toHaveLength(1);
    });

    it('should return this for chaining', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      expect(rs.setHydrator(createMockHydrator())).toBe(rs);
    });
  });

  describe('setObjectPrototype', () => {
    it('should update the prototype', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      const newProto = { id: null, email: null };
      rs.setObjectPrototype(newProto);
      expect(rs.getObjectPrototype()).toBe(newProto);
    });

    it('should throw if null prototype given', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      expect(() => rs.setObjectPrototype(null)).toThrow('requires an object prototype');
    });

    it('should reset cache when prototype changes', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([{ id: 1 }]);
      rs.toArray();
      rs.setObjectPrototype({ id: null, email: null });
      const result = rs.toArray();
      expect(result).toHaveLength(1);
    });
  });

  describe('initialize', () => {
    it('should store rows', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      const rows = [{ id: 1 }, { id: 2 }];
      rs.initialize(rows);
      expect(rs.getRows()).toBe(rows);
      expect(rs.count()).toBe(2);
    });

    it('should default to empty array for non-array input', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize('not-an-array');
      expect(rs.getRows()).toEqual([]);
    });

    it('should reset cache', () => {
      const hydrator = createMockHydrator();
      const rs = new HydratingResultSet(hydrator, createMockPrototype());
      rs.initialize([{ id: 1 }]);
      rs.toArray();
      rs.initialize([{ id: 2 }, { id: 3 }]);
      const result = rs.toArray();
      expect(result).toHaveLength(2);
    });

    it('should return this for chaining', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      expect(rs.initialize([])).toBe(rs);
    });
  });

  describe('hydrateRow', () => {
    it('should hydrate a single row into a cloned prototype', () => {
      const hydrator = createMockHydrator();
      const rs = new HydratingResultSet(hydrator, createMockPrototype());
      const result = rs.hydrateRow({ id: 42, name: 'Test' });
      expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(42);
      expect(result.name).toBe('Test');
    });

    it('should use clone() on prototype if available', () => {
      const proto = {
        id: null,
        name: null,
        clone: jest.fn(function () { return { ...this }; })
      };
      const hydrator = createMockHydrator();
      const rs = new HydratingResultSet(hydrator, proto);
      rs.hydrateRow({ id: 1 });
      expect(proto.clone).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    let rs;
    beforeEach(() => {
      rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }]);
    });

    it('should return hydrated object at given index', () => {
      const obj = rs.get(1);
      expect(obj.id).toBe(2);
      expect(obj.name).toBe('B');
    });

    it('should return null for null index', () => {
      expect(rs.get(null)).toBeNull();
    });

    it('should return null for undefined index', () => {
      expect(rs.get(undefined)).toBeNull();
    });

    it('should return null for negative index', () => {
      expect(rs.get(-1)).toBeNull();
    });

    it('should return null for out-of-bounds index', () => {
      expect(rs.get(10)).toBeNull();
    });

    it('should return null for non-integer index', () => {
      expect(rs.get(1.5)).toBeNull();
    });

    it('should cache per-index hydration', () => {
      const hydrator = createMockHydrator();
      rs = new HydratingResultSet(hydrator, createMockPrototype());
      rs.initialize([{ id: 1 }]);
      rs.get(0);
      rs.get(0);
      // hydrate called only once for index 0
      expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
    });

    it('should use full cache when toArray already called', () => {
      const hydrator = createMockHydrator();
      rs = new HydratingResultSet(hydrator, createMockPrototype());
      rs.initialize([{ id: 1 }, { id: 2 }]);
      rs.toArray();
      hydrator.hydrate.mockClear();
      rs.get(0);
      expect(hydrator.hydrate).not.toHaveBeenCalled();
    });
  });

  describe('current / first', () => {
    it('should return first hydrated row', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([{ id: 10, name: 'First' }]);
      const obj = rs.current();
      expect(obj.id).toBe(10);
    });

    it('should return null when no rows', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([]);
      expect(rs.current()).toBeNull();
    });

    it('first() should be alias for current()', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([{ id: 5 }]);
      expect(rs.first()).toEqual(rs.current());
    });
  });

  describe('toArray', () => {
    it('should hydrate all rows', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const arr = rs.toArray();
      expect(arr).toHaveLength(3);
      expect(arr[0].id).toBe(1);
      expect(arr[2].id).toBe(3);
    });

    it('should memoize results', () => {
      const hydrator = createMockHydrator();
      const rs = new HydratingResultSet(hydrator, createMockPrototype());
      rs.initialize([{ id: 1 }]);
      const first = rs.toArray();
      const second = rs.toArray();
      expect(first).toBe(second);
      expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
    });

    it('should reuse per-index cache when building full array', () => {
      const hydrator = createMockHydrator();
      const rs = new HydratingResultSet(hydrator, createMockPrototype());
      rs.initialize([{ id: 1 }, { id: 2 }]);
      rs.get(0); // hydrate index 0
      hydrator.hydrate.mockClear();
      rs.toArray();
      // Only index 1 should be hydrated anew
      expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
    });

    it('should return empty array for no rows', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([]);
      expect(rs.toArray()).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return number of raw rows', () => {
      const rs = new HydratingResultSet(createMockHydrator(), createMockPrototype());
      rs.initialize([{ id: 1 }, { id: 2 }]);
      expect(rs.count()).toBe(2);
    });
  });

  describe('_clonePrototype', () => {
    it('should use clone() method if available on prototype', () => {
      const proto = {
        id: null,
        clone: jest.fn(() => ({ id: null, cloned: true }))
      };
      const rs = new HydratingResultSet(createMockHydrator(), proto);
      rs.initialize([{ id: 1 }]);
      const arr = rs.toArray();
      expect(proto.clone).toHaveBeenCalled();
      expect(arr[0].cloned).toBe(true);
    });

    it('should shallow clone via Object.create when no clone() method', () => {
      class Entity {
        constructor() { this.id = null; }
      }
      const proto = new Entity();
      const rs = new HydratingResultSet(createMockHydrator(), proto);
      rs.initialize([{ id: 1 }]);
      const arr = rs.toArray();
      expect(arr[0]).toBeInstanceOf(Entity);
    });
  });
});
