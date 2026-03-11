const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Insert = require(applicationPath('library/db/sql/insert'));
const Update = require(applicationPath('library/db/sql/update'));
const Delete = require(applicationPath('library/db/sql/delete'));

// ── Adapter factories ──────────────────────────────────────────────────────────

function makePgAdapter() {
  return { query: jest.fn(), constructor: { name: 'PostgreSQLAdapter' } };
}

function makeMysqlAdapter() {
  return { query: jest.fn(), constructor: { name: 'MySQLAdapter' } };
}

function makeSqlServerAdapter() {
  return { query: jest.fn(), constructor: { name: 'SqlServerAdapter' } };
}

function makeSqliteAdapter() {
  return { query: jest.fn(), constructor: { name: 'SQLiteAdapter' } };
}

function makeGenericAdapter() {
  return { query: jest.fn(), constructor: { name: 'GenericAdapter' } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSERT — coverage for lines 155, 207-208, 241, 254, 265, 296-297
// ═══════════════════════════════════════════════════════════════════════════════

describe('Insert – additional coverage', () => {

  // ── Line 155: SqlServerAdapter _addParameter returns @paramN ──────────────
  describe('SqlServerAdapter placeholder and OUTPUT', () => {
    test('uses @param placeholders for SqlServer', () => {
      const adapter = makeSqlServerAdapter();
      const insert = new Insert(adapter);
      const sql = insert.into('users').values({ name: 'Alice', email: 'a@t.com' }).toString();
      expect(sql).toContain('@param0');
      expect(sql).toContain('@param1');
      expect(sql).toContain('[users]');
      expect(sql).toContain('[name]');
    });

    // ── Lines 207-208: SqlServer OUTPUT INSERTED clause ─────────────────────
    test('produces OUTPUT INSERTED clause for SqlServer with returning', () => {
      const adapter = makeSqlServerAdapter();
      const insert = new Insert(adapter);
      const sql = insert
        .into('users')
        .values({ name: 'Alice' })
        .returning(['id', 'created_at'])
        .toString();
      expect(sql).toContain('OUTPUT INSERTED.id, INSERTED.created_at');
    });
  });

  // ── Line 241: _applyConflictHandling fallback for unknown adapter ─────────
  describe('conflict handling on unsupported adapter', () => {
    test('returns sql unchanged for generic adapter with onConflict', () => {
      const adapter = makeGenericAdapter();
      const insert = new Insert(adapter);
      const sql = insert
        .into('items')
        .values({ name: 'X' })
        .onConflict('IGNORE')
        .toString();
      // Generic adapter: conflict clause is silently ignored
      expect(sql).toContain('INSERT INTO "items"');
      expect(sql).not.toContain('CONFLICT');
      expect(sql).not.toContain('IGNORE');
    });
  });

  // ── Line 254: _applyPgConflict fallback (unknown action) ─────────────────
  describe('Postgres conflict with unrecognised action', () => {
    test('returns sql unchanged for unknown conflict action on Postgres', () => {
      const adapter = makePgAdapter();
      const insert = new Insert(adapter);
      const sql = insert
        .into('items')
        .values({ name: 'X' })
        .onConflict('REPLACE') // not IGNORE or UPDATE
        .toString();
      expect(sql).toContain('INSERT INTO "items"');
      expect(sql).not.toContain('DO NOTHING');
      expect(sql).not.toContain('DO UPDATE');
    });
  });

  // ── Line 265: _applyMysqlConflict fallback (unknown action) ──────────────
  describe('MySQL conflict with unrecognised action', () => {
    test('returns sql unchanged for unknown conflict action on MySQL', () => {
      const adapter = makeMysqlAdapter();
      const insert = new Insert(adapter);
      const sql = insert
        .into('items')
        .values({ name: 'X' })
        .onConflict('REPLACE') // not IGNORE or UPDATE
        .toString();
      expect(sql).toContain('INSERT INTO `items`');
      expect(sql).not.toContain('IGNORE');
      expect(sql).not.toContain('DUPLICATE');
    });
  });

  // ── Lines 296-297: _normalizeResult with affectedRows instead of rowCount ─
  describe('_normalizeResult with affectedRows', () => {
    test('uses affectedRows when rowCount is absent', async () => {
      const adapter = makePgAdapter();
      adapter.query.mockResolvedValue({ rows: [{ id: 10 }], affectedRows: 3 });
      const insert = new Insert(adapter);
      const result = await insert.into('users').values({ name: 'Bob' }).execute();
      expect(result.affectedRows).toBe(3);
      expect(result.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE — coverage for lines 198, 210, 224, 235-236, 271, 278-279
// ═══════════════════════════════════════════════════════════════════════════════

describe('Update – additional coverage', () => {

  // ── Line 198: SqlServerAdapter _quoteIdentifier returns [name] ────────────
  // ── Line 210: SqlServerAdapter _addParameter returns @paramN ──────────────
  describe('SqlServerAdapter quoting, placeholders, and OUTPUT', () => {
    test('uses bracket quoting and @param placeholders for SqlServer', () => {
      const adapter = makeSqlServerAdapter();
      const update = new Update(adapter);
      const sql = update.table('users').set('name', 'Alice').where('id = ?', 1).toString();
      expect(sql).toContain('[users]');
      expect(sql).toContain('[name]');
      expect(sql).toContain('@param0');
      expect(sql).toContain('@param1');
    });

    // ── Lines 278-279: SqlServer OUTPUT clause ──────────────────────────────
    test('produces OUTPUT INSERTED clause for SqlServer with returning', () => {
      const adapter = makeSqlServerAdapter();
      const update = new Update(adapter);
      const sql = update
        .table('users')
        .set('name', 'Alice')
        .returning(['id', 'name'])
        .toString();
      expect(sql).toContain('OUTPUT INSERTED.id, INSERTED.name');
    });
  });

  // ── Line 224: _normalizeResult with null/non-object ───────────────────────
  describe('_normalizeResult edge cases', () => {
    test('handles null result from adapter', async () => {
      const adapter = makePgAdapter();
      adapter.query.mockResolvedValue(null);
      const update = new Update(adapter);
      const result = await update.table('users').set('name', 'X').execute();
      expect(result.affectedRows).toBe(0);
      expect(result.success).toBe(false);
      expect(result.updatedRecords).toBeNull();
    });

    // ── Lines 235-236: affectedRows branch ──────────────────────────────────
    test('uses affectedRows when rowCount is absent', async () => {
      const adapter = makeMysqlAdapter();
      adapter.query.mockResolvedValue({ rows: [], affectedRows: 5 });
      const update = new Update(adapter);
      const result = await update.table('users').set('active', true).execute();
      expect(result.affectedRows).toBe(5);
      expect(result.success).toBe(true);
    });
  });

  // ── Line 271: JOIN with alias in toString ─────────────────────────────────
  describe('JOIN with alias in toString', () => {
    test('produces aliased JOIN in SQL output', () => {
      const adapter = makePgAdapter();
      const update = new Update(adapter);
      const sql = update
        .table('users')
        .join({ p: 'profiles' }, 'users.id = p.user_id')
        .set('name', 'X')
        .toString();
      expect(sql).toContain('INNER JOIN "profiles" AS "p" ON users.id = p.user_id');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE — coverage for lines 97, 201, 213, 244-245, 342-343, 357, 373, 420
// ═══════════════════════════════════════════════════════════════════════════════

describe('Delete – additional coverage', () => {

  // ── Line 97: whereNotBetween ──────────────────────────────────────────────
  describe('whereNotBetween()', () => {
    test('generates NOT BETWEEN clause', () => {
      const adapter = makePgAdapter();
      const del = new Delete(adapter);
      del.from('logs').whereNotBetween('score', 10, 50);
      expect(del.query.conditions[0].condition).toBe('"score" NOT BETWEEN ? AND ?');
      expect(del.query.conditions[0].values).toEqual([10, 50]);
    });
  });

  // ── Line 201: SqlServerAdapter _quoteIdentifier ───────────────────────────
  // ── Line 213: SqlServerAdapter _addParameter ──────────────────────────────
  // ── Lines 342-343: SqlServer OUTPUT DELETED clause ────────────────────────
  describe('SqlServerAdapter quoting, placeholders, and OUTPUT', () => {
    test('uses bracket quoting and @param placeholders for SqlServer', () => {
      const adapter = makeSqlServerAdapter();
      const del = new Delete(adapter);
      const sql = del.from('users').where('id = ?', 1).toString();
      expect(sql).toContain('[users]');
      expect(sql).toContain('@param0');
    });

    test('produces OUTPUT DELETED clause for SqlServer with returning', () => {
      const adapter = makeSqlServerAdapter();
      const del = new Delete(adapter);
      const sql = del
        .from('users')
        .where('id = ?', 1)
        .returning(['id', 'name'])
        .toString();
      expect(sql).toContain('OUTPUT DELETED.id, DELETED.name');
    });
  });

  // ── Lines 244-245: _normalizeResult with affectedRows ────────────────────
  describe('_normalizeResult with affectedRows', () => {
    test('uses affectedRows when rowCount is absent', async () => {
      const adapter = makeMysqlAdapter();
      adapter.query.mockResolvedValue({ rows: [], affectedRows: 7 });
      const del = new Delete(adapter);
      const result = await del.from('users').where('active = ?', false).execute();
      expect(result.affectedRows).toBe(7);
      expect(result.success).toBe(true);
    });
  });

  // ── Line 357: join alias in _buildGenericJoins ────────────────────────────
  describe('generic delete with aliased JOIN', () => {
    test('produces aliased JOIN in MySQL DELETE', () => {
      const adapter = makeMysqlAdapter();
      const del = new Delete(adapter);
      const sql = del
        .from('users')
        .join({ p: 'profiles' }, 'users.id = p.user_id')
        .where('p.banned = ?', true)
        .toString();
      expect(sql).toContain('INNER JOIN `profiles` AS `p` ON users.id = p.user_id');
    });
  });

  // ── Line 373: OR condition in _buildGenericWhere ──────────────────────────
  describe('generic delete with OR condition', () => {
    test('produces WHERE with OR for MySQL', () => {
      const adapter = makeMysqlAdapter();
      const del = new Delete(adapter);
      const sql = del
        .from('users')
        .where('role = ?', 'spam')
        .whereOr('role = ?', 'banned')
        .toString();
      expect(sql).toContain('WHERE role = ?');
      expect(sql).toContain('OR role = ?');
    });
  });

  // ── Line 420: SQLiteAdapter truncate uses DELETE FROM ─────────────────────
  describe('SQLiteAdapter truncate', () => {
    test('uses DELETE FROM instead of TRUNCATE TABLE for SQLite', async () => {
      const adapter = makeSqliteAdapter();
      adapter.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const del = new Delete(adapter);
      await del.from('users').truncate();
      expect(adapter.query).toHaveBeenCalledWith('DELETE FROM "users"');
    });
  });
});
