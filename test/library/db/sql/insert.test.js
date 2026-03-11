const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Insert = require(applicationPath('library/db/sql/insert'));

describe('Insert Query Builder', () => {
  let pgAdapter;
  let mysqlAdapter;

  beforeEach(() => {
    // PostgreSQL-style adapter
    pgAdapter = {
      query: jest.fn(),
      constructor: { name: 'PostgreSQLAdapter' }
    };

    // MySQL-style adapter
    mysqlAdapter = {
      query: jest.fn(),
      constructor: { name: 'MySQLAdapter' }
    };
  });

  describe('constructor', () => {
    test('initializes with empty query state', () => {
      const insert = new Insert(pgAdapter);
      expect(insert.query.table).toBeNull();
      expect(insert.query.columns).toEqual([]);
      expect(insert.query.values).toEqual([]);
      expect(insert.query.onConflict).toBeNull();
      expect(insert.query.returning).toEqual([]);
      expect(insert.parameters).toEqual([]);
    });
  });

  describe('into()', () => {
    test('sets table name', () => {
      const insert = new Insert(pgAdapter);
      const result = insert.into('users');
      expect(insert.query.table).toBe('users');
      expect(result).toBe(insert); // fluent
    });
  });

  describe('columns()', () => {
    test('sets columns from array', () => {
      const insert = new Insert(pgAdapter);
      insert.columns(['name', 'email']);
      expect(insert.query.columns).toEqual(['name', 'email']);
    });

    test('wraps single string in array', () => {
      const insert = new Insert(pgAdapter);
      insert.columns('name');
      expect(insert.query.columns).toEqual(['name']);
    });
  });

  describe('values()', () => {
    test('accepts object and auto-extracts columns', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users').values({ name: 'Alice', email: 'alice@test.com' });
      expect(insert.query.columns).toEqual(['name', 'email']);
      expect(insert.query.values).toEqual([['Alice', 'alice@test.com']]);
    });

    test('does not overwrite existing columns with object', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users').columns(['name', 'email']).values({ name: 'Alice', email: 'a@t.com' });
      expect(insert.query.columns).toEqual(['name', 'email']);
    });

    test('accepts array of values', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users').columns(['name', 'email']).values(['Alice', 'alice@test.com']);
      expect(insert.query.values).toEqual([['Alice', 'alice@test.com']]);
    });

    test('accumulates multiple value rows', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users')
        .values({ name: 'Alice', email: 'a@t.com' })
        .values({ name: 'Bob', email: 'b@t.com' });
      expect(insert.query.values.length).toBe(2);
    });
  });

  describe('batchValues()', () => {
    test('adds multiple rows from array', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users')
        .columns(['name', 'email'])
        .batchValues([
          ['Alice', 'a@t.com'],
          ['Bob', 'b@t.com']
        ]);
      expect(insert.query.values.length).toBe(2);
    });

    test('throws for non-array', () => {
      const insert = new Insert(pgAdapter);
      expect(() => insert.batchValues('invalid')).toThrow(TypeError);
    });
  });

  describe('set()', () => {
    test('sets columns and values from object', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users').set({ name: 'Alice', email: 'a@t.com' });
      expect(insert.query.columns).toEqual(['name', 'email']);
      expect(insert.query.values).toEqual([['Alice', 'a@t.com']]);
    });

    test('throws for non-object', () => {
      const insert = new Insert(pgAdapter);
      expect(() => insert.set('invalid')).toThrow(TypeError);
    });

    test('throws for null', () => {
      const insert = new Insert(pgAdapter);
      expect(() => insert.set(null)).toThrow(TypeError);
    });
  });

  describe('returning()', () => {
    test('adds string column', () => {
      const insert = new Insert(pgAdapter);
      insert.returning('id');
      expect(insert.query.returning).toEqual(['id']);
    });

    test('adds array of columns', () => {
      const insert = new Insert(pgAdapter);
      insert.returning(['id', 'created_at']);
      expect(insert.query.returning).toEqual(['id', 'created_at']);
    });

    test('accumulates returning columns', () => {
      const insert = new Insert(pgAdapter);
      insert.returning('id').returning('name');
      expect(insert.query.returning).toEqual(['id', 'name']);
    });
  });

  describe('onConflict()', () => {
    test('sets IGNORE action', () => {
      const insert = new Insert(pgAdapter);
      insert.onConflict('IGNORE');
      expect(insert.query.onConflict.action).toBe('IGNORE');
    });

    test('sets UPDATE action with updateData', () => {
      const insert = new Insert(pgAdapter);
      insert.onConflict('UPDATE', { name: 'new_name' });
      expect(insert.query.onConflict.action).toBe('UPDATE');
      expect(insert.query.onConflict.updateData).toEqual({ name: 'new_name' });
    });

    test('sets target columns', () => {
      const insert = new Insert(pgAdapter);
      insert.onConflict('IGNORE', null, ['tenant_id', 'user_id']);
      expect(insert.query.onConflict.target).toEqual(['tenant_id', 'user_id']);
    });

    test('accepts options object', () => {
      const insert = new Insert(pgAdapter);
      insert.onConflict({
        action: 'UPDATE',
        updateData: { name: 'x' },
        target: ['id'],
        constraint: 'uq_users'
      });
      expect(insert.query.onConflict.action).toBe('UPDATE');
      expect(insert.query.onConflict.constraint).toBe('uq_users');
    });
  });

  describe('Insert.raw()', () => {
    test('returns raw SQL marker object', () => {
      const result = Insert.raw('"count" + 1');
      expect(result).toEqual({ __raw: '"count" + 1' });
    });

    test('throws for non-string', () => {
      expect(() => Insert.raw(123)).toThrow(TypeError);
    });

    test('throws for empty string', () => {
      expect(() => Insert.raw('')).toThrow(TypeError);
    });

    test('throws for whitespace-only string', () => {
      expect(() => Insert.raw('   ')).toThrow(TypeError);
    });
  });

  describe('toString() - PostgreSQL', () => {
    test('throws when table is not set', () => {
      const insert = new Insert(pgAdapter);
      insert.columns(['name']).values(['Alice']);
      expect(() => insert.toString()).toThrow('Table name is required');
    });

    test('throws when columns/values are empty', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users');
      expect(() => insert.toString()).toThrow('Columns and values are required');
    });

    test('produces basic INSERT with PostgreSQL placeholders', () => {
      const insert = new Insert(pgAdapter);
      const sql = insert.into('users').values({ name: 'Alice', email: 'a@t.com' }).toString();
      expect(sql).toBe('INSERT INTO "users" ("name", "email") VALUES ($1, $2)');
      expect(insert.parameters).toEqual(['Alice', 'a@t.com']);
    });

    test('produces INSERT with multiple value rows', () => {
      const insert = new Insert(pgAdapter);
      const sql = insert.into('users')
        .values({ name: 'Alice', email: 'a@t.com' })
        .values({ name: 'Bob', email: 'b@t.com' })
        .toString();
      expect(sql).toBe('INSERT INTO "users" ("name", "email") VALUES ($1, $2), ($3, $4)');
      expect(insert.parameters).toEqual(['Alice', 'a@t.com', 'Bob', 'b@t.com']);
    });

    test('produces INSERT with RETURNING', () => {
      const insert = new Insert(pgAdapter);
      const sql = insert.into('users')
        .values({ name: 'Alice' })
        .returning('id')
        .toString();
      expect(sql).toContain('RETURNING "id"');
    });

    test('produces INSERT with ON CONFLICT DO NOTHING', () => {
      const insert = new Insert(pgAdapter);
      const sql = insert.into('users')
        .values({ name: 'Alice' })
        .onConflict('IGNORE')
        .toString();
      expect(sql).toContain('ON CONFLICT DO NOTHING');
    });

    test('produces INSERT with ON CONFLICT target DO NOTHING', () => {
      const insert = new Insert(pgAdapter);
      const sql = insert.into('users')
        .values({ name: 'Alice' })
        .onConflict('IGNORE', null, ['email'])
        .toString();
      expect(sql).toContain('ON CONFLICT ("email") DO NOTHING');
    });

    test('produces INSERT with ON CONFLICT DO UPDATE SET', () => {
      const insert = new Insert(pgAdapter);
      const sql = insert.into('users')
        .values({ name: 'Alice', email: 'a@t.com' })
        .onConflict('UPDATE', { name: 'updated' }, ['email'])
        .toString();
      expect(sql).toContain('ON CONFLICT ("email") DO UPDATE SET "name" = $3');
      expect(insert.parameters).toContain('updated');
    });

    test('produces INSERT with ON CONFLICT using raw value', () => {
      const insert = new Insert(pgAdapter);
      const sql = insert.into('stats')
        .values({ key: 'visits', count: 1 })
        .onConflict('UPDATE', { count: Insert.raw('"stats"."count" + EXCLUDED."count"') }, ['key'])
        .toString();
      expect(sql).toContain('DO UPDATE SET "count" = "stats"."count" + EXCLUDED."count"');
    });

    test('produces INSERT with ON CONFLICT ON CONSTRAINT', () => {
      const insert = new Insert(pgAdapter);
      const sql = insert.into('users')
        .values({ name: 'Alice' })
        .onConflict({ action: 'IGNORE', constraint: 'uq_name' })
        .toString();
      expect(sql).toContain('ON CONFLICT ON CONSTRAINT "uq_name" DO NOTHING');
    });
  });

  describe('toString() - MySQL', () => {
    test('produces INSERT with MySQL-style quoting and placeholders', () => {
      const insert = new Insert(mysqlAdapter);
      const sql = insert.into('users').values({ name: 'Alice' }).toString();
      expect(sql).toBe('INSERT INTO `users` (`name`) VALUES (?)');
    });

    test('produces INSERT IGNORE for MySQL', () => {
      const insert = new Insert(mysqlAdapter);
      const sql = insert.into('users')
        .values({ name: 'Alice' })
        .onConflict('IGNORE')
        .toString();
      expect(sql).toContain('INSERT IGNORE INTO');
    });

    test('produces ON DUPLICATE KEY UPDATE for MySQL', () => {
      const insert = new Insert(mysqlAdapter);
      const sql = insert.into('users')
        .values({ name: 'Alice', email: 'a@t.com' })
        .onConflict('UPDATE', { name: 'updated' })
        .toString();
      expect(sql).toContain('ON DUPLICATE KEY UPDATE `name` = ?');
    });
  });

  describe('execute()', () => {
    test('calls adapter.query and returns result', async () => {
      pgAdapter.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const insert = new Insert(pgAdapter);
      const result = await insert.into('users').values({ name: 'Alice' }).returning('id').execute();
      expect(pgAdapter.query).toHaveBeenCalled();
      expect(result.insertedId).toBe(1);
      expect(result.insertedRecord).toEqual({ id: 1 });
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });

    test('handles adapter returning legacy array', async () => {
      pgAdapter.query.mockResolvedValue([{ id: 5 }]);
      const insert = new Insert(pgAdapter);
      const result = await insert.into('users').values({ name: 'Bob' }).execute();
      expect(result.insertedRecord).toEqual({ id: 5 });
      expect(result.affectedRows).toBe(1);
    });

    test('handles empty result', async () => {
      pgAdapter.query.mockResolvedValue(null);
      const insert = new Insert(pgAdapter);
      const result = await insert.into('users').values({ name: 'X' }).execute();
      expect(result.insertedRecord).toBeNull();
      expect(result.affectedRows).toBe(0);
      expect(result.success).toBe(false);
    });
  });

  describe('reset()', () => {
    test('resets to initial state', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users').values({ name: 'Alice' }).returning('id');
      insert.reset();
      expect(insert.query.table).toBeNull();
      expect(insert.query.columns).toEqual([]);
      expect(insert.query.values).toEqual([]);
      expect(insert.query.returning).toEqual([]);
      expect(insert.parameters).toEqual([]);
    });
  });

  describe('clone()', () => {
    test('creates independent copy', () => {
      const insert = new Insert(pgAdapter);
      insert.into('users').values({ name: 'Alice' });
      const cloned = insert.clone();

      cloned.into('posts');
      expect(insert.query.table).toBe('users');
      expect(cloned.query.table).toBe('posts');
    });
  });
});
