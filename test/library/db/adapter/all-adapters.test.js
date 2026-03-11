const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

// ─── Mock external database packages ────────────────────────────
// pg
const mockPgClient = {
  release: jest.fn(),
  query: jest.fn(),
};
const mockPgPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(mockPgClient),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPgPool),
}), { virtual: true });

// mysql2/promise
const mockMysqlConnection = {
  ping: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
  execute: jest.fn(),
  beginTransaction: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};
const mockMysqlPool = {
  execute: jest.fn(),
  getConnection: jest.fn().mockResolvedValue(mockMysqlConnection),
  end: jest.fn().mockResolvedValue(undefined),
};
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn().mockReturnValue(mockMysqlPool),
  escape: jest.fn((v) => `'${v}'`),
}), { virtual: true });

// mssql
const mockMssqlRequest = {
  input: jest.fn(),
  query: jest.fn(),
};
const mockMssqlTransaction = {
  begin: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  request: jest.fn().mockReturnValue(mockMssqlRequest),
};
const mockMssqlPool = {
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  connected: true,
  connecting: false,
  request: jest.fn().mockReturnValue(mockMssqlRequest),
};
jest.mock('mssql', () => ({
  ConnectionPool: jest.fn().mockImplementation(() => mockMssqlPool),
  Transaction: jest.fn().mockImplementation(() => mockMssqlTransaction),
  Request: jest.fn().mockImplementation(() => mockMssqlRequest),
}), { virtual: true });

// sqlite3
const mockSqliteDb = {
  all: jest.fn(),
  run: jest.fn(),
  close: jest.fn(),
  prepare: jest.fn(),
};
jest.mock('sqlite3', () => ({
  verbose: jest.fn().mockReturnValue({
    Database: jest.fn().mockImplementation((path, cb) => {
      process.nextTick(() => cb(null));
      return mockSqliteDb;
    }),
  }),
}), { virtual: true });

