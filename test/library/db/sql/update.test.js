const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Update = require(applicationPath('library/db/sql/update'));

describe('Update Query Builder', () => {
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
      const update = new Update(pgAdapter);
      expect(update.query.table).toBeNull();
      expect(update.query.tableAlias).toBeNull();
      expect(update.query.sets).toEqual([]);
      expect(update.query.joins).toEqual([]);
      expect(update.query.conditions).toEqual([]);
      expect(update.query.returning).toEqual([]);
      expect(update.query.limit).toBeNull();
      expect(update.parameters).toEqual([]);
    });
  });

  describe('table()', () => {
    test('sets table from string', () => {
      const update = new Update(pgAdapter);
      const result = update.table('users');
      expect(update.query.table).toBe('users');
      expect(update.query.tableAlias).toBeNull();
      expect(result).toBe(update); // fluent
    });

    test('sets table from object alias', () => {
      const update = new Update(pgAdapter);
      update.table({ u: 'users' });
      expect(update.query.table).toBe('users');
      expect(update.query.tableAlias).toBe('u');
    });
  });

  describe('set()', () => {
    test('sets single column and value', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('name', 'Alice');
      expect(update.query.sets).toEqual([{ column: 'name', value: 'Alice' }]);
    });

    test('sets multiple columns from object', () => {
      const update = new Update(pgAdapter);
      update.table('users').set({ name: 'Alice', email: 'a@t.com' });
      expect(update.query.sets).toEqual([
        { column: 'name', value: 'Alice' },
        { column: 'email', value: 'a@t.com' }
      ]);
    });

    test('accumulates set clauses', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('name', 'Alice').set('active', true);
      expect(update.query.sets.length).toBe(2);
    });
  });

  describe('setRaw()', () => {
    test('sets raw SQL expression', () => {
      const update = new Update(pgAdapter);
      update.table('users').setRaw('updated_at', 'NOW()');
      expect(update.query.sets).toEqual([
        { column: 'updated_at', value: 'NOW()', isRaw: true }
      ]);
    });
  });

  describe('increment() / decrement()', () => {
    test('increments column by default 1', () => {
      const update = new Update(pgAdapter);
      update.table('posts').increment('view_count');
      expect(update.query.sets[0].isRaw).toBe(true);
      expect(update.query.sets[0].value).toBe('"view_count" + 1');
    });

    test('increments column by custom amount', () => {
      const update = new Update(pgAdapter);
      update.table('posts').increment('view_count', 5);
      expect(update.query.sets[0].value).toBe('"view_count" + 5');
    });

    test('decrements column', () => {
      const update = new Update(pgAdapter);
      update.table('accounts').decrement('balance', 100);
      expect(update.query.sets[0].value).toBe('"balance" - 100');
    });
  });

  describe('where()', () => {
    test('adds WHERE condition with value', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('name', 'X').where('id = ?', 1);
      expect(update.query.conditions).toEqual([
        { type: 'AND', condition: 'id = ?', values: [1] }
      ]);
    });

    test('chains multiple WHERE with AND', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('name', 'X')
        .where('id = ?', 1)
        .where('active = ?', true);
      expect(update.query.conditions.length).toBe(2);
      expect(update.query.conditions[1].type).toBe('AND');
    });
  });

  describe('whereOr()', () => {
    test('adds OR condition', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('active', false)
        .where('role = ?', 'spam')
        .whereOr('role = ?', 'banned');
      expect(update.query.conditions[1].type).toBe('OR');
    });
  });

  describe('whereIn()', () => {
    test('generates IN clause', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('active', false).whereIn('id', [1, 2, 3]);
      const cond = update.query.conditions[0];
      expect(cond.condition).toBe('"id" IN (?, ?, ?)');
      expect(cond.values).toEqual([1, 2, 3]);
    });

    test('throws for empty array', () => {
      const update = new Update(pgAdapter);
      expect(() => update.whereIn('id', [])).toThrow(TypeError);
    });
  });

  describe('whereNotIn()', () => {
    test('generates NOT IN clause', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('active', true).whereNotIn('id', [10, 20]);
      const cond = update.query.conditions[0];
      expect(cond.condition).toBe('"id" NOT IN (?, ?)');
    });

    test('throws for empty array', () => {
      const update = new Update(pgAdapter);
      expect(() => update.whereNotIn('id', [])).toThrow(TypeError);
    });
  });

  describe('join()', () => {
    test('adds INNER JOIN', () => {
      const update = new Update(pgAdapter);
      update.table('users').join('profiles', 'users.id = profiles.user_id');
      expect(update.query.joins[0]).toEqual({
        type: 'INNER', table: 'profiles', alias: null, condition: 'users.id = profiles.user_id'
      });
    });

    test('adds aliased join', () => {
      const update = new Update(pgAdapter);
      update.table('users').join({ p: 'profiles' }, 'users.id = p.user_id');
      expect(update.query.joins[0].alias).toBe('p');
      expect(update.query.joins[0].table).toBe('profiles');
    });
  });

  describe('joinLeft()', () => {
    test('adds LEFT JOIN', () => {
      const update = new Update(pgAdapter);
      update.table('users').joinLeft('profiles', 'users.id = profiles.user_id');
      expect(update.query.joins[0].type).toBe('LEFT');
    });
  });

  describe('returning()', () => {
    test('adds returning column string', () => {
      const update = new Update(pgAdapter);
      update.returning('id');
      expect(update.query.returning).toEqual(['id']);
    });

    test('adds returning column array', () => {
      const update = new Update(pgAdapter);
      update.returning(['id', 'name']);
      expect(update.query.returning).toEqual(['id', 'name']);
    });
  });

  describe('limit()', () => {
    test('sets limit', () => {
      const update = new Update(pgAdapter);
      update.limit(100);
      expect(update.query.limit).toBe(100);
    });
  });

  describe('toString() - PostgreSQL', () => {
    test('throws when table is not set', () => {
      const update = new Update(pgAdapter);
      update.set('name', 'X');
      expect(() => update.toString()).toThrow('Table name is required');
    });

    test('throws when no SET clauses', () => {
      const update = new Update(pgAdapter);
      update.table('users');
      expect(() => update.toString()).toThrow('At least one SET clause is required');
    });

    test('produces basic UPDATE with PostgreSQL placeholders', () => {
      const update = new Update(pgAdapter);
      const sql = update.table('users').set('name', 'Alice').toString();
      expect(sql).toBe('UPDATE "users" SET "name" = $1');
      expect(update.parameters).toEqual(['Alice']);
    });

    test('produces UPDATE with alias', () => {
      const update = new Update(pgAdapter);
      const sql = update.table({ u: 'users' }).set('name', 'Alice').toString();
      expect(sql).toBe('UPDATE "users" AS "u" SET "name" = $1');
    });

    test('produces UPDATE with multiple SET', () => {
      const update = new Update(pgAdapter);
      const sql = update.table('users')
        .set({ name: 'Alice', email: 'a@t.com' })
        .toString();
      expect(sql).toBe('UPDATE "users" SET "name" = $1, "email" = $2');
      expect(update.parameters).toEqual(['Alice', 'a@t.com']);
    });

    test('produces UPDATE with raw SET', () => {
      const update = new Update(pgAdapter);
      const sql = update.table('users')
        .setRaw('updated_at', 'NOW()')
        .toString();
      expect(sql).toBe('UPDATE "users" SET "updated_at" = NOW()');
    });

    test('produces UPDATE with WHERE clause', () => {
      const update = new Update(pgAdapter);
      const sql = update.table('users')
        .set('name', 'Alice')
        .where('id = ?', 1)
        .toString();
      expect(sql).toBe('UPDATE "users" SET "name" = $1 WHERE id = $2');
      expect(update.parameters).toEqual(['Alice', 1]);
    });

    test('produces UPDATE with multiple WHERE and OR', () => {
      const update = new Update(pgAdapter);
      const sql = update.table('users')
        .set('active', false)
        .where('role = ?', 'spam')
        .whereOr('role = ?', 'banned')
        .toString();
      expect(sql).toContain('WHERE role = $2 OR role = $3');
    });

    test('produces UPDATE with RETURNING', () => {
      const update = new Update(pgAdapter);
      const sql = update.table('users')
        .set('name', 'Alice')
        .where('id = ?', 1)
        .returning('id')
        .toString();
      expect(sql).toContain('RETURNING id');
    });

    test('produces UPDATE with JOIN', () => {
      const update = new Update(pgAdapter);
      const sql = update.table('users')
        .join('profiles', 'users.id = profiles.user_id')
        .set('name', 'X')
        .toString();
      expect(sql).toContain('INNER JOIN "profiles" ON users.id = profiles.user_id');
    });

    test('does not include LIMIT for PostgreSQL', () => {
      const update = new Update(pgAdapter);
      const sql = update.table('users').set('active', false).limit(10).toString();
      expect(sql).not.toContain('LIMIT');
    });
  });

  describe('toString() - MySQL', () => {
    test('produces UPDATE with MySQL-style quoting', () => {
      const update = new Update(mysqlAdapter);
      const sql = update.table('users').set('name', 'Alice').toString();
      expect(sql).toBe('UPDATE `users` SET `name` = ?');
    });

    test('includes LIMIT for MySQL', () => {
      const update = new Update(mysqlAdapter);
      const sql = update.table('users').set('active', false).limit(10).toString();
      expect(sql).toContain('LIMIT 10');
    });
  });

  describe('execute()', () => {
    test('calls adapter.query and returns result', async () => {
      pgAdapter.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const update = new Update(pgAdapter);
      const result = await update.table('users').set('name', 'X').where('id = ?', 1).execute();
      expect(pgAdapter.query).toHaveBeenCalled();
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
      expect(result.updatedRecords).toEqual([{ id: 1 }]);
    });

    test('handles no rows updated', async () => {
      pgAdapter.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const update = new Update(pgAdapter);
      const result = await update.table('users').set('name', 'X').where('id = ?', 999).execute();
      expect(result.affectedRows).toBe(0);
      expect(result.success).toBe(false);
      expect(result.updatedRecords).toBeNull();
    });

    test('handles legacy array result', async () => {
      pgAdapter.query.mockResolvedValue([{ id: 1, name: 'X' }]);
      const update = new Update(pgAdapter);
      const result = await update.table('users').set('name', 'X').execute();
      expect(result.updatedRecords).toEqual([{ id: 1, name: 'X' }]);
    });
  });

  describe('reset()', () => {
    test('resets to initial state', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('name', 'X').where('id = ?', 1);
      update.reset();
      expect(update.query.table).toBeNull();
      expect(update.query.sets).toEqual([]);
      expect(update.query.conditions).toEqual([]);
      expect(update.parameters).toEqual([]);
    });

    test('returns fluent interface', () => {
      const update = new Update(pgAdapter);
      expect(update.reset()).toBe(update);
    });
  });

  describe('clone()', () => {
    test('creates independent copy', () => {
      const update = new Update(pgAdapter);
      update.table('users').set('name', 'Alice');
      const cloned = update.clone();

      cloned.table('posts');
      expect(update.query.table).toBe('users');
      expect(cloned.query.table).toBe('posts');
    });
  });
});
