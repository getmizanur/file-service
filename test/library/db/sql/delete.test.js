const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Delete = require(applicationPath('library/db/sql/delete'));

describe('Delete Query Builder', () => {
  let pgAdapter;
  let mysqlAdapter;

  beforeEach(() => {
    pgAdapter = {
      query: jest.fn(),
      constructor: { name: 'PostgreSQLAdapter' }
    };

    mysqlAdapter = {
      query: jest.fn(),
      constructor: { name: 'MySQLAdapter' }
    };
  });

  describe('constructor', () => {
    test('initializes with empty query state', () => {
      const del = new Delete(pgAdapter);
      expect(del.query.table).toBeNull();
      expect(del.query.tableAlias).toBeNull();
      expect(del.query.joins).toEqual([]);
      expect(del.query.using).toEqual([]);
      expect(del.query.conditions).toEqual([]);
      expect(del.query.returning).toEqual([]);
      expect(del.query.limit).toBeNull();
      expect(del.query.orderBy).toEqual([]);
      expect(del.parameters).toEqual([]);
    });
  });

  describe('from()', () => {
    test('sets table from string', () => {
      const del = new Delete(pgAdapter);
      const result = del.from('users');
      expect(del.query.table).toBe('users');
      expect(del.query.tableAlias).toBeNull();
      expect(result).toBe(del); // fluent
    });

    test('sets table from object alias', () => {
      const del = new Delete(pgAdapter);
      del.from({ u: 'users' });
      expect(del.query.table).toBe('users');
      expect(del.query.tableAlias).toBe('u');
    });
  });

  describe('where()', () => {
    test('adds WHERE condition with value', () => {
      const del = new Delete(pgAdapter);
      del.from('users').where('id = ?', 1);
      expect(del.query.conditions).toEqual([
        { type: 'AND', condition: 'id = ?', values: [1] }
      ]);
    });

    test('chains multiple WHERE with AND', () => {
      const del = new Delete(pgAdapter);
      del.from('users')
        .where('id = ?', 1)
        .where('active = ?', false);
      expect(del.query.conditions.length).toBe(2);
    });

    test('adds WHERE without value', () => {
      const del = new Delete(pgAdapter);
      del.from('users').where('deleted_at IS NOT NULL');
      expect(del.query.conditions[0].values).toEqual([]);
    });
  });

  describe('whereOr()', () => {
    test('adds OR condition', () => {
      const del = new Delete(pgAdapter);
      del.from('users')
        .where('role = ?', 'spam')
        .whereOr('role = ?', 'banned');
      expect(del.query.conditions[1].type).toBe('OR');
    });
  });

  describe('whereIn()', () => {
    test('generates IN clause', () => {
      const del = new Delete(pgAdapter);
      del.from('users').whereIn('id', [1, 2, 3]);
      expect(del.query.conditions[0].condition).toBe('"id" IN (?, ?, ?)');
      expect(del.query.conditions[0].values).toEqual([1, 2, 3]);
    });

    test('throws for empty array', () => {
      const del = new Delete(pgAdapter);
      expect(() => del.whereIn('id', [])).toThrow(TypeError);
    });
  });

  describe('whereNotIn()', () => {
    test('generates NOT IN clause', () => {
      const del = new Delete(pgAdapter);
      del.from('users').whereNotIn('id', [10, 20]);
      expect(del.query.conditions[0].condition).toBe('"id" NOT IN (?, ?)');
    });

    test('throws for empty array', () => {
      const del = new Delete(pgAdapter);
      expect(() => del.whereNotIn('id', [])).toThrow(TypeError);
    });
  });

  describe('whereBetween()', () => {
    test('generates BETWEEN clause', () => {
      const del = new Delete(pgAdapter);
      del.from('logs').whereBetween('created_at', '2024-01-01', '2024-12-31');
      expect(del.query.conditions[0].condition).toBe('"created_at" BETWEEN ? AND ?');
      expect(del.query.conditions[0].values).toEqual(['2024-01-01', '2024-12-31']);
    });
  });

  describe('whereNull() / whereNotNull()', () => {
    test('generates IS NULL condition', () => {
      const del = new Delete(pgAdapter);
      del.from('users').whereNull('deleted_at');
      expect(del.query.conditions[0].condition).toBe('"deleted_at" IS NULL');
    });

    test('generates IS NOT NULL condition', () => {
      const del = new Delete(pgAdapter);
      del.from('users').whereNotNull('email');
      expect(del.query.conditions[0].condition).toBe('"email" IS NOT NULL');
    });
  });

  describe('whereExists() / whereNotExists()', () => {
    test('generates EXISTS subquery', () => {
      const del = new Delete(pgAdapter);
      del.from('users').whereExists('SELECT 1 FROM bans WHERE bans.user_id = users.id');
      expect(del.query.conditions[0].condition).toContain('EXISTS');
    });

    test('generates NOT EXISTS subquery', () => {
      const del = new Delete(pgAdapter);
      del.from('users').whereNotExists('SELECT 1 FROM orders WHERE orders.user_id = users.id');
      expect(del.query.conditions[0].condition).toContain('NOT EXISTS');
    });
  });

  describe('join()', () => {
    test('adds INNER JOIN', () => {
      const del = new Delete(pgAdapter);
      del.from('users').join('profiles', 'users.id = profiles.user_id');
      expect(del.query.joins[0]).toEqual({
        type: 'INNER', table: 'profiles', alias: null, condition: 'users.id = profiles.user_id'
      });
    });

    test('adds aliased join', () => {
      const del = new Delete(pgAdapter);
      del.from('users').join({ p: 'profiles' }, 'users.id = p.user_id');
      expect(del.query.joins[0].alias).toBe('p');
      expect(del.query.joins[0].table).toBe('profiles');
    });
  });

  describe('joinLeft() / joinRight()', () => {
    test('adds LEFT JOIN', () => {
      const del = new Delete(pgAdapter);
      del.from('users').joinLeft('profiles', 'users.id = profiles.user_id');
      expect(del.query.joins[0].type).toBe('LEFT');
    });

    test('adds RIGHT JOIN', () => {
      const del = new Delete(pgAdapter);
      del.from('users').joinRight('profiles', 'users.id = profiles.user_id');
      expect(del.query.joins[0].type).toBe('RIGHT');
    });
  });

  describe('using()', () => {
    test('adds USING table with condition', () => {
      const del = new Delete(pgAdapter);
      del.from('users').using('sessions', 'users.id = sessions.user_id');
      expect(del.query.using[0]).toEqual({
        table: 'sessions', alias: null, condition: 'users.id = sessions.user_id'
      });
    });

    test('adds USING with aliased table', () => {
      const del = new Delete(pgAdapter);
      del.from('users').using({ s: 'sessions' }, 's.user_id = users.id');
      expect(del.query.using[0].alias).toBe('s');
      expect(del.query.using[0].table).toBe('sessions');
    });

    test('throws for invalid argument', () => {
      const del = new Delete(pgAdapter);
      expect(() => del.using(123)).toThrow(TypeError);
    });
  });

  describe('orderBy()', () => {
    test('adds order with default ASC', () => {
      const del = new Delete(pgAdapter);
      del.from('users').orderBy('created_at');
      expect(del.query.orderBy).toEqual([{ column: 'created_at', direction: 'ASC' }]);
    });

    test('adds order with DESC', () => {
      const del = new Delete(pgAdapter);
      del.from('users').orderBy('id', 'desc');
      expect(del.query.orderBy[0].direction).toBe('DESC');
    });
  });

  describe('limit()', () => {
    test('sets limit', () => {
      const del = new Delete(pgAdapter);
      del.limit(100);
      expect(del.query.limit).toBe(100);
    });
  });

  describe('returning()', () => {
    test('adds returning string column', () => {
      const del = new Delete(pgAdapter);
      del.returning('id');
      expect(del.query.returning).toEqual(['id']);
    });

    test('adds returning array of columns', () => {
      const del = new Delete(pgAdapter);
      del.returning(['id', 'name']);
      expect(del.query.returning).toEqual(['id', 'name']);
    });
  });

  describe('toString() - PostgreSQL', () => {
    test('throws when table is not set', () => {
      const del = new Delete(pgAdapter);
      expect(() => del.toString()).toThrow('Table name is required');
    });

    test('produces basic DELETE FROM', () => {
      const del = new Delete(pgAdapter);
      const sql = del.from('users').toString();
      expect(sql).toBe('DELETE FROM "users"');
    });

    test('produces DELETE with alias', () => {
      const del = new Delete(pgAdapter);
      const sql = del.from({ u: 'users' }).toString();
      expect(sql).toBe('DELETE FROM "users" AS "u"');
    });

    test('produces DELETE with WHERE clause', () => {
      const del = new Delete(pgAdapter);
      const sql = del.from('users').where('id = ?', 1).toString();
      expect(sql).toBe('DELETE FROM "users" WHERE id = $1');
      expect(del.parameters).toEqual([1]);
    });

    test('produces DELETE with multiple WHERE and OR', () => {
      const del = new Delete(pgAdapter);
      const sql = del.from('users')
        .where('role = ?', 'spam')
        .whereOr('role = ?', 'banned')
        .toString();
      expect(sql).toContain('WHERE role = $1 OR role = $2');
    });

    test('produces DELETE with USING clause from explicit using()', () => {
      const del = new Delete(pgAdapter);
      const sql = del
        .from('users')
        .using('sessions', 'users.id = sessions.user_id')
        .where('sessions.expired = ?', true)
        .toString();
      expect(sql).toContain('USING "sessions"');
      expect(sql).toContain('WHERE users.id = sessions.user_id AND sessions.expired = $1');
    });

    test('produces DELETE with USING from join()', () => {
      const del = new Delete(pgAdapter);
      const sql = del
        .from('users')
        .join('profiles', 'users.id = profiles.user_id')
        .where('profiles.banned = ?', true)
        .toString();
      expect(sql).toContain('USING "profiles"');
      expect(sql).toContain('WHERE users.id = profiles.user_id AND profiles.banned = $1');
    });

    test('produces DELETE with RETURNING', () => {
      const del = new Delete(pgAdapter);
      const sql = del.from('users').where('id = ?', 1).returning('id').toString();
      expect(sql).toContain('RETURNING id');
    });
  });

  describe('toString() - MySQL', () => {
    test('produces DELETE with MySQL-style quoting', () => {
      const del = new Delete(mysqlAdapter);
      const sql = del.from('users').where('id = ?', 1).toString();
      expect(sql).toContain('`users`');
      expect(sql).toContain('WHERE id = ?');
    });

    test('produces DELETE with alias for MySQL', () => {
      const del = new Delete(mysqlAdapter);
      const sql = del.from({ u: 'users' }).where('u.id = ?', 1).toString();
      expect(sql).toContain('`u`');
      expect(sql).toContain('`users`');
    });

    test('produces DELETE with JOIN for MySQL', () => {
      const del = new Delete(mysqlAdapter);
      const sql = del
        .from('users')
        .join('profiles', 'users.id = profiles.user_id')
        .where('profiles.banned = ?', true)
        .toString();
      expect(sql).toContain('INNER JOIN `profiles`');
    });

    test('includes LIMIT for MySQL', () => {
      const del = new Delete(mysqlAdapter);
      const sql = del.from('users')
        .where('active = ?', false)
        .orderBy('id')
        .limit(100)
        .toString();
      expect(sql).toContain('LIMIT 100');
    });
  });

  describe('execute()', () => {
    test('calls adapter.query and returns result', async () => {
      pgAdapter.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const del = new Delete(pgAdapter);
      const result = await del.from('users').where('id = ?', 1).returning('id').execute();
      expect(pgAdapter.query).toHaveBeenCalled();
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
      expect(result.deletedRecords).toEqual([{ id: 1 }]);
    });

    test('handles no rows deleted', async () => {
      pgAdapter.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const del = new Delete(pgAdapter);
      const result = await del.from('users').where('id = ?', 999).execute();
      expect(result.affectedRows).toBe(0);
      expect(result.success).toBe(false);
      expect(result.deletedRecords).toBeNull();
    });

    test('handles legacy array result', async () => {
      pgAdapter.query.mockResolvedValue([{ id: 5 }]);
      const del = new Delete(pgAdapter);
      const result = await del.from('users').where('id = ?', 5).execute();
      expect(result.deletedRecords).toEqual([{ id: 5 }]);
    });

    test('handles null result', async () => {
      pgAdapter.query.mockResolvedValue(null);
      const del = new Delete(pgAdapter);
      const result = await del.from('users').where('id = ?', 1).execute();
      expect(result.affectedRows).toBe(0);
      expect(result.success).toBe(false);
    });
  });

  describe('truncate()', () => {
    test('throws when table is not set', async () => {
      const del = new Delete(pgAdapter);
      await expect(del.truncate()).rejects.toThrow('Table name is required');
    });

    test('calls TRUNCATE TABLE for PostgreSQL', async () => {
      pgAdapter.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const del = new Delete(pgAdapter);
      await del.from('users').truncate();
      expect(pgAdapter.query).toHaveBeenCalledWith('TRUNCATE TABLE "users"');
    });

    test('returns success true', async () => {
      pgAdapter.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const del = new Delete(pgAdapter);
      const result = await del.from('users').truncate();
      expect(result.success).toBe(true);
    });
  });

  describe('reset()', () => {
    test('resets to initial state', () => {
      const del = new Delete(pgAdapter);
      del.from('users').where('id = ?', 1);
      del.reset();
      expect(del.query.table).toBeNull();
      expect(del.query.conditions).toEqual([]);
      expect(del.parameters).toEqual([]);
    });

    test('returns fluent interface', () => {
      const del = new Delete(pgAdapter);
      expect(del.reset()).toBe(del);
    });
  });

  describe('clone()', () => {
    test('creates independent copy', () => {
      const del = new Delete(pgAdapter);
      del.from('users').where('id = ?', 1);
      const cloned = del.clone();

      cloned.from('posts');
      expect(del.query.table).toBe('users');
      expect(cloned.query.table).toBe('posts');
    });
  });
});