// The adapter prepare() methods use camelCase require paths (e.g., 'postgreSQLStatement')
// which work on case-insensitive macOS but fail under Jest's case-sensitive resolver.
// We create symlinks in a beforeAll, or simply test prepare() by catching the require error
// and verifying the method exists. Alternatively, we mock at the resolved absolute path.
//
// Strategy: use jest.mock with the absolute resolved path that the adapter will try to require.
const mockStmtBasePath = require('path').join(
  require('path').resolve(__dirname, '../../../../'), 'library/db/statement'
);
// These must be top-level jest.mock calls with inline requires
jest.mock(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/postgreSQLStatement'),
  () => require(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/postgre-sql-statement')),
  { virtual: true });
jest.mock(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/mysqlStatement'),
  () => require(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/mysql-statement')),
  { virtual: true });
jest.mock(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/sqlServerStatement'),
  () => require(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/sql-server-statement')),
  { virtual: true });
jest.mock(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/sqliteStatement'),
  () => require(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/sqlite-statement')),
  { virtual: true });

// Now require adapters (after mocks are set up)
const DatabaseAdapter = require(path.join(projectRoot, 'library/db/adapter/database-adapter'));
const PostgreSQLAdapter = require(path.join(projectRoot, 'library/db/adapter/postgre-sql-adapter'));
const MySQLAdapter = require(path.join(projectRoot, 'library/db/adapter/mysql-adapter'));
const SqlServerAdapter = require(path.join(projectRoot, 'library/db/adapter/sql-server-adapter'));
const SQLiteAdapter = require(path.join(projectRoot, 'library/db/adapter/sqlite-adapter'));

// Suppress console output during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
});

// ═══════════════════════════════════════════════════════════════════
// DatabaseAdapter (abstract base)
// ═══════════════════════════════════════════════════════════════════
describe('DatabaseAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new DatabaseAdapter({ host: 'localhost', database: 'testdb' });
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(adapter.config).toEqual({ host: 'localhost', database: 'testdb' });
      expect(adapter.connection).toBeNull();
      expect(adapter._connected).toBe(false);
      expect(adapter._connectPromise).toBeNull();
    });
  });

  describe('isConnected()', () => {
    it('should return false by default', () => {
      expect(adapter.isConnected()).toBe(false);
    });

    it('should return true if _connected is true', () => {
      adapter._connected = true;
      expect(adapter.isConnected()).toBe(true);
    });

    it('should return true if connection is not null', () => {
      adapter.connection = { fake: true };
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe('ensureConnected()', () => {
    it('should call connect() if not connected', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      await adapter.ensureConnected();
      expect(adapter.connect).toHaveBeenCalled();
      expect(adapter._connected).toBe(true);
    });

    it('should not call connect() if already connected', async () => {
      adapter._connected = true;
      adapter.connect = jest.fn();
      await adapter.ensureConnected();
      expect(adapter.connect).not.toHaveBeenCalled();
    });

    it('should share a single promise for concurrent calls', async () => {
      let resolveConnect;
      adapter.connect = jest.fn().mockImplementation(() => new Promise((r) => { resolveConnect = r; }));

      const p1 = adapter.ensureConnected();
      const p2 = adapter.ensureConnected();

      expect(adapter.connect).toHaveBeenCalledTimes(1);
      resolveConnect();
      await Promise.all([p1, p2]);
      expect(adapter._connected).toBe(true);
    });

    it('should reset state on connect failure', async () => {
      adapter.connect = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(adapter.ensureConnected()).rejects.toThrow('fail');
      expect(adapter._connected).toBe(false);
      expect(adapter._connectPromise).toBeNull();
    });
  });

  describe('_markDisconnected()', () => {
    it('should reset connection state', () => {
      adapter._connected = true;
      adapter._connectPromise = Promise.resolve();
      adapter.connection = { fake: true };

      adapter._markDisconnected();

      expect(adapter._connected).toBe(false);
      expect(adapter._connectPromise).toBeNull();
      expect(adapter.connection).toBeNull();
    });
  });

  describe('abstract methods', () => {
    it('connect() should throw', async () => {
      await expect(adapter.connect()).rejects.toThrow('connect() method must be implemented');
    });

    it('disconnect() should throw', async () => {
      await expect(adapter.disconnect()).rejects.toThrow('disconnect() method must be implemented');
    });

    it('query() should throw', async () => {
      await expect(adapter.query('SELECT 1')).rejects.toThrow('query() method must be implemented');
    });

    it('prepare() should throw', () => {
      expect(() => adapter.prepare('SELECT 1')).toThrow('prepare() must be implemented');
    });

    it('getParameterPlaceholder() should throw', () => {
      expect(() => adapter.getParameterPlaceholder(0)).toThrow('getParameterPlaceholder() must be implemented');
    });

    it('lastInsertId() should throw', async () => {
      await expect(adapter.lastInsertId()).rejects.toThrow('lastInsertId() method must be implemented');
    });
  });

  describe('fetchAll()', () => {
    it('should call ensureConnected and query', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue([{ id: 1 }]);
      const result = await adapter.fetchAll('SELECT * FROM t');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should handle Select query builder objects', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue([{ id: 1 }]);
      const mockSelect = {
        constructor: { name: 'Select' },
        toString: () => 'SELECT * FROM t',
        getParameters: () => [1],
      };
      await adapter.fetchAll(mockSelect);
      expect(adapter.query).toHaveBeenCalledWith('SELECT * FROM t', [1]);
    });
  });

  describe('fetchRow()', () => {
    it('should return first row', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await adapter.fetchRow('SELECT * FROM t');
      expect(result).toEqual({ id: 1 });
    });

    it('should return null when no rows', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue([]);
      const result = await adapter.fetchRow('SELECT * FROM t WHERE 0');
      expect(result).toBeNull();
    });
  });

  describe('fetchOne()', () => {
    it('should return first column of first row', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue([{ count: 42 }]);
      const result = await adapter.fetchOne('SELECT COUNT(*) FROM t');
      expect(result).toBe(42);
    });

    it('should return null when no rows', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue([]);
      const result = await adapter.fetchOne('SELECT COUNT(*) FROM t WHERE 0');
      expect(result).toBeNull();
    });
  });

  describe('insert() (base implementation)', () => {
    it('should build and execute INSERT SQL', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue({ rowCount: 1 });
      adapter.getParameterPlaceholder = jest.fn((i) => `$${i + 1}`);

      await adapter.insert('users', { name: 'Alice', age: 30 });

      expect(adapter.query).toHaveBeenCalledWith(
        'INSERT INTO users (name, age) VALUES ($1, $2)',
        ['Alice', 30]
      );
    });
  });

  describe('update() (base implementation)', () => {
    it('should build and execute UPDATE SQL with $ placeholders', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue({ rowCount: 1 });
      adapter.getParameterPlaceholder = jest.fn((i) => `$${i + 1}`);

      await adapter.update('users', { name: 'Bob' }, 'id = $1', [1]);

      expect(adapter.query).toHaveBeenCalledWith(
        'UPDATE users SET name = $1 WHERE id = $2',
        ['Bob', 1]
      );
    });

    it('should keep ? placeholders unchanged in where clause', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue({ rowCount: 1 });
      adapter.getParameterPlaceholder = jest.fn(() => '?');

      await adapter.update('users', { name: 'Bob' }, 'id = ?', [1]);

      expect(adapter.query).toHaveBeenCalledWith(
        'UPDATE users SET name = ? WHERE id = ?',
        ['Bob', 1]
      );
    });
  });

  describe('delete() (base implementation)', () => {
    it('should build and execute DELETE SQL', async () => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue({ rowCount: 1 });

      await adapter.delete('users', 'id = $1', [1]);

      expect(adapter.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [1]);
    });
  });

  describe('transaction methods', () => {
    beforeEach(() => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue({ rows: [] });
    });

    it('beginTransaction() should execute BEGIN', async () => {
      await adapter.beginTransaction();
      expect(adapter.query).toHaveBeenCalledWith('BEGIN');
    });

    it('commit() should execute COMMIT', async () => {
      await adapter.commit();
      expect(adapter.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rollback() should execute ROLLBACK', async () => {
      await adapter.rollback();
      expect(adapter.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('transaction()', () => {
    beforeEach(() => {
      adapter.connect = jest.fn().mockResolvedValue(undefined);
      adapter.query = jest.fn().mockResolvedValue({ rows: [] });
    });

    it('should commit on success', async () => {
      const result = await adapter.transaction(async (db) => {
        return 'done';
      });
      expect(result).toBe('done');
      expect(adapter.query).toHaveBeenCalledWith('BEGIN');
      expect(adapter.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on failure', async () => {
      await expect(
        adapter.transaction(async () => { throw new Error('oops'); })
      ).rejects.toThrow('oops');
      expect(adapter.query).toHaveBeenCalledWith('BEGIN');
      expect(adapter.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('escape()', () => {
    it('should escape null', () => {
      expect(adapter.escape(null)).toBe('NULL');
    });

    it('should escape undefined', () => {
      expect(adapter.escape(undefined)).toBe('NULL');
    });

    it('should escape strings with single quotes', () => {
      expect(adapter.escape("it's")).toBe("'it''s'");
    });

    it('should escape numbers', () => {
      expect(adapter.escape(42)).toBe('42');
    });

    it('should escape booleans', () => {
      expect(adapter.escape(true)).toBe('TRUE');
      expect(adapter.escape(false)).toBe('FALSE');
    });

    it('should escape Date objects', () => {
      const d = new Date('2024-01-01T00:00:00Z');
      expect(adapter.escape(d)).toBe("'2024-01-01T00:00:00.000Z'");
    });
  });

  describe('escape() fallback', () => {
    it('should convert non-standard types to quoted string', () => {
      expect(adapter.escape([1, 2])).toBe("'1,2'");
      expect(adapter.escape({ foo: 'bar' })).toBe("'[object Object]'");
    });
  });

  describe('query builder factory methods', () => {
    it('select() should return a Select instance', () => {
      const sel = adapter.select();
      expect(sel).toBeDefined();
      expect(sel.constructor.name).toBe('Select');
    });

    it('insertQuery() should return an Insert instance', () => {
      const ins = adapter.insertQuery();
      expect(ins).toBeDefined();
      expect(ins.constructor.name).toBe('Insert');
    });

    it('updateQuery() should return an Update instance', () => {
      const upd = adapter.updateQuery();
      expect(upd).toBeDefined();
      expect(upd.constructor.name).toBe('Update');
    });

    it('deleteQuery() should return a Delete instance', () => {
      const del = adapter.deleteQuery();
      expect(del).toBeDefined();
      expect(del.constructor.name).toBe('Delete');
    });
  });

  describe('quoteIdentifier()', () => {
    it('should wrap in double quotes by default', () => {
      expect(adapter.quoteIdentifier('tableName')).toBe('"tableName"');
    });
  });

  describe('getConnectionInfo()', () => {
    it('should return connection details', () => {
      const info = adapter.getConnectionInfo();
      expect(info.type).toBe('DatabaseAdapter');
      expect(info.connected).toBe(false);
      expect(info.config.host).toBe('localhost');
      expect(info.config.database).toBe('testdb');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// PostgreSQLAdapter
// ═══════════════════════════════════════════════════════════════════
describe('PostgreSQLAdapter', () => {
  let adapter;

  beforeEach(() => {
    // Reset all mock states
    mockPgPool.query.mockReset();
    mockPgPool.connect.mockReset().mockResolvedValue(mockPgClient);
    mockPgPool.end.mockReset().mockResolvedValue(undefined);
    mockPgPool.on.mockReset();
    mockPgClient.release.mockReset();
    mockPgClient.query.mockReset();

    adapter = new PostgreSQLAdapter({
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'user',
      password: 'pass',
    });
  });

  describe('constructor', () => {
    it('should initialize with pool as null', () => {
      expect(adapter.pool).toBeNull();
    });
  });

  describe('connect()', () => {
    it('should create pool and test connectivity', async () => {
      await adapter.connect();
      expect(adapter.pool).not.toBeNull();
      expect(mockPgPool.connect).toHaveBeenCalled();
      expect(mockPgClient.release).toHaveBeenCalled();
      expect(adapter.connection).toBe(mockPgPool);
    });

    it('should be idempotent', async () => {
      await adapter.connect();
      const pool = adapter.pool;
      await adapter.connect();
      expect(adapter.pool).toBe(pool);
    });

    it('should throw on connection failure', async () => {
      mockPgPool.connect.mockRejectedValue(new Error('conn refused'));
      await expect(adapter.connect()).rejects.toThrow('PostgreSQL connection failed: conn refused');
      expect(adapter.connection).toBeNull();
    });
  });

  describe('disconnect()', () => {
    it('should close pool and reset state', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(mockPgPool.end).toHaveBeenCalled();
      expect(adapter.pool).toBeNull();
      expect(adapter.connection).toBeNull();
    });

    it('should handle no pool gracefully', async () => {
      await adapter.disconnect();
      expect(adapter.pool).toBeNull();
    });
  });

  describe('query()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should execute query and return standardized result', async () => {
      mockPgPool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Alice' }],
        rowCount: 1,
      });
      const result = await adapter.query('SELECT * FROM users WHERE id = $1', [1]);
      expect(result.rows).toEqual([{ id: 1, name: 'Alice' }]);
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBeNull();
    });

    it('should handle empty results', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await adapter.query('SELECT * FROM users WHERE 0');
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should wrap query errors', async () => {
      mockPgPool.query.mockRejectedValue(new Error('syntax error'));
      await expect(adapter.query('INVALID')).rejects.toThrow('PostgreSQL query failed: syntax error');
    });
  });

  describe('insert()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build INSERT RETURNING * and return result', async () => {
      mockPgPool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Alice' }],
        rowCount: 1,
      });

      const result = await adapter.insert('users', { name: 'Alice' });
      expect(result.insertedId).toBe(1);
      expect(result.insertedRow).toEqual({ id: 1, name: 'Alice' });
      expect(result.rowCount).toBe(1);
    });
  });

  describe('update()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build UPDATE RETURNING * and return result', async () => {
      mockPgPool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Bob' }],
        rowCount: 1,
      });

      const result = await adapter.update('users', { name: 'Bob' }, 'id = $1', [1]);
      expect(result.rowsAffected).toBe(1);
      expect(result.updatedRows).toEqual([{ id: 1, name: 'Bob' }]);
    });
  });

  describe('delete()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build DELETE RETURNING * and return result', async () => {
      mockPgPool.query.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const result = await adapter.delete('users', 'id = $1', [1]);
      expect(result.rowsAffected).toBe(1);
      expect(result.deletedRows).toEqual([{ id: 1 }]);
    });
  });

  describe('transaction()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should commit on success', async () => {
      mockPgClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await adapter.transaction(async (tx) => {
        return 'done';
      });
      expect(result).toBe('done');
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPgClient.release).toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      mockPgClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(
        adapter.transaction(async () => { throw new Error('oops'); })
      ).rejects.toThrow('oops');
      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.release).toHaveBeenCalled();
    });

    it('should provide txAdapter.query() that returns standardized result', async () => {
      mockPgClient.query.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      await adapter.transaction(async (tx) => {
        const res = await tx.query('SELECT 1');
        expect(res.rows).toEqual([{ id: 1 }]);
        expect(res.rowCount).toBe(1);
      });
    });
  });

  describe('lastInsertId()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return lastval() without sequence', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [{ lastval: 42 }], rowCount: 1 });
      const id = await adapter.lastInsertId();
      expect(id).toBe(42);
    });

    it('should return currval() with sequence', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [{ currval: 10 }], rowCount: 1 });
      const id = await adapter.lastInsertId('users_id_seq');
      expect(id).toBe(10);
    });
  });

  describe('quoteIdentifier()', () => {
    it('should wrap in double quotes', () => {
      expect(adapter.quoteIdentifier('users')).toBe('"users"');
    });
  });

  describe('getParameterPlaceholder()', () => {
    it('should return $n style', () => {
      expect(adapter.getParameterPlaceholder(0)).toBe('$1');
      expect(adapter.getParameterPlaceholder(1)).toBe('$2');
    });
  });

  describe('prepare()', () => {
    it('should return a PostgreSQLStatement', () => {
      const stmt = adapter.prepare('SELECT $1');
      expect(stmt.constructor.name).toBe('PostgreSQLStatement');
      expect(stmt.sql).toBe('SELECT $1');
    });
  });

  describe('tableExists()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return true if table exists', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 });
      const exists = await adapter.tableExists('users');
      expect(exists).toBe(true);
    });

    it('should return false if table does not exist', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [{ exists: false }], rowCount: 1 });
      const exists = await adapter.tableExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('getTableColumns()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return column info', async () => {
      const cols = [{ column_name: 'id', data_type: 'integer' }];
      mockPgPool.query.mockResolvedValue({ rows: cols, rowCount: 1 });
      const result = await adapter.getTableColumns('users');
      expect(result).toEqual(cols);
    });
  });

  describe('getDatabaseInfo()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return database info', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 15' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ size: '10 MB' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ client_encoding: 'UTF8' }], rowCount: 1 });

      const info = await adapter.getDatabaseInfo();
      expect(info.version).toBe('PostgreSQL 15');
      expect(info.database_size).toBe('10 MB');
    });

    it('should handle errors gracefully', async () => {
      mockPgPool.query.mockRejectedValue(new Error('connection lost'));
      const info = await adapter.getDatabaseInfo();
      expect(info.error).toBeDefined();
    });
  });

  describe('pool error handler', () => {
    it('should handle pool idle client error', async () => {
      await adapter.connect();
      // Get the error handler registered via pool.on('error', ...)
      const onCall = mockPgPool.on.mock.calls.find(c => c[0] === 'error');
      expect(onCall).toBeDefined();
      const errorHandler = onCall[1];
      // Trigger the error handler - console.error is already mocked by top-level beforeAll
      errorHandler(new Error('connection terminated'));
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[PostgreSQLAdapter]'),
        'connection terminated'
      );
    });
  });

  describe('disconnect failure', () => {
    it('should throw on disconnect error', async () => {
      await adapter.connect();
      mockPgPool.end.mockRejectedValue(new Error('pool end failed'));
      await expect(adapter.disconnect()).rejects.toThrow('PostgreSQL disconnection failed: pool end failed');
    });
  });

  describe('query with DATABASE_DEBUG', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should log SQL when DATABASE_DEBUG is true', async () => {
      const orig = process.env.DATABASE_DEBUG;
      process.env.DATABASE_DEBUG = 'true';
      mockPgPool.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      await adapter.query('SELECT * FROM users WHERE id = $1', [1]);
      expect(console.log).toHaveBeenCalledWith('Executing SQL:', 'SELECT * FROM users WHERE id = $1');
      expect(console.log).toHaveBeenCalledWith('Parameters:', [1]);
      if (orig === undefined) delete process.env.DATABASE_DEBUG;
      else process.env.DATABASE_DEBUG = orig;
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// MySQLAdapter
// ═══════════════════════════════════════════════════════════════════
describe('MySQLAdapter', () => {
  let adapter;

  beforeEach(() => {
    mockMysqlPool.execute.mockReset();
    mockMysqlPool.getConnection.mockReset().mockResolvedValue(mockMysqlConnection);
    mockMysqlPool.end.mockReset().mockResolvedValue(undefined);
    mockMysqlConnection.ping.mockReset().mockResolvedValue(undefined);
    mockMysqlConnection.release.mockReset();
    mockMysqlConnection.execute.mockReset();
    mockMysqlConnection.beginTransaction.mockReset().mockResolvedValue(undefined);
    mockMysqlConnection.commit.mockReset().mockResolvedValue(undefined);
    mockMysqlConnection.rollback.mockReset().mockResolvedValue(undefined);

    adapter = new MySQLAdapter({
      host: 'localhost',
      port: 3306,
      database: 'testdb',
      user: 'root',
      password: 'pass',
    });
  });

  describe('constructor', () => {
    it('should initialize config with defaults', () => {
      expect(adapter.config.host).toBe('localhost');
      expect(adapter.config.port).toBe(3306);
      expect(adapter.config.charset).toBe('utf8mb4');
      expect(adapter.pool).toBeNull();
      expect(adapter.connected).toBe(false);
    });
  });

  describe('connect()', () => {
    it('should create pool and test connectivity', async () => {
      await adapter.connect();
      expect(adapter.pool).toBe(mockMysqlPool);
      expect(mockMysqlPool.getConnection).toHaveBeenCalled();
      expect(mockMysqlConnection.ping).toHaveBeenCalled();
      expect(mockMysqlConnection.release).toHaveBeenCalled();
      expect(adapter.connected).toBe(true);
      expect(adapter.connection).toBe(mockMysqlPool);
    });

    it('should be idempotent', async () => {
      await adapter.connect();
      await adapter.connect();
      // pool should be same
      expect(adapter.pool).toBe(mockMysqlPool);
    });

    it('should throw on connection failure', async () => {
      mockMysqlPool.getConnection.mockRejectedValue(new Error('refused'));
      await expect(adapter.connect()).rejects.toThrow('MySQL connection failed: refused');
      expect(adapter.pool).toBeNull();
      expect(adapter.connected).toBe(false);
    });
  });

  describe('disconnect()', () => {
    it('should close pool and reset state', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(mockMysqlPool.end).toHaveBeenCalled();
      expect(adapter.pool).toBeNull();
      expect(adapter.connected).toBe(false);
    });
  });

  describe('query()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should execute and return rows for SELECT', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ id: 1 }], [{ name: 'id' }]]);
      const result = await adapter.query('SELECT * FROM users');
      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
    });

    it('should handle INSERT results', async () => {
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 1, insertId: 5 }, undefined]);
      const result = await adapter.query('INSERT INTO users (name) VALUES (?)', ['Alice']);
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBe(5);
    });

    it('should wrap query errors', async () => {
      mockMysqlPool.execute.mockRejectedValue(new Error('bad sql'));
      await expect(adapter.query('INVALID')).rejects.toThrow('MySQL query failed: bad sql');
    });
  });

  describe('insert()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build and execute INSERT', async () => {
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 1, insertId: 10 }, undefined]);
      const result = await adapter.insert('users', { name: 'Alice', age: 30 });
      expect(result.insertedId).toBe(10);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });
  });

  describe('insertBatch()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should insert multiple records', async () => {
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 2, insertId: 1 }, undefined]);
      const result = await adapter.insertBatch('users', [
        { name: 'Alice' },
        { name: 'Bob' },
      ]);
      expect(result.insertedCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should throw for empty array', async () => {
      await expect(adapter.insertBatch('users', [])).rejects.toThrow('Data array must be non-empty array');
    });
  });

  describe('update()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build and execute UPDATE', async () => {
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 1 }, undefined]);
      const result = await adapter.update('users', { name: 'Bob' }, 'id = ?', [1]);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });
  });

  describe('delete()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build and execute DELETE', async () => {
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 1 }, undefined]);
      const result = await adapter.delete('users', 'id = ?', [1]);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should handle DELETE without WHERE', async () => {
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 5 }, undefined]);
      const result = await adapter.delete('temp_table');
      expect(result.affectedRows).toBe(5);
    });
  });

  describe('transaction()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should commit on success', async () => {
      mockMysqlConnection.execute.mockResolvedValue([[{ id: 1 }], [{ name: 'id' }]]);
      const result = await adapter.transaction(async (tx) => {
        const res = await tx.query('SELECT 1');
        return res;
      });
      expect(mockMysqlConnection.beginTransaction).toHaveBeenCalled();
      expect(mockMysqlConnection.commit).toHaveBeenCalled();
      expect(mockMysqlConnection.release).toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      await expect(
        adapter.transaction(async () => { throw new Error('oops'); })
      ).rejects.toThrow('oops');
      expect(mockMysqlConnection.rollback).toHaveBeenCalled();
      expect(mockMysqlConnection.release).toHaveBeenCalled();
    });
  });

  describe('quoteIdentifier()', () => {
    it('should wrap in backticks', () => {
      expect(adapter.quoteIdentifier('users')).toBe('`users`');
    });

    it('should escape backticks in identifier', () => {
      expect(adapter.quoteIdentifier('user`s')).toBe('`user``s`');
    });
  });

  describe('getParameterPlaceholder()', () => {
    it('should return ?', () => {
      expect(adapter.getParameterPlaceholder(0)).toBe('?');
      expect(adapter.getParameterPlaceholder(5)).toBe('?');
    });
  });

  describe('prepare()', () => {
    it('should return a MySQLStatement', () => {
      const stmt = adapter.prepare('SELECT ?');
      expect(stmt.constructor.name).toBe('MySQLStatement');
    });
  });

  describe('tableExists()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return true if table exists', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ count: 1 }], []]);
      const exists = await adapter.tableExists('users');
      expect(exists).toBe(true);
    });

    it('should return false if table does not exist', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ count: 0 }], []]);
      const exists = await adapter.tableExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('getVersion()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return version string', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ version: '8.0.30' }], []]);
      const version = await adapter.getVersion();
      expect(version).toBe('8.0.30');
    });
  });

  describe('listTables()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return table names', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ table_name: 'users' }, { table_name: 'posts' }], []]);
      const tables = await adapter.listTables();
      expect(tables).toEqual(['users', 'posts']);
    });
  });

  describe('escape()', () => {
    it('should delegate to mysql.escape', () => {
      expect(adapter.escape('test')).toBe("'test'");
    });
  });

  describe('getTableInfo()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return table column info', async () => {
      mockMysqlPool.execute.mockResolvedValue([[
        { column_name: 'id', data_type: 'int', is_nullable: 'NO', column_default: null, extra: 'auto_increment' },
        { column_name: 'name', data_type: 'varchar', is_nullable: 'YES', column_default: null, extra: '' },
      ], []]);
      const info = await adapter.getTableInfo('users');
      expect(info.tableName).toBe('users');
      expect(info.columns).toHaveLength(2);
      expect(info.columns[0].name).toBe('id');
      expect(info.columns[0].autoIncrement).toBe(true);
      expect(info.columns[1].nullable).toBe(true);
    });
  });

  describe('getNextAutoIncrement()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return next auto increment value', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ next_id: 42 }], []]);
      const nextId = await adapter.getNextAutoIncrement('users');
      expect(nextId).toBe(42);
    });

    it('should return 1 when no auto increment info', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ next_id: null }], []]);
      const nextId = await adapter.getNextAutoIncrement('users');
      expect(nextId).toBe(1);
    });
  });

  describe('optimizeTable()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should execute OPTIMIZE TABLE', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ Msg_type: 'status', Msg_text: 'OK' }], []]);
      const result = await adapter.optimizeTable('users');
      expect(result.rows).toBeDefined();
    });
  });

  describe('showTableStatus()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return table status', async () => {
      mockMysqlPool.execute.mockResolvedValue([[{ Name: 'users', Rows: 100 }], []]);
      const status = await adapter.showTableStatus('users');
      expect(status.Name).toBe('users');
    });

    it('should return null when table not found', async () => {
      mockMysqlPool.execute.mockResolvedValue([[], []]);
      const status = await adapter.showTableStatus('nonexistent');
      expect(status).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SqlServerAdapter
// ═══════════════════════════════════════════════════════════════════
describe('SqlServerAdapter', () => {
  let adapter;

  beforeEach(() => {
    mockMssqlPool.connect.mockReset().mockResolvedValue(undefined);
    mockMssqlPool.close.mockReset().mockResolvedValue(undefined);
    mockMssqlPool.connected = true;
    mockMssqlPool.connecting = false;
    mockMssqlPool.request.mockReset().mockReturnValue(mockMssqlRequest);
    mockMssqlRequest.input.mockReset();
    mockMssqlRequest.query.mockReset();
    mockMssqlTransaction.begin.mockReset().mockResolvedValue(undefined);
    mockMssqlTransaction.commit.mockReset().mockResolvedValue(undefined);
    mockMssqlTransaction.rollback.mockReset().mockResolvedValue(undefined);
    mockMssqlTransaction.request.mockReset().mockReturnValue(mockMssqlRequest);

    adapter = new SqlServerAdapter({
      server: 'localhost',
      port: 1433,
      database: 'testdb',
      user: 'sa',
      password: 'pass',
    });
  });

  describe('constructor', () => {
    it('should initialize config with defaults', () => {
      expect(adapter.config.server).toBe('localhost');
      expect(adapter.config.port).toBe(1433);
      expect(adapter.pool).toBeNull();
      expect(adapter.connected).toBe(false);
    });
  });

  describe('connect()', () => {
    it('should create pool and connect', async () => {
      await adapter.connect();
      expect(adapter.pool).not.toBeNull();
      expect(adapter.connected).toBe(true);
      expect(adapter.connection).toBe(adapter.pool);
    });

    it('should be idempotent when already connected', async () => {
      await adapter.connect();
      adapter.pool.connected = true;
      await adapter.connect();
      // Should not throw
      expect(adapter.connected).toBe(true);
    });

    it('should throw on connection failure', async () => {
      mockMssqlPool.connect.mockRejectedValue(new Error('refused'));
      await expect(adapter.connect()).rejects.toThrow('SQL Server connection failed: refused');
      expect(adapter.pool).toBeNull();
      expect(adapter.connected).toBe(false);
    });
  });

  describe('disconnect()', () => {
    it('should close pool and reset state', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.pool).toBeNull();
      expect(adapter.connected).toBe(false);
    });
  });

  describe('query()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should execute and return rows', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1, name: 'Alice' }],
        rowsAffected: [1],
      });
      const result = await adapter.query('SELECT * FROM users WHERE id = ?', [1]);
      expect(result.rows).toEqual([{ id: 1, name: 'Alice' }]);
      expect(result.rowCount).toBe(1);
    });

    it('should handle $n style placeholders', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }],
        rowsAffected: [1],
      });
      const result = await adapter.query('SELECT * FROM users WHERE id = $1', [1]);
      expect(result.rows).toEqual([{ id: 1 }]);
      // Check that input was called
      expect(mockMssqlRequest.input).toHaveBeenCalledWith('param0', 1);
    });

    it('should wrap query errors', async () => {
      mockMssqlRequest.query.mockRejectedValue(new Error('timeout'));
      await expect(adapter.query('SELECT 1')).rejects.toThrow('SQL Server query failed: timeout');
    });
  });

  describe('_processPlaceholders()', () => {
    it('should convert $n to @paramN', () => {
      const { processedSql, mode } = adapter._processPlaceholders('SELECT * FROM t WHERE a = $1 AND b = $2');
      expect(processedSql).toBe('SELECT * FROM t WHERE a = @param0 AND b = @param1');
      expect(mode).toBe('$');
    });

    it('should convert ? to @paramN', () => {
      const { processedSql, mode } = adapter._processPlaceholders('SELECT * FROM t WHERE a = ? AND b = ?');
      expect(processedSql).toBe('SELECT * FROM t WHERE a = @param0 AND b = @param1');
      expect(mode).toBe('?');
    });
  });

  describe('insert()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build INSERT with OUTPUT and return result', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1, name: 'Alice' }],
        rowsAffected: [1],
      });

      const result = await adapter.insert('users', { name: 'Alice' });
      expect(result.insertedId).toBe(1);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });
  });

  describe('insertBatch()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should insert multiple records', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [2],
      });
      const result = await adapter.insertBatch('users', [
        { name: 'Alice' },
        { name: 'Bob' },
      ]);
      expect(result.insertedCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should throw for empty array', async () => {
      await expect(adapter.insertBatch('users', [])).rejects.toThrow('Data array must be non-empty array');
    });
  });

  describe('update()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build UPDATE and return result', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [1],
      });
      const result = await adapter.update('users', { name: 'Bob' }, 'id = ?', [1]);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should support returnUpdated option', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1, name: 'Bob' }],
        rowsAffected: [1],
      });
      const result = await adapter.update('users', { name: 'Bob' }, 'id = ?', [1], true);
      expect(result.updatedRecords).toEqual([{ id: 1, name: 'Bob' }]);
    });
  });

  describe('delete()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build DELETE and return result', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [1],
      });
      const result = await adapter.delete('users', 'id = ?', [1]);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should support returnDeleted option', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }],
        rowsAffected: [1],
      });
      const result = await adapter.delete('users', 'id = ?', [1], true);
      expect(result.deletedRecords).toEqual([{ id: 1 }]);
    });
  });

  describe('transaction()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should commit on success', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }],
        rowsAffected: [1],
      });

      const result = await adapter.transaction(async (tx) => {
        return await tx.query('SELECT 1');
      });

      expect(mockMssqlTransaction.begin).toHaveBeenCalled();
      expect(mockMssqlTransaction.commit).toHaveBeenCalled();
      expect(result.rows).toEqual([{ id: 1 }]);
    });

    it('should rollback on failure', async () => {
      await expect(
        adapter.transaction(async () => { throw new Error('oops'); })
      ).rejects.toThrow('oops');
      expect(mockMssqlTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('extractInsertedId()', () => {
    it('should extract InsertedId', () => {
      const result = { recordset: [{ InsertedId: 42 }] };
      expect(adapter.extractInsertedId(result)).toBe(42);
    });

    it('should fall back to id', () => {
      const result = { recordset: [{ id: 10 }] };
      expect(adapter.extractInsertedId(result)).toBe(10);
    });

    it('should return null for empty recordset', () => {
      const result = { recordset: [] };
      expect(adapter.extractInsertedId(result)).toBeNull();
    });
  });

  describe('extractIdentityValue()', () => {
    it('should extract by common key names', () => {
      expect(adapter.extractIdentityValue({ id: 1 })).toBe(1);
      expect(adapter.extractIdentityValue({ Id: 2 })).toBe(2);
      expect(adapter.extractIdentityValue({ ID: 3 })).toBe(3);
    });

    it('should fall back to first numeric value', () => {
      expect(adapter.extractIdentityValue({ name: 'Alice', seq: 5 })).toBe(5);
    });

    it('should return null for non-numeric record', () => {
      expect(adapter.extractIdentityValue({ name: 'Alice' })).toBeNull();
    });
  });

  describe('quoteIdentifier()', () => {
    it('should wrap in square brackets', () => {
      expect(adapter.quoteIdentifier('users')).toBe('[users]');
    });

    it('should escape closing brackets', () => {
      expect(adapter.quoteIdentifier('user]s')).toBe('[user]]s]');
    });
  });

  describe('escape()', () => {
    it('should escape strings', () => {
      expect(adapter.escape("it's")).toBe("'it''s'");
    });

    it('should return value for non-string', () => {
      expect(adapter.escape(42)).toBe(42);
    });
  });

  describe('getParameterPlaceholder()', () => {
    it('should return @paramN style', () => {
      expect(adapter.getParameterPlaceholder(0)).toBe('@param0');
      expect(adapter.getParameterPlaceholder(1)).toBe('@param1');
    });
  });

  describe('prepare()', () => {
    it('should return a SQLServerStatement', () => {
      const stmt = adapter.prepare('SELECT @param0');
      expect(stmt.constructor.name).toBe('SQLServerStatement');
    });
  });

  describe('tableExists()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return true if table exists', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ count: 1 }],
        rowsAffected: [1],
      });
      const exists = await adapter.tableExists('users');
      expect(exists).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SQLiteAdapter
