const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const UnionSelect = require(path.join(projectRoot, 'library/db/sql/union-select'));
const Select = require(path.join(projectRoot, 'library/db/sql/select'));

describe('UnionSelect', () => {

  function makeSelect(table, cols, whereCond, whereVal) {
    const s = new Select().from(table, cols);
    if (whereCond !== undefined) {
      s.where(whereCond, whereVal);
    }
    return s;
  }

  describe('constructor', () => {
    it('should create instance with defaults', () => {
      const u = new UnionSelect();
      expect(u.db).toBeNull();
      expect(u.defaultAll).toBe(true);
      expect(u._base).toBeNull();
    });

    it('should accept dbAdapter and options', () => {
      const db = { query: jest.fn() };
      const u = new UnionSelect(db, { all: false });
      expect(u.db).toBe(db);
      expect(u.defaultAll).toBe(false);
    });

    it('should treat options.all = undefined as true', () => {
      const u = new UnionSelect(null, {});
      expect(u.defaultAll).toBe(true);
    });
  });

  describe('add', () => {
    it('should set first Select as base (cloned)', () => {
      const s1 = makeSelect('t1', ['id']);
      const u = new UnionSelect();
      u.add(s1);
      expect(u._base).not.toBeNull();
      expect(u._base).not.toBe(s1); // cloned
    });

    it('should throw TypeError when first element is raw SQL string', () => {
      const u = new UnionSelect();
      expect(() => u.add('SELECT 1')).toThrow(TypeError);
      expect(() => u.add('SELECT 1')).toThrow('first element must be a Select instance');
    });

    it('should throw TypeError for non-Select non-string first element', () => {
      const u = new UnionSelect();
      expect(() => u.add(123)).toThrow(TypeError);
    });

    it('should union subsequent Selects using unionAll by default', () => {
      const s1 = makeSelect('t1', ['id']);
      const s2 = makeSelect('t2', ['id']);
      const u = new UnionSelect();
      u.add(s1).add(s2);
      const sql = u.toString();
      expect(sql).toContain('UNION ALL');
    });

    it('should use UNION (not ALL) when defaultAll is false', () => {
      const s1 = makeSelect('t1', ['id']);
      const s2 = makeSelect('t2', ['id']);
      const u = new UnionSelect(null, { all: false });
      u.add(s1).add(s2);
      const sql = u.toString();
      expect(sql).toContain('UNION');
      expect(sql).not.toContain('UNION ALL');
    });

    it('should allow overriding union type per-add', () => {
      const s1 = makeSelect('t1', ['id']);
      const s2 = makeSelect('t2', ['id']);
      const u = new UnionSelect(null, { all: true });
      u.add(s1).add(s2, { all: false });
      const sql = u.toString();
      // Should use UNION (not ALL) for second add
      expect(sql).toContain(' UNION ');
      expect(sql).not.toContain('UNION ALL');
    });

    it('should accept raw SQL string as subsequent element', () => {
      const s1 = makeSelect('t1', ['id']);
      const u = new UnionSelect();
      u.add(s1).add('SELECT id FROM t2');
      const sql = u.toString();
      expect(sql).toContain('SELECT id FROM t2');
    });

    it('should return this for chaining', () => {
      const u = new UnionSelect();
      const result = u.add(makeSelect('t1', ['id']));
      expect(result).toBe(u);
    });
  });

  describe('union / unionAll aliases', () => {
    it('union() should add with all: false', () => {
      const s1 = makeSelect('t1', ['id']);
      const s2 = makeSelect('t2', ['id']);
      const u = new UnionSelect();
      u.add(s1).union(s2);
      const sql = u.toString();
      expect(sql).toContain(' UNION ');
      expect(sql).not.toContain('UNION ALL');
    });

    it('unionAll() should add with all: true', () => {
      const s1 = makeSelect('t1', ['id']);
      const s2 = makeSelect('t2', ['id']);
      const u = new UnionSelect(null, { all: false });
      u.add(s1).unionAll(s2);
      const sql = u.toString();
      expect(sql).toContain('UNION ALL');
    });
  });

  describe('order / limit / offset', () => {
    it('should add ORDER BY to the union', () => {
      const s1 = makeSelect('t1', ['id']);
      const s2 = makeSelect('t2', ['id']);
      const u = new UnionSelect();
      u.add(s1).add(s2).order('id DESC');
      expect(u.toString()).toContain('ORDER BY');
      expect(u.toString()).toContain('id DESC');
    });

    it('should add LIMIT to the union', () => {
      const s1 = makeSelect('t1', ['id']);
      const u = new UnionSelect();
      u.add(s1).limit(10);
      expect(u.toString()).toContain('LIMIT 10');
    });

    it('should add OFFSET to the union', () => {
      const s1 = makeSelect('t1', ['id']);
      const u = new UnionSelect();
      u.add(s1).offset(20);
      expect(u.toString()).toContain('OFFSET 20');
    });

    it('should throw if no base select added yet', () => {
      const u = new UnionSelect();
      expect(() => u.order('id')).toThrow('no Select has been added');
      expect(() => u.limit(10)).toThrow('no Select has been added');
      expect(() => u.offset(5)).toThrow('no Select has been added');
    });
  });

  describe('getBaseSelect', () => {
    it('should return the underlying Select', () => {
      const s1 = makeSelect('t1', ['id']);
      const u = new UnionSelect();
      u.add(s1);
      expect(u.getBaseSelect()).toBe(u._base);
    });

    it('should throw if no base', () => {
      const u = new UnionSelect();
      expect(() => u.getBaseSelect()).toThrow('no Select has been added');
    });
  });

  describe('toString / __toString', () => {
    it('should return SQL string', () => {
      const s1 = makeSelect('t1', ['id']);
      const u = new UnionSelect();
      u.add(s1);
      expect(typeof u.toString()).toBe('string');
      expect(u.toString()).toContain('SELECT');
    });

    it('__toString should equal toString', () => {
      const s1 = makeSelect('t1', ['id']);
      const u = new UnionSelect();
      u.add(s1);
      expect(u.__toString()).toBe(u.toString());
    });

    it('should throw if no base', () => {
      const u = new UnionSelect();
      expect(() => u.toString()).toThrow('no Select has been added');
    });
  });

  describe('getParameters', () => {
    it('should return parameters from base select', () => {
      const s1 = makeSelect('t1', ['id'], 'x = ?', 1);
      const u = new UnionSelect();
      u.add(s1);
      expect(u.getParameters()).toContain(1);
    });

    it('should throw if no base', () => {
      const u = new UnionSelect();
      expect(() => u.getParameters()).toThrow('no Select has been added');
    });
  });

  describe('_normalizeResult', () => {
    let u;
    beforeEach(() => {
      u = new UnionSelect();
    });

    it('should return empty result for null', () => {
      expect(u._normalizeResult(null)).toEqual({ rows: [], rowCount: 0, insertedId: null });
    });

    it('should return empty result for undefined', () => {
      expect(u._normalizeResult(undefined)).toEqual({ rows: [], rowCount: 0, insertedId: null });
    });

    it('should normalize array result (legacy)', () => {
      const rows = [{ id: 1 }, { id: 2 }];
      const result = u._normalizeResult(rows);
      expect(result.rows).toBe(rows);
      expect(result.rowCount).toBe(2);
      expect(result.insertedId).toBeNull();
    });

    it('should normalize structured result', () => {
      const result = u._normalizeResult({ rows: [{ id: 1 }], rowCount: 1, insertedId: 5 });
      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBe(5);
    });

    it('should calculate rowCount from rows.length when rowCount not a number', () => {
      const result = u._normalizeResult({ rows: [{ id: 1 }, { id: 2 }] });
      expect(result.rowCount).toBe(2);
    });

    it('should default insertedId to null when missing', () => {
      const result = u._normalizeResult({ rows: [] });
      expect(result.insertedId).toBeNull();
    });

    it('should return empty for unknown shapes', () => {
      expect(u._normalizeResult({ foo: 'bar' })).toEqual({ rows: [], rowCount: 0, insertedId: null });
    });
  });

  describe('execute', () => {
    it('should delegate to base.execute when available', async () => {
      const s1 = makeSelect('t1', ['id']);
      s1.execute = jest.fn().mockResolvedValue([{ id: 1 }]);
      // Use a UnionSelect that won't clone
      const u = new UnionSelect();
      u._base = s1;
      const rows = await u.execute();
      expect(s1.execute).toHaveBeenCalled();
      expect(rows).toEqual([{ id: 1 }]);
    });

    it('should fallback to db.query when base.execute not available', async () => {
      const db = { query: jest.fn().mockResolvedValue([{ id: 1 }]) };
      const u = new UnionSelect(db);
      const s1 = makeSelect('t1', ['id']);
      u.add(s1);
      // Remove execute from base to test fallback
      u._base.execute = undefined;
      const rows = await u.execute();
      expect(db.query).toHaveBeenCalled();
      expect(rows).toEqual([{ id: 1 }]);
    });

    it('should throw if no db adapter and no base.execute', async () => {
      const u = new UnionSelect();
      const s1 = makeSelect('t1', ['id']);
      u.add(s1);
      u._base.execute = undefined;
      await expect(u.execute()).rejects.toThrow('Database adapter not set');
    });

    it('should throw if no base', async () => {
      const u = new UnionSelect();
      await expect(u.execute()).rejects.toThrow('no Select has been added');
    });
  });

  describe('executeRaw', () => {
    it('should delegate to base.executeRaw when available', async () => {
      const expected = { rows: [{ id: 1 }], rowCount: 1, insertedId: null };
      const s1 = makeSelect('t1', ['id']);
      s1.executeRaw = jest.fn().mockResolvedValue(expected);
      const u = new UnionSelect();
      u._base = s1;
      const result = await u.executeRaw();
      expect(s1.executeRaw).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('should fallback to db.query when base.executeRaw not available', async () => {
      const db = { query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 }) };
      const u = new UnionSelect(db);
      const s1 = makeSelect('t1', ['id']);
      u.add(s1);
      u._base.executeRaw = undefined;
      const result = await u.executeRaw();
      expect(db.query).toHaveBeenCalled();
      expect(result.rows).toEqual([{ id: 1 }]);
    });

    it('should throw if no db adapter and no base.executeRaw', async () => {
      const u = new UnionSelect();
      const s1 = makeSelect('t1', ['id']);
      u.add(s1);
      u._base.executeRaw = undefined;
      await expect(u.executeRaw()).rejects.toThrow('Database adapter not set');
    });
  });

  describe('clone', () => {
    it('should create a new UnionSelect with same state', () => {
      const db = { query: jest.fn() };
      const u = new UnionSelect(db, { all: false });
      u.add(makeSelect('t1', ['id']));
      const c = u.clone();
      expect(c).not.toBe(u);
      expect(c.db).toBe(db);
      expect(c.defaultAll).toBe(false);
      expect(c._base).not.toBe(u._base);
      expect(c.toString()).toBe(u.toString());
    });

    it('should clone without base', () => {
      const u = new UnionSelect();
      const c = u.clone();
      expect(c._base).toBeNull();
    });
  });

  describe('_ensureBase', () => {
    it('should throw descriptive error when no base', () => {
      const u = new UnionSelect();
      expect(() => u._ensureBase()).toThrow('no Select has been added yet');
    });
  });
});