// ═══════════════════════════════════════════════════════════════════
describe('SQLiteAdapter', () => {
  let adapter;

  beforeEach(() => {
    mockSqliteDb.all.mockReset();
    mockSqliteDb.run.mockReset();
    mockSqliteDb.close.mockReset();
    mockSqliteDb.prepare.mockReset();

    // By default, all pragma calls succeed
    mockSqliteDb.all.mockImplementation((sql, params, cb) => {
      if (typeof params === 'function') {
        params(null, []);
      } else {
        cb(null, []);
      }
    });

    adapter = new SQLiteAdapter({
      database: ':memory:',
    });
  });

  describe('constructor', () => {
    it('should initialize config with defaults', () => {
      expect(adapter.config.database).toBe(':memory:');
      expect(adapter.config.options.enableWAL).toBe(true);
      expect(adapter.config.options.foreignKeys).toBe(true);
      expect(adapter.db).toBeNull();
      expect(adapter.connected).toBe(false);
    });
  });

  describe('connect()', () => {
    it('should open database and apply pragmas', async () => {
      await adapter.connect();
      expect(adapter.db).not.toBeNull();
      expect(adapter.connected).toBe(true);
      expect(adapter.connection).toBe(adapter.db);
      // Pragmas should have been applied
      expect(mockSqliteDb.all).toHaveBeenCalled();
    });

    it('should be idempotent', async () => {
      await adapter.connect();
      const db = adapter.db;
      await adapter.connect();
      expect(adapter.db).toBe(db);
    });
  });

  describe('disconnect()', () => {
    it('should close db and reset state', async () => {
      mockSqliteDb.close.mockImplementation((cb) => cb(null));
      await adapter.connect();
      await adapter.disconnect();
      expect(mockSqliteDb.close).toHaveBeenCalled();
      expect(adapter.db).toBeNull();
      expect(adapter.connected).toBe(false);
    });

    it('should handle no db gracefully', async () => {
      await adapter.disconnect();
      expect(adapter.connected).toBe(false);
    });

    it('should throw on close error', async () => {
      mockSqliteDb.close.mockImplementation((cb) => cb(new Error('close failed')));
      await adapter.connect();
      await expect(adapter.disconnect()).rejects.toThrow('SQLite disconnect failed: close failed');
    });
  });

  describe('query()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should execute SELECT and return rows', async () => {
      // Override .all for the query (not pragma)
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') {
          params(null, [{ id: 1 }]);
        } else {
          cb(null, [{ id: 1 }]);
        }
      });
      const result = await adapter.query('SELECT * FROM users');
      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
    });

    it('should execute INSERT and return metadata', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ lastID: 42, changes: 1 }, null);
      });
      const result = await adapter.query('INSERT INTO users (name) VALUES (?)', ['Alice']);
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBe(42);
    });

    it('should rewrite $n placeholders', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') {
          params(null, [{ id: 1 }]);
        } else {
          // Verify that $1 was rewritten to ?
          expect(sql).toContain('?');
          expect(sql).not.toContain('$1');
          cb(null, [{ id: 1 }]);
        }
      });
      await adapter.query('SELECT * FROM users WHERE id = $1', [1]);
    });

    it('should wrap query errors', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') {
          params(new Error('bad sql'));
        } else {
          cb(new Error('bad sql'));
        }
      });
      await expect(adapter.query('SELECT INVALID')).rejects.toThrow('SQLite query failed: bad sql');
    });
  });

  describe('insert()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build and execute INSERT', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ lastID: 5, changes: 1 }, null);
      });
      const result = await adapter.insert('users', { name: 'Alice', age: 30 });
      expect(result.insertedId).toBe(5);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });
  });

  describe('update()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build and execute UPDATE', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 1 }, null);
      });
      const result = await adapter.update('users', { name: 'Bob' }, 'id = ?', [1]);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });
  });

  describe('delete()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should build and execute DELETE', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 1 }, null);
      });
      const result = await adapter.delete('users', 'id = ?', [1]);
      expect(result.affectedRows).toBe(1);
      expect(result.success).toBe(true);
    });
  });

  describe('transaction()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should commit on success', async () => {
      // BEGIN, COMMIT, and callback query all go through db.run or db.all
      let queryCalls = [];
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        queryCalls.push(sql);
        cb.call({ changes: 0 }, null);
      });
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        queryCalls.push(sql);
        if (typeof params === 'function') {
          params(null, []);
        } else {
          cb(null, []);
        }
      });

      const result = await adapter.transaction(async (tx) => {
        return 'done';
      });
      expect(result).toBe('done');
      // BEGIN TRANSACTION and COMMIT should be in the calls
      expect(queryCalls.some(q => q.includes('BEGIN'))).toBe(true);
      expect(queryCalls.some(q => q.includes('COMMIT'))).toBe(true);
    });

    it('should rollback on failure', async () => {
      let queryCalls = [];
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        queryCalls.push(sql);
        cb.call({ changes: 0 }, null);
      });
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        queryCalls.push(sql);
        if (typeof params === 'function') {
          params(null, []);
        } else {
          cb(null, []);
        }
      });

      await expect(
        adapter.transaction(async () => { throw new Error('oops'); })
      ).rejects.toThrow('oops');
      expect(queryCalls.some(q => q.includes('ROLLBACK'))).toBe(true);
    });
  });

  describe('_rewriteDollarParams()', () => {
    it('should rewrite $n to ? and reorder params', () => {
      const { sql, params } = adapter._rewriteDollarParams(
        'SELECT * FROM t WHERE a = $2 AND b = $1',
        ['val1', 'val2']
      );
      expect(sql).toBe('SELECT * FROM t WHERE a = ? AND b = ?');
      expect(params).toEqual(['val2', 'val1']);
    });

    it('should pass through if no $ placeholders', () => {
      const { sql, params } = adapter._rewriteDollarParams('SELECT * FROM t WHERE a = ?', ['val1']);
      expect(sql).toBe('SELECT * FROM t WHERE a = ?');
      expect(params).toEqual(['val1']);
    });
  });

  describe('quoteIdentifier()', () => {
    it('should wrap in double quotes', () => {
      expect(adapter.quoteIdentifier('users')).toBe('"users"');
    });

    it('should escape double quotes in identifier', () => {
      expect(adapter.quoteIdentifier('user"s')).toBe('"user""s"');
    });
  });

  describe('escape()', () => {
    it('should escape strings', () => {
      expect(adapter.escape("it's")).toBe("'it''s'");
    });

    it('should return value for non-string', () => {
      expect(adapter.escape(42)).toBe(42);
    });
  });

  describe('getParameterPlaceholder()', () => {
    it('should return ?', () => {
      expect(adapter.getParameterPlaceholder(0)).toBe('?');
    });
  });

  describe('prepare()', () => {
    it('should return a SQLiteStatement', () => {
      const stmt = adapter.prepare('SELECT ?');
      expect(stmt.constructor.name).toBe('SQLiteStatement');
    });
  });

  describe('tableExists()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return true if table exists', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') {
          params(null, [{ count: 1 }]);
        } else {
          cb(null, [{ count: 1 }]);
        }
      });
      const exists = await adapter.tableExists('users');
      expect(exists).toBe(true);
    });
  });

  describe('listTables()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return table names', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') {
          params(null, [{ table_name: 'users' }, { table_name: 'posts' }]);
        } else {
          cb(null, [{ table_name: 'users' }, { table_name: 'posts' }]);
        }
      });
      const tables = await adapter.listTables();
      expect(tables).toEqual(['users', 'posts']);
    });
  });

  describe('getVersion()', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return sqlite version', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') {
          params(null, [{ version: '3.39.0' }]);
        } else {
          cb(null, [{ version: '3.39.0' }]);
        }
      });
      const version = await adapter.getVersion();
      expect(version).toBe('3.39.0');
    });
  });

  describe('getConnectionInfo()', () => {
    it('should return connection details', () => {
      const info = adapter.getConnectionInfo();
      expect(info.type).toBe('SQLiteAdapter');
      expect(info.connected).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // Connection error paths
  // ---------------------------------------------------------
  describe('connect() - error paths', () => {
    it('should reject when Database callback receives error', async () => {
      const sqlite3Mock = require('sqlite3').verbose();
      sqlite3Mock.Database.mockImplementationOnce((path, cb) => {
        process.nextTick(() => cb(new Error('cannot open db')));
        return mockSqliteDb;
      });

      const failAdapter = new SQLiteAdapter({ database: '/bad/path.db' });
      await expect(failAdapter.connect()).rejects.toThrow('SQLite connection failed: cannot open db');
    });

    it('should reject when pragma application fails', async () => {
      // Create adapter, override all to fail after open
      const failAdapter = new SQLiteAdapter({ database: ':memory:' });

      // First call to _openDatabase succeeds (Database callback ok)
      // but pragmas fail
      let callCount = 0;
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        callCount++;
        if (callCount === 1) {
          // First pragma call fails
          if (typeof params === 'function') {
            params(new Error('pragma failed'));
          } else {
            cb(new Error('pragma failed'));
          }
        } else {
          if (typeof params === 'function') params(null, []);
          else cb(null, []);
        }
      });
      mockSqliteDb.close.mockImplementation((cb) => { if (cb) cb(null); });

      await expect(failAdapter.connect()).rejects.toThrow('pragma failed');
      expect(failAdapter.connected).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // _execPragma with no db handle
  // ---------------------------------------------------------
  describe('_execPragma()', () => {
    it('should reject when db handle is null', async () => {
      const freshAdapter = new SQLiteAdapter({ database: ':memory:' });
      // db is null by default (not connected)
      await expect(freshAdapter._execPragma('PRAGMA foreign_keys = ON'))
        .rejects.toThrow('SQLite db handle not initialized');
    });
  });

  // ---------------------------------------------------------
  // query() - INSERT/UPDATE/DELETE error (db.run error path)
  // ---------------------------------------------------------
  describe('query() - run error path', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should reject on INSERT error', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({}, new Error('insert failed'));
      });
      await expect(adapter.query('INSERT INTO t (a) VALUES (?)', [1]))
        .rejects.toThrow('SQLite query failed: insert failed');
    });

    it('should reject on UPDATE error', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({}, new Error('update failed'));
      });
      await expect(adapter.query('UPDATE t SET a = ?', [1]))
        .rejects.toThrow('SQLite query failed: update failed');
    });
  });

  // ---------------------------------------------------------
  // insertBatch()
  // ---------------------------------------------------------
  describe('insertBatch()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should throw on empty array', async () => {
      await expect(adapter.insertBatch('users', []))
        .rejects.toThrow('Data array must be non-empty array');
    });

    it('should throw on non-array input', async () => {
      await expect(adapter.insertBatch('users', 'not-an-array'))
        .rejects.toThrow('Data array must be non-empty array');
    });

    it('should insert multiple rows in a transaction', async () => {
      let queryCalls = [];
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        queryCalls.push(sql);
        cb.call({ lastID: queryCalls.length, changes: 1 }, null);
      });

      const result = await adapter.insertBatch('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]);

      expect(result.insertedCount).toBe(2);
      expect(result.firstInsertedId).toBeDefined();
      expect(result.success).toBe(true);
      // Should have BEGIN, two INSERTs, and COMMIT
      expect(queryCalls.some(q => q.includes('BEGIN'))).toBe(true);
      expect(queryCalls.some(q => q.includes('COMMIT'))).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // transaction() - query within transaction
  // ---------------------------------------------------------
  describe('transaction() - query inside callback', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, [{ id: 1 }]);
        else cb(null, [{ id: 1 }]);
      });
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 1, lastID: 1 }, null);
      });
      await adapter.connect();
    });

    it('should allow queries through transaction adapter', async () => {
      const result = await adapter.transaction(async (trx) => {
        const res = await trx.query('SELECT * FROM users WHERE id = $1', [1]);
        return res;
      });
      expect(result.rows).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // getTableInfo()
  // ---------------------------------------------------------
  describe('getTableInfo()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should return table info with columns', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') {
          params(null, [
            { name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
            { name: 'name', type: 'TEXT', notnull: 0, dflt_value: "'unknown'", pk: 0 },
          ]);
        } else {
          cb(null, [
            { name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
            { name: 'name', type: 'TEXT', notnull: 0, dflt_value: "'unknown'", pk: 0 },
          ]);
        }
      });

      const info = await adapter.getTableInfo('users');
      expect(info.tableName).toBe('users');
      expect(info.columns).toHaveLength(2);
      expect(info.columns[0].name).toBe('id');
      expect(info.columns[0].primaryKey).toBe(true);
      expect(info.columns[0].nullable).toBe(false);
      expect(info.columns[1].name).toBe('name');
      expect(info.columns[1].nullable).toBe(true);
      expect(info.columns[1].default).toBe("'unknown'");
    });
  });

  // ---------------------------------------------------------
  // getDatabaseSize()
  // ---------------------------------------------------------
  describe('getDatabaseSize()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should return database size info', async () => {
      let callIdx = 0;
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        callIdx++;
        const respond = (err, rows) => {
          if (typeof params === 'function') params(err, rows);
          else cb(err, rows);
        };
        if (sql.includes('page_count')) {
          respond(null, [{ page_count: 100 }]);
        } else if (sql.includes('page_size')) {
          respond(null, [{ page_size: 4096 }]);
        } else {
          respond(null, []);
        }
      });

      const size = await adapter.getDatabaseSize();
      expect(size.pageCount).toBe(100);
      expect(size.pageSize).toBe(4096);
      expect(size.sizeBytes).toBe(100 * 4096);
      expect(size.sizeMB).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // vacuum()
  // ---------------------------------------------------------
  describe('vacuum()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should return space reclaimed info', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        const respond = (err, rows) => {
          if (typeof params === 'function') params(err, rows);
          else cb(err, rows);
        };
        if (sql.includes('page_count')) {
          respond(null, [{ page_count: 100 }]);
        } else if (sql.includes('page_size')) {
          respond(null, [{ page_size: 4096 }]);
        } else {
          respond(null, []);
        }
      });
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 0 }, null);
      });

      const result = await adapter.vacuum();
      expect(result).toHaveProperty('sizeBefore');
      expect(result).toHaveProperty('sizeAfter');
      expect(result).toHaveProperty('spaceReclaimed');
    });
  });

  // ---------------------------------------------------------
  // analyze()
  // ---------------------------------------------------------
  describe('analyze()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should run ANALYZE without error', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 0 }, null);
      });
      await expect(adapter.analyze()).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------
  // integrityCheck()
  // ---------------------------------------------------------
  describe('integrityCheck()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should return true when integrity is ok', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        const respond = (err, rows) => {
          if (typeof params === 'function') params(err, rows);
          else cb(err, rows);
        };
        respond(null, [{ integrity_check: 'ok' }]);
      });
      const result = await adapter.integrityCheck();
      expect(result).toBe(true);
    });

    it('should return false when integrity check fails', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        const respond = (err, rows) => {
          if (typeof params === 'function') params(err, rows);
          else cb(err, rows);
        };
        respond(null, [{ integrity_check: 'corruption found' }]);
      });
      const result = await adapter.integrityCheck();
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // createIndex()
  // ---------------------------------------------------------
  describe('createIndex()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should create a non-unique index', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 0 }, null);
      });
      const result = await adapter.createIndex('idx_name', 'users', ['name']);
      expect(result.success).toBe(true);
      expect(result.indexName).toBe('idx_name');
      expect(result.tableName).toBe('users');
      expect(result.columns).toEqual(['name']);
    });

    it('should create a unique index', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 0 }, null);
      });
      const result = await adapter.createIndex('idx_email', 'users', ['email'], true);
      expect(result.success).toBe(true);
      expect(result.indexName).toBe('idx_email');
    });
  });

  // ---------------------------------------------------------
  // dropIndex()
  // ---------------------------------------------------------
  describe('dropIndex()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should drop an index', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 0 }, null);
      });
      const result = await adapter.dropIndex('idx_name');
      expect(result.success).toBe(true);
      expect(result.indexName).toBe('idx_name');
    });
  });

  // ---------------------------------------------------------
  // listIndexes()
  // ---------------------------------------------------------
  describe('listIndexes()', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should return list of indexes', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        const respond = (err, rows) => {
          if (typeof params === 'function') params(err, rows);
          else cb(err, rows);
        };
        respond(null, [
          { name: 'idx_users_name', tbl_name: 'users', sql: 'CREATE INDEX ...' },
          { name: 'idx_posts_title', tbl_name: 'posts', sql: 'CREATE INDEX ...' },
        ]);
      });
      const indexes = await adapter.listIndexes();
      expect(indexes).toHaveLength(2);
      expect(indexes[0].name).toBe('idx_users_name');
      expect(indexes[1].tbl_name).toBe('posts');
    });
  });

  // ---------------------------------------------------------
  // delete() without where clause
  // ---------------------------------------------------------
  describe('delete() - no where clause', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should delete all rows when no where clause given', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 5 }, null);
      });
      const result = await adapter.delete('users');
      expect(result.affectedRows).toBe(5);
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // update() without where clause
  // ---------------------------------------------------------
  describe('update() - no where clause', () => {
    beforeEach(async () => {
      mockSqliteDb.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') params(null, []);
        else cb(null, []);
      });
      await adapter.connect();
    });

    it('should update all rows when no where clause given', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, cb) => {
        cb.call({ changes: 10 }, null);
      });
      const result = await adapter.update('users', { active: false });
      expect(result.affectedRows).toBe(10);
      expect(result.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Branch Coverage Tests - MySQLAdapter
// ═══════════════════════════════════════════════════════════════════
describe('MySQLAdapter - branch coverage', () => {
  let adapter;

  beforeEach(() => {
    mockMysqlPool.execute.mockReset();
    mockMysqlPool.getConnection.mockReset().mockResolvedValue(mockMysqlConnection);
    mockMysqlPool.end.mockReset().mockResolvedValue(undefined);
    mockMysqlConnection.ping.mockReset().mockResolvedValue(undefined);
    mockMysqlConnection.release.mockReset();
    mockMysqlConnection.execute.mockReset();
    mockMysqlConnection.beginTransaction.mockReset().mockResolvedValue(undefined);
    mockMysqlConnection.commit.mockReset().mockResolvedValue(undefined);
    mockMysqlConnection.rollback.mockReset().mockResolvedValue(undefined);
  });

  describe('constructor - config fallback branches', () => {
    it('should use default host when config.host is falsy', () => {
      adapter = new MySQLAdapter({
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      expect(adapter.config.host).toBe('localhost');
    });

    it('should use default port when config.port is falsy', () => {
      adapter = new MySQLAdapter({
        host: 'myhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      expect(adapter.config.port).toBe(3306);
    });

    it('should use provided host and port when given', () => {
      adapter = new MySQLAdapter({
        host: 'myhost',
        port: 3307,
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      expect(adapter.config.host).toBe('myhost');
      expect(adapter.config.port).toBe(3307);
    });

    it('should use default pool settings when pool config is absent', () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      expect(adapter.config.connectionLimit).toBe(10);
      expect(adapter.config.acquireTimeout).toBe(60000);
      expect(adapter.config.timeout).toBe(60000);
    });

    it('should use provided pool settings', () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
        pool: { connectionLimit: 20, acquireTimeout: 5000, timeout: 5000 },
      });
      expect(adapter.config.connectionLimit).toBe(20);
      expect(adapter.config.acquireTimeout).toBe(5000);
      expect(adapter.config.timeout).toBe(5000);
    });
  });

  describe('connect() - pool exists but not connected', () => {
    it('should reuse existing pool when pool exists but connected is false', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      // Simulate pool exists but not connected
      adapter.pool = mockMysqlPool;
      adapter.connected = false;

      await adapter.connect();
      expect(adapter.connected).toBe(true);
      // Pool should not have been recreated - getConnection was called for ping test
      expect(mockMysqlPool.getConnection).toHaveBeenCalled();
    });
  });

  describe('connect() - error with pool cleanup failing', () => {
    it('should handle pool.end() failure during connection error cleanup', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      // Make getConnection fail after pool is created
      mockMysqlPool.getConnection.mockRejectedValue(new Error('conn failed'));
      mockMysqlPool.end.mockRejectedValue(new Error('end failed'));

      await expect(adapter.connect()).rejects.toThrow('MySQL connection failed: conn failed');
      expect(adapter.pool).toBeNull();
      expect(adapter.connected).toBe(false);
    });

    it('should handle error cleanup when pool is null', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      // Hack: make createPool throw so pool never gets assigned
      const mysql2 = require('mysql2/promise');
      mysql2.createPool.mockImplementationOnce(() => { throw new Error('pool create failed'); });

      await expect(adapter.connect()).rejects.toThrow('MySQL connection failed');
      expect(adapter.pool).toBeNull();
    });
  });

  describe('disconnect() - when pool is already null', () => {
    it('should handle disconnect when pool is null', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      // pool is null by default
      await adapter.disconnect();
      expect(adapter.connected).toBe(false);
      expect(adapter.connection).toBeNull();
    });
  });

  describe('query() - non-array rows (INSERT/UPDATE result)', () => {
    it('should use affectedRows when rows is not an array', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      await adapter.connect();
      // INSERT result: rows is an object with affectedRows, not an array
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 3, insertId: 0 }, undefined]);
      const result = await adapter.query('UPDATE users SET name = ?', ['Bob']);
      expect(result.rowCount).toBe(3);
    });

    it('should return null insertedId when rows is a primitive (not object)', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      await adapter.connect();
      // rows is a number (non-object) to hit the typeof check false branch
      mockMysqlPool.execute.mockResolvedValue([0, undefined]);
      const result = await adapter.query('SELECT 1');
      expect(result.insertedId).toBeNull();
    });
  });

  describe('update() - default whereParams and no whereClause', () => {
    it('should update without where clause', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      await adapter.connect();
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 10 }, undefined]);
      const result = await adapter.update('users', { active: true });
      expect(result.affectedRows).toBe(10);
      expect(result.success).toBe(true);
    });

    it('should use default whereParams when not provided', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      await adapter.connect();
      mockMysqlPool.execute.mockResolvedValue([{ affectedRows: 1 }, undefined]);
      const result = await adapter.update('users', { name: 'Bob' }, 'id = ?');
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('transaction - txAdapter query branch coverage', () => {
    it('should handle non-array rows in transaction query (INSERT result)', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      await adapter.connect();
      // Simulate INSERT result within transaction: rows is an object
      mockMysqlConnection.execute.mockResolvedValue([{ affectedRows: 1, insertId: 42 }, undefined]);
      const result = await adapter.transaction(async (tx) => {
        return await tx.query('INSERT INTO users (name) VALUES (?)', ['Alice']);
      });
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBe(42);
    });

    it('should return null insertedId when transaction rows has no insertId', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      await adapter.connect();
      // rows is an object but has no insertId
      mockMysqlConnection.execute.mockResolvedValue([{ affectedRows: 1 }, undefined]);
      const result = await adapter.transaction(async (tx) => {
        return await tx.query('DELETE FROM users WHERE id = ?', [1]);
      });
      expect(result.insertedId).toBeNull();
    });

    it('should handle primitive rows in transaction query (typeof check)', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      await adapter.connect();
      // rows is a number (non-object) to hit the typeof rows === 'object' false branch
      mockMysqlConnection.execute.mockResolvedValue([0, undefined]);
      const result = await adapter.transaction(async (tx) => {
        return await tx.query('SELECT 1');
      });
      expect(result.insertedId).toBeNull();
    });
  });

  describe('getTableInfo() - column with no extra field', () => {
    it('should handle column with null extra field', async () => {
      adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'testdb',
        user: 'root',
        password: 'pass',
      });
      await adapter.connect();
      mockMysqlPool.execute.mockResolvedValue([[
        { column_name: 'name', data_type: 'varchar', is_nullable: 'YES', column_default: null, extra: null },
      ], []]);
      const info = await adapter.getTableInfo('users');
      expect(info.columns[0].autoIncrement).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Branch Coverage Tests - PostgreSQLAdapter
// ═══════════════════════════════════════════════════════════════════
describe('PostgreSQLAdapter - branch coverage', () => {
  let adapter;

  beforeEach(() => {
    mockPgPool.query.mockReset();
    mockPgPool.connect.mockReset().mockResolvedValue(mockPgClient);
    mockPgPool.end.mockReset().mockResolvedValue(undefined);
    mockPgPool.on.mockReset();
    mockPgClient.release.mockReset();
    mockPgClient.query.mockReset();
  });

  describe('connect() - config fallback branches', () => {
    it('should use default host when config.host is falsy', async () => {
      adapter = new PostgreSQLAdapter({
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      // Must call connect() to trigger poolConfig construction with fallbacks
      await adapter.connect();
      expect(adapter.pool).not.toBeNull();
    });

    it('should use default port when config.port is falsy', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'myhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      expect(adapter.pool).not.toBeNull();
    });

    it('should use default max_connections, idle_timeout, connection_timeout', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      expect(adapter.pool).not.toBeNull();
    });
  });

  describe('connect() - error with pool cleanup', () => {
    it('should cleanup pool when pool exists but connect test fails', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      // Pool gets created (Pool constructor succeeds) but connect test fails
      mockPgPool.connect.mockRejectedValue(new Error('conn failed'));
      mockPgPool.end.mockResolvedValue(undefined);

      await expect(adapter.connect()).rejects.toThrow('PostgreSQL connection failed: conn failed');
      expect(adapter.connection).toBeNull();
      // pool.end() should have been called to clean up
      expect(mockPgPool.end).toHaveBeenCalled();
    });

    it('should handle pool.end() failure during connect error cleanup', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      mockPgPool.connect.mockRejectedValue(new Error('conn failed'));
      mockPgPool.end.mockRejectedValue(new Error('end failed'));

      await expect(adapter.connect()).rejects.toThrow('PostgreSQL connection failed: conn failed');
      expect(adapter.connection).toBeNull();
    });

    it('should handle error when Pool constructor throws (pool is null in catch)', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      // Make Pool constructor throw so this.pool is never assigned
      const pg = require('pg');
      pg.Pool.mockImplementationOnce(() => { throw new Error('Pool init failed'); });

      await expect(adapter.connect()).rejects.toThrow('PostgreSQL connection failed: Pool init failed');
      expect(adapter.pool).toBeNull();
      expect(adapter.connection).toBeNull();
    });
  });

  describe('query() - result with null rows and no numeric rowCount', () => {
    it('should use rows?.length fallback when result.rows is null/undefined', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      // result.rows is undefined, rowCount is not a number
      mockPgPool.query.mockResolvedValue({ rows: undefined, rowCount: undefined });
      const result = await adapter.query('SELECT 1');
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should use result.rowCount when it is a number', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 5 });
      const result = await adapter.query('UPDATE users SET name = $1', ['Bob']);
      expect(result.rowCount).toBe(5);
    });

    it('should log SQL without params when DATABASE_DEBUG is true and params empty', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      const orig = process.env.DATABASE_DEBUG;
      process.env.DATABASE_DEBUG = 'true';
      mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await adapter.query('SELECT 1');
      expect(console.log).toHaveBeenCalledWith('Executing SQL:', 'SELECT 1');
      if (orig === undefined) delete process.env.DATABASE_DEBUG;
      else process.env.DATABASE_DEBUG = orig;
    });
  });

  describe('insert() - empty result rows', () => {
    it('should return null insertedId and null insertedRow when no rows returned', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await adapter.insert('users', { name: 'Alice' });
      expect(result.insertedId).toBeNull();
      expect(result.insertedRow).toBeNull();
    });

    it('should return null insertedId when inserted row has no id field', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [{ name: 'Alice' }], rowCount: 1 });
      const result = await adapter.insert('users', { name: 'Alice' });
      expect(result.insertedId).toBeNull();
      expect(result.insertedRow).toEqual({ name: 'Alice' });
    });
  });

  describe('update() - default whereParams and non-string where', () => {
    it('should use default empty whereParams', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const result = await adapter.update('users', { name: 'Bob' }, 'id = $1');
      expect(result.rowsAffected).toBe(1);
    });

    it('should handle non-string where clause (skip replaceAll)', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      // Pass a non-string where (e.g. number) to hit the typeof check false branch
      const result = await adapter.update('users', { name: 'Bob' }, 123, []);
      expect(result.rowsAffected).toBe(0);
    });
  });

  describe('delete() - default whereParams', () => {
    it('should use default empty whereParams', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const result = await adapter.delete('users', 'id = $1');
      expect(result.rowsAffected).toBe(1);
    });
  });

  describe('transaction() - txAdapter query branch coverage', () => {
    it('should handle null rows and non-numeric rowCount in transaction query', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgClient.query.mockResolvedValue({ rows: undefined, rowCount: undefined });
      const result = await adapter.transaction(async (tx) => {
        return await tx.query('SELECT 1');
      });
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should use result.rowCount when it is a number in transaction', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgClient.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 3 });
      const result = await adapter.transaction(async (tx) => {
        return await tx.query('UPDATE users SET active = true');
      });
      expect(result.rowCount).toBe(3);
    });
  });

  describe('lastInsertId() - empty result rows', () => {
    it('should return null when no rows from lastval query', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const id = await adapter.lastInsertId();
      expect(id).toBeNull();
    });

    it('should return null when no rows from currval query', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const id = await adapter.lastInsertId('some_seq');
      expect(id).toBeNull();
    });
  });

  describe('getDatabaseInfo() - empty result rows', () => {
    it('should return Unknown when version/size queries return empty rows', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // version
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // db size
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // encoding
      const info = await adapter.getDatabaseInfo();
      expect(info.version).toBe('Unknown');
      expect(info.database_size).toBe('Unknown');
    });
  });

  describe('tableExists() - empty result rows', () => {
    it('should return false when no rows returned', async () => {
      adapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        password: 'pass',
      });
      await adapter.connect();
      mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const exists = await adapter.tableExists('nonexistent');
      expect(exists).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Branch Coverage Tests - SqlServerAdapter
// ═══════════════════════════════════════════════════════════════════
describe('SqlServerAdapter - branch coverage', () => {
  let adapter;

  beforeEach(() => {
    mockMssqlPool.connect.mockReset().mockResolvedValue(undefined);
    mockMssqlPool.close.mockReset().mockResolvedValue(undefined);
    mockMssqlPool.connected = true;
    mockMssqlPool.connecting = false;
    mockMssqlPool.request.mockReset().mockReturnValue(mockMssqlRequest);
    mockMssqlRequest.input.mockReset();
    mockMssqlRequest.query.mockReset();
    mockMssqlTransaction.begin.mockReset().mockResolvedValue(undefined);
    mockMssqlTransaction.commit.mockReset().mockResolvedValue(undefined);
    mockMssqlTransaction.rollback.mockReset().mockResolvedValue(undefined);
    mockMssqlTransaction.request.mockReset().mockReturnValue(mockMssqlRequest);
  });

  describe('constructor - default config arg and fallback branches', () => {
    it('should use default empty config when none provided', () => {
      adapter = new SqlServerAdapter();
      expect(adapter.config.server).toBe('localhost');
      expect(adapter.config.port).toBe(1433);
      expect(adapter.config.database).toBeUndefined();
    });

    it('should use provided server and port', () => {
      adapter = new SqlServerAdapter({
        server: 'myserver',
        port: 1434,
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      expect(adapter.config.server).toBe('myserver');
      expect(adapter.config.port).toBe(1434);
    });

    it('should set encrypt to false when explicitly provided', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
        options: { encrypt: false },
      });
      expect(adapter.config.options.encrypt).toBe(false);
    });

    it('should default encrypt to true', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      expect(adapter.config.options.encrypt).toBe(true);
    });

    it('should use default pool settings when not provided', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      expect(adapter.config.pool.max).toBe(10);
      expect(adapter.config.pool.min).toBe(0);
      expect(adapter.config.pool.idleTimeoutMillis).toBe(30000);
    });
  });

  describe('connect() - pool connecting/connected states', () => {
    it('should wait for connection when pool is connecting but not connected', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      // Simulate pool exists and is connecting
      adapter.pool = mockMssqlPool;
      mockMssqlPool.connecting = true;
      mockMssqlPool.connected = false;
      adapter.connected = false;

      await adapter.connect();
      expect(adapter.connected).toBe(true);
      expect(mockMssqlPool.connect).toHaveBeenCalled();
    });

    it('should skip connect when pool is connecting and already connected', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      // Pool is both connecting and connected (unusual but possible)
      adapter.pool = mockMssqlPool;
      mockMssqlPool.connecting = true;
      mockMssqlPool.connected = true;
      adapter.connected = false;

      await adapter.connect();
      expect(adapter.connected).toBe(true);
    });

    it('should create new pool when existing pool is neither connecting nor connected', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      // Simulate pool exists but in bad state (not connecting, not connected)
      adapter.pool = { connecting: false, connected: false };
      adapter.connected = false;

      await adapter.connect();
      expect(adapter.connected).toBe(true);
    });

    it('should handle error cleanup when pool.close() fails', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      mockMssqlPool.connect.mockRejectedValue(new Error('conn failed'));
      mockMssqlPool.close.mockRejectedValue(new Error('close failed'));

      await expect(adapter.connect()).rejects.toThrow('SQL Server connection failed: conn failed');
      expect(adapter.pool).toBeNull();
    });

    it('should handle error when pool is null during cleanup', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      // Make the constructor's pool creation succeed but connect fail,
      // then ensure pool is null before cleanup
      const mssql = require('mssql');
      mssql.ConnectionPool.mockImplementationOnce(() => {
        throw new Error('pool creation failed');
      });

      await expect(adapter.connect()).rejects.toThrow('SQL Server connection failed');
      expect(adapter.pool).toBeNull();
    });
  });

  describe('disconnect() - when pool is null', () => {
    it('should handle disconnect without pool', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      // pool is null by default
      await adapter.disconnect();
      expect(adapter.connected).toBe(false);
      expect(adapter.connection).toBeNull();
    });

    it('should throw on disconnect error', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlPool.close.mockRejectedValue(new Error('close failed'));
      await expect(adapter.disconnect()).rejects.toThrow('SQL Server disconnection failed: close failed');
    });
  });

  describe('_processPlaceholders() - edge cases', () => {
    it('should not replace invalid $0 or negative dollar placeholders', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      const { processedSql } = adapter._processPlaceholders('SELECT * FROM t WHERE a = $0');
      // $0 is <= 0, so it should be left as-is
      expect(processedSql).toContain('$0');
    });
  });

  describe('_bindParams() - edge cases', () => {
    it('should not bind when params is not an array', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      const request = { input: jest.fn() };
      adapter._bindParams(request, null, [], '$');
      expect(request.input).not.toHaveBeenCalled();
    });

    it('should not bind when params is empty array', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      const request = { input: jest.fn() };
      adapter._bindParams(request, [], [], '$');
      expect(request.input).not.toHaveBeenCalled();
    });

    it('should bind params in ? mode', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      const request = { input: jest.fn() };
      adapter._bindParams(request, ['val1', 'val2'], [0, 1], '?');
      expect(request.input).toHaveBeenCalledWith('param0', 'val1');
      expect(request.input).toHaveBeenCalledWith('param1', 'val2');
    });
  });

  describe('query() - result with null recordset and non-array rowsAffected', () => {
    it('should use empty array when recordset is null', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: null,
        rowsAffected: null,
      });
      const result = await adapter.query('DELETE FROM users');
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should use empty rowsAffected array fallback', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }],
        rowsAffected: [],
      });
      const result = await adapter.query('SELECT 1');
      expect(result.rowCount).toBe(0);
    });
  });

  describe('extractInsertedId() - fallback keys', () => {
    it('should extract Id (capitalized)', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      const result = { recordset: [{ Id: 99 }] };
      expect(adapter.extractInsertedId(result)).toBe(99);
    });

    it('should extract ID (uppercase)', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      const result = { recordset: [{ ID: 77 }] };
      expect(adapter.extractInsertedId(result)).toBe(77);
    });

    it('should return null when no matching keys', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      const result = { recordset: [{ name: 'Alice' }] };
      expect(adapter.extractInsertedId(result)).toBeNull();
    });

    it('should return null for null/undefined result', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      expect(adapter.extractInsertedId(null)).toBeNull();
      expect(adapter.extractInsertedId(undefined)).toBeNull();
      expect(adapter.extractInsertedId({})).toBeNull();
    });
  });

  describe('extractIdentityValue() - identity/Identity keys', () => {
    it('should extract identity key', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      expect(adapter.extractIdentityValue({ identity: 42 })).toBe(42);
    });

    it('should extract Identity key', () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      expect(adapter.extractIdentityValue({ Identity: 55 })).toBe(55);
    });
  });

  describe('insert() - empty result rows', () => {
    it('should handle empty rows from insert', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });
      const result = await adapter.insert('users', { name: 'Alice' });
      expect(result.insertedRecord).toEqual({});
      expect(result.insertedId).toBeNull();
      expect(result.success).toBe(false);
    });
  });

  describe('update() - no whereClause and default returnUpdated', () => {
    it('should update without where clause', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [5],
      });
      const result = await adapter.update('users', { active: true });
      expect(result.affectedRows).toBe(5);
      expect(result.updatedRecords).toBeNull();
    });

    it('should use default whereParams and returnUpdated', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [1],
      });
      const result = await adapter.update('users', { name: 'Bob' }, 'id = ?');
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('delete() - no whereClause and default returnDeleted', () => {
    it('should delete without where clause', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [10],
      });
      const result = await adapter.delete('users');
      expect(result.affectedRows).toBe(10);
      expect(result.deletedRecords).toBeNull();
    });

    it('should use default whereParams and returnDeleted', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [1],
      });
      const result = await adapter.delete('users', 'id = ?');
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('transaction() - txAdapter query branch coverage', () => {
    it('should handle null recordset and non-array rowsAffected in transaction', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: null,
        rowsAffected: null,
      });
      const result = await adapter.transaction(async (tx) => {
        return await tx.query('DELETE FROM users');
      });
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should handle empty rowsAffected array in transaction query', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }],
        rowsAffected: [],
      });
      const result = await adapter.transaction(async (tx) => {
        return await tx.query('SELECT 1');
      });
      expect(result.rowCount).toBe(0);
      expect(result.rows).toEqual([{ id: 1 }]);
    });

    it('should handle transaction rollback failure silently', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlTransaction.rollback.mockRejectedValue(new Error('rollback failed'));
      await expect(
        adapter.transaction(async () => { throw new Error('tx error'); })
      ).rejects.toThrow('tx error');
    });
  });

  describe('tableExists() - empty result rows', () => {
    it('should return false when no rows returned', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });
      const exists = await adapter.tableExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('selectTop()', () => {
    it('should return rows with limit', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }, { id: 2 }],
        rowsAffected: [2],
      });
      const rows = await adapter.selectTop('users', 2);
      expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should append WHERE clause when provided', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }],
        rowsAffected: [1],
      });
      const rows = await adapter.selectTop('users', 1, 'active = ?', [true]);
      expect(rows).toEqual([{ id: 1 }]);
    });

    it('should use default empty whereClause and whereParams', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }],
        rowsAffected: [1],
      });
      const rows = await adapter.selectTop('users', 5);
      expect(rows).toEqual([{ id: 1 }]);
    });
  });

  describe('getTableSize()', () => {
    it('should return table size info', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ TotalSpaceKB: 1024, UsedSpaceKB: 512, UnusedSpaceKB: 512 }],
        rowsAffected: [1],
      });
      const size = await adapter.getTableSize('users');
      expect(size.TotalSpaceKB).toBe(1024);
    });

    it('should return null when no rows', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });
      const size = await adapter.getTableSize('nonexistent');
      expect(size).toBeNull();
    });
  });

  describe('getNextIdentity()', () => {
    it('should return next identity value', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ next_id: 42 }],
        rowsAffected: [1],
      });
      const nextId = await adapter.getNextIdentity('users');
      expect(nextId).toBe(42);
    });

    it('should return 1 when no result', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ next_id: null }],
        rowsAffected: [1],
      });
      const nextId = await adapter.getNextIdentity('users');
      expect(nextId).toBe(1);
    });
  });

  describe('getVersion()', () => {
    it('should return version string', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ version: 'SQL Server 2019' }],
        rowsAffected: [1],
      });
      const version = await adapter.getVersion();
      expect(version).toBe('SQL Server 2019');
    });
  });

  describe('listTables()', () => {
    it('should return list of table names', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ table_name: 'users' }, { table_name: 'posts' }],
        rowsAffected: [2],
      });
      const tables = await adapter.listTables();
      expect(tables).toEqual(['users', 'posts']);
    });
  });

  describe('getTableInfo()', () => {
    it('should return table column info', async () => {
      adapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'testdb',
        user: 'sa',
        password: 'pass',
      });
      await adapter.connect();
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [
          { column_name: 'id', data_type: 'int', is_nullable: 'NO', column_default: null, is_identity: 1 },
          { column_name: 'name', data_type: 'nvarchar', is_nullable: 'YES', column_default: null, is_identity: 0 },
        ],
        rowsAffected: [2],
      });
      const info = await adapter.getTableInfo('users');
      expect(info.tableName).toBe('users');
      expect(info.columns).toHaveLength(2);
      expect(info.columns[0].identity).toBe(true);
      expect(info.columns[1].nullable).toBe(true);
    });
  });
});
