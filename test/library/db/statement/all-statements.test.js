const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const PostgreSQLStatement = require(path.join(projectRoot, 'library/db/statement/postgre-sql-statement'));
const MySQLStatement = require(path.join(projectRoot, 'library/db/statement/mysql-statement'));
const SQLiteStatement = require(path.join(projectRoot, 'library/db/statement/sqlite-statement'));

// Mock mssql before requiring SQLServerStatement (it does require('mssql') internally)
const mockMssqlRequest = {
  input: jest.fn(),
  query: jest.fn(),
  parameters: {},
};
jest.mock('mssql', () => ({
  Request: jest.fn().mockImplementation(() => mockMssqlRequest),
}), { virtual: true });

const SQLServerStatement = require(path.join(projectRoot, 'library/db/statement/sql-server-statement'));

// Suppress console output during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
  console.warn.mockRestore();
});

// ─── Helper: create a mock adapter with getParameterPlaceholder ───
function createMockAdapter(type, overrides = {}) {
  const base = {
    ensureConnected: jest.fn().mockResolvedValue(undefined),
    getParameterPlaceholder: jest.fn((i) => `$${i + 1}`),
  };

  if (type === 'postgres') {
    return {
      ...base,
      pool: {
        query: jest.fn(),
      },
      ...overrides,
    };
  }

  if (type === 'mysql') {
    const promiseObj = {
      prepare: jest.fn(),
      execute: jest.fn(),
    };
    return {
      ...base,
      getParameterPlaceholder: jest.fn(() => '?'),
      connection: {
        promise: jest.fn(() => promiseObj),
        _promise: promiseObj, // convenience ref for tests
      },
      ...overrides,
    };
  }

  if (type === 'sqlserver') {
    return {
      ...base,
      getParameterPlaceholder: jest.fn((i) => `@param${i}`),
      pool: {
        // pool.request() not used directly by statement; statement creates its own Request
      },
      ...overrides,
    };
  }

  if (type === 'sqlite') {
    return {
      ...base,
      getParameterPlaceholder: jest.fn(() => '?'),
      db: null, // set per test
      ...overrides,
    };
  }

  return { ...base, ...overrides };
}

// ═══════════════════════════════════════════════════════════════════
// PostgreSQLStatement
// ═══════════════════════════════════════════════════════════════════
describe('PostgreSQLStatement', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMockAdapter('postgres');
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      expect(stmt.adapter).toBe(adapter);
      expect(stmt.sql).toBe('SELECT 1');
      expect(stmt.result).toBeNull();
      expect(stmt.cursor).toBe(0);
      expect(stmt.preparedName).toBeNull();
    });
  });

  describe('_prepare()', () => {
    it('should call ensureConnected and set preparedName', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT $1');
      await stmt._prepare();
      expect(adapter.ensureConnected).toHaveBeenCalled();
      expect(stmt.preparedName).toBeTruthy();
    });

    it('should throw if pool is missing', async () => {
      adapter.pool = null;
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      await expect(stmt._prepare()).rejects.toThrow('Database not connected');
    });
  });

  describe('_execute()', () => {
    it('should execute query on pool and return standardized result', async () => {
      adapter.pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Alice' }],
        rowCount: 1,
      });
      const stmt = new PostgreSQLStatement(adapter, 'SELECT * FROM users WHERE id = $1');
      stmt.parameters = [1];
      const result = await stmt._execute();

      expect(adapter.pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result.rows).toEqual([{ id: 1, name: 'Alice' }]);
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBe(1);
    });

    it('should return insertedId null when no rows returned', async () => {
      adapter.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const stmt = new PostgreSQLStatement(adapter, 'DELETE FROM users WHERE id = $1');
      stmt.parameters = [99];
      const result = await stmt._execute();
      expect(result.insertedId).toBeNull();
      expect(result.rowCount).toBe(0);
    });

    it('should throw if pool is missing during execute', async () => {
      adapter.pool = null;
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      await expect(stmt._execute()).rejects.toThrow('Database not connected');
    });

    it('should wrap pool errors', async () => {
      adapter.pool.query.mockRejectedValue(new Error('connection reset'));
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      await expect(stmt._execute()).rejects.toThrow('PostgreSQL statement execution failed: connection reset');
    });
  });

  describe('fetch()', () => {
    it('should return rows one at a time via cursor', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [{ id: 1 }, { id: 2 }, { id: 3 }] };
      stmt.cursor = 0;

      expect(await stmt.fetch()).toEqual({ id: 1 });
      expect(await stmt.fetch()).toEqual({ id: 2 });
      expect(await stmt.fetch()).toEqual({ id: 3 });
      expect(await stmt.fetch()).toBeNull();
    });

    it('should return null if result is empty', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = null;
      expect(await stmt.fetch()).toBeNull();
    });
  });

  describe('fetchAll()', () => {
    it('should return remaining rows from cursor position', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [{ id: 1 }, { id: 2 }, { id: 3 }] };
      stmt.cursor = 1;

      const rows = await stmt.fetchAll();
      expect(rows).toEqual([{ id: 2 }, { id: 3 }]);
      expect(stmt.cursor).toBe(3);
    });

    it('should return empty array if result is null', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = null;
      expect(await stmt.fetchAll()).toEqual([]);
    });
  });

  describe('fetchColumn()', () => {
    it('should return value at given column index', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [{ name: 'Alice', age: 30 }] };
      stmt.cursor = 0;
      expect(await stmt.fetchColumn(1)).toBe(30);
    });

    it('should return first column by default', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [{ name: 'Alice', age: 30 }] };
      stmt.cursor = 0;
      expect(await stmt.fetchColumn()).toBe('Alice');
    });

    it('should return null when no rows remain', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [] };
      stmt.cursor = 0;
      expect(await stmt.fetchColumn()).toBeNull();
    });

    it('should handle array row for fetchColumn', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [['Alice', 30, true]] };
      stmt.cursor = 0;
      expect(await stmt.fetchColumn(1)).toBe(30);
    });

    it('should return primitive row directly for fetchColumn', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [42] };
      stmt.cursor = 0;
      expect(await stmt.fetchColumn()).toBe(42);
    });
  });

  describe('rowCount()', () => {
    it('should return rowCount from result', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'UPDATE t SET x=1');
      stmt.result = { rowCount: 5, rows: [] };
      expect(await stmt.rowCount()).toBe(5);
    });

    it('should fall back to rows length', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [{ id: 1 }, { id: 2 }] };
      expect(await stmt.rowCount()).toBe(2);
    });

    it('should return 0 if no result', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = null;
      expect(await stmt.rowCount()).toBe(0);
    });
  });

  describe('lastInsertId()', () => {
    it('should extract id from first row', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'INSERT INTO t RETURNING id');
      stmt.result = { rows: [{ id: 42 }] };
      expect(await stmt.lastInsertId()).toBe(42);
    });

    it('should return null when no rows', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'DELETE FROM t');
      stmt.result = { rows: [] };
      expect(await stmt.lastInsertId()).toBeNull();
    });
  });

  describe('_close()', () => {
    it('should reset all state', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [{ id: 1 }] };
      stmt.cursor = 5;
      stmt.preparedName = 'stmt_123';
      await stmt._close();
      expect(stmt.result).toBeNull();
      expect(stmt.cursor).toBe(0);
      expect(stmt.preparedName).toBeNull();
    });
  });

  describe('_formatSingleRow()', () => {
    it('should return object by default', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      const row = { id: 1, name: 'Alice' };
      expect(stmt._formatSingleRow(row)).toEqual({ id: 1, name: 'Alice' });
    });

    it('should return array in array mode', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      expect(stmt._formatSingleRow({ id: 1, name: 'Alice' })).toEqual([1, 'Alice']);
    });

    it('should return first value in column mode', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      expect(stmt._formatSingleRow({ id: 1, name: 'Alice' })).toBe(1);
    });

    it('should return null for null row', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      expect(stmt._formatSingleRow(null)).toBeNull();
    });
  });

  describe('_extractInsertedIdFromRows()', () => {
    it('should detect various id key names', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedIdFromRows([{ file_id: 7 }])).toBe(7);
      expect(stmt._extractInsertedIdFromRows([{ folder_id: 3 }])).toBe(3);
      expect(stmt._extractInsertedIdFromRows([{ user_id: 10 }])).toBe(10);
      expect(stmt._extractInsertedIdFromRows([{ event_id: 99 }])).toBe(99);
      expect(stmt._extractInsertedIdFromRows([{ tenant_id: 5 }])).toBe(5);
      expect(stmt._extractInsertedIdFromRows([{ ID: 88 }])).toBe(88);
    });

    it('should return null for empty or invalid rows', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedIdFromRows([])).toBeNull();
      expect(stmt._extractInsertedIdFromRows(null)).toBeNull();
      expect(stmt._extractInsertedIdFromRows([null])).toBeNull();
      expect(stmt._extractInsertedIdFromRows(['not-object'])).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// MySQLStatement
// ═══════════════════════════════════════════════════════════════════
describe('MySQLStatement', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMockAdapter('mysql');
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      expect(stmt.preparedStatement).toBeNull();
      expect(stmt.result).toBeNull();
      expect(stmt.cursor).toBe(0);
    });
  });

  describe('_normalizeExecutionResult()', () => {
    it('should handle SELECT result (array of rows)', () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      const result = stmt._normalizeExecutionResult([{ id: 1 }, { id: 2 }]);
      expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.rowCount).toBe(2);
      expect(result.insertedId).toBeNull();
    });

    it('should handle INSERT result (OkPacket)', () => {
      const stmt = new MySQLStatement(adapter, 'INSERT INTO t');
      const result = stmt._normalizeExecutionResult({ affectedRows: 1, insertId: 42 });
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBe(42);
    });

    it('should handle null/undefined result', () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      const result = stmt._normalizeExecutionResult(null);
      expect(result).toEqual({ rows: [], rowCount: 0, insertedId: null });
    });

    it('should handle formattedRows not being array (lines 32-33)', () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      // _formatResult returns non-array when input is not array
      jest.spyOn(stmt, '_formatResult').mockReturnValue('not-an-array');
      const result = stmt._normalizeExecutionResult([{ id: 1 }]);
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
      stmt._formatResult.mockRestore();
    });

    it('should handle OkPacket with zero affectedRows and zero insertId (lines 42-43)', () => {
      const stmt = new MySQLStatement(adapter, 'DELETE FROM t');
      const result = stmt._normalizeExecutionResult({ affectedRows: 0, insertId: 0 });
      expect(result.rowCount).toBe(0);
      expect(result.insertedId).toBeNull();
    });
  });

  describe('_prepare()', () => {
    it('should call ensureConnected and prepare on connection', async () => {
      const mockPrepared = { execute: jest.fn(), close: jest.fn() };
      adapter.connection._promise.prepare.mockResolvedValue(mockPrepared);

      const stmt = new MySQLStatement(adapter, 'SELECT ?');
      await stmt._prepare();

      expect(adapter.ensureConnected).toHaveBeenCalled();
      expect(adapter.connection._promise.prepare).toHaveBeenCalledWith('SELECT ?');
      expect(stmt.preparedStatement).toBe(mockPrepared);
    });

    it('should throw if connection is missing and no ensureConnected', async () => {
      const noConnAdapter = {
        getParameterPlaceholder: jest.fn(() => '?'),
        connection: null,
      };
      const stmt = new MySQLStatement(noConnAdapter, 'SELECT 1');
      await expect(stmt._prepare()).rejects.toThrow('Database not connected');
    });

    it('should wrap preparation errors', async () => {
      adapter.connection._promise.prepare.mockRejectedValue(new Error('syntax error'));
      const stmt = new MySQLStatement(adapter, 'INVALID SQL');
      await expect(stmt._prepare()).rejects.toThrow('MySQL statement preparation failed: syntax error');
    });

    it('should skip ensureConnected when adapter lacks it but has connection (line 58)', async () => {
      const promiseObj = { prepare: jest.fn(), execute: jest.fn() };
      const mockPrepared = { execute: jest.fn(), close: jest.fn() };
      promiseObj.prepare.mockResolvedValue(mockPrepared);
      const adapterNoEnsure = {
        getParameterPlaceholder: jest.fn(() => '?'),
        connection: {
          promise: jest.fn(() => promiseObj),
          _promise: promiseObj,
        },
      };
      const stmt = new MySQLStatement(adapterNoEnsure, 'SELECT ?');
      await stmt._prepare();
      expect(stmt.preparedStatement).toBe(mockPrepared);
    });
  });

  describe('_execute()', () => {
    it('should execute via prepared statement when available', async () => {
      const mockPrepared = {
        execute: jest.fn().mockResolvedValue([[{ id: 1 }]]),
        close: jest.fn(),
      };
      adapter.connection._promise.prepare.mockResolvedValue(mockPrepared);

      const stmt = new MySQLStatement(adapter, 'SELECT * FROM users WHERE id = ?');
      stmt.preparedStatement = mockPrepared;
      stmt.parameters = [1];
      // must set prepared=true for execute() to skip prepare()
      stmt.prepared = true;

      const result = await stmt._execute();

      expect(mockPrepared.execute).toHaveBeenCalledWith([1]);
      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
    });

    it('should fall back to direct execution when no prepared statement', async () => {
      adapter.connection._promise.execute.mockResolvedValue([[{ id: 2 }]]);

      const stmt = new MySQLStatement(adapter, 'SELECT * FROM users');
      stmt.preparedStatement = null;
      stmt.parameters = [];

      const result = await stmt._execute();

      expect(adapter.connection._promise.execute).toHaveBeenCalledWith('SELECT * FROM users', []);
      expect(result.rows).toEqual([{ id: 2 }]);
    });

    it('should handle write results (OkPacket)', async () => {
      adapter.connection._promise.execute.mockResolvedValue([{ affectedRows: 1, insertId: 10 }]);

      const stmt = new MySQLStatement(adapter, 'INSERT INTO t (name) VALUES (?)');
      stmt.preparedStatement = null;
      stmt.parameters = ['Alice'];

      const result = await stmt._execute();
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBe(10);
    });

    it('should throw if connection missing and no ensureConnected', async () => {
      const noConnAdapter = {
        getParameterPlaceholder: jest.fn(() => '?'),
        connection: null,
      };
      const stmt = new MySQLStatement(noConnAdapter, 'SELECT 1');
      stmt.prepared = true;
      await expect(stmt._execute()).rejects.toThrow('Database not connected');
    });

    it('should wrap execution errors', async () => {
      adapter.connection._promise.execute.mockRejectedValue(new Error('deadlock'));
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.preparedStatement = null;
      stmt.parameters = [];
      await expect(stmt._execute()).rejects.toThrow('MySQL statement execution failed: deadlock');
    });

    it('should skip ensureConnected when adapter lacks it but has connection (line 81)', async () => {
      const promiseObj = { prepare: jest.fn(), execute: jest.fn() };
      promiseObj.execute.mockResolvedValue([[{ id: 3 }]]);
      const adapterNoEnsure = {
        getParameterPlaceholder: jest.fn(() => '?'),
        connection: {
          promise: jest.fn(() => promiseObj),
          _promise: promiseObj,
        },
      };
      const stmt = new MySQLStatement(adapterNoEnsure, 'SELECT * FROM t');
      stmt.preparedStatement = null;
      stmt.parameters = [];
      const result = await stmt._execute();
      expect(result.rows).toEqual([{ id: 3 }]);
    });
  });

  describe('fetch()', () => {
    it('should return rows one at a time', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.result = [{ id: 1 }, { id: 2 }];
      stmt.cursor = 0;

      expect(await stmt.fetch()).toEqual({ id: 1 });
      expect(await stmt.fetch()).toEqual({ id: 2 });
      expect(await stmt.fetch()).toBeNull();
    });

    it('should return null if result is not an array', async () => {
      const stmt = new MySQLStatement(adapter, 'INSERT');
      stmt.result = { affectedRows: 1 };
      expect(await stmt.fetch()).toBeNull();
    });

    it('should return null if result is null', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.result = null;
      expect(await stmt.fetch()).toBeNull();
    });
  });

  describe('fetchAll()', () => {
    it('should return remaining rows', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.result = [{ id: 1 }, { id: 2 }, { id: 3 }];
      stmt.cursor = 1;
      expect(await stmt.fetchAll()).toEqual([{ id: 2 }, { id: 3 }]);
    });

    it('should return empty array for non-array result', async () => {
      const stmt = new MySQLStatement(adapter, 'INSERT');
      stmt.result = { affectedRows: 1 };
      expect(await stmt.fetchAll()).toEqual([]);
    });
  });

  describe('fetchColumn()', () => {
    it('should return column at given index', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.result = [{ name: 'Alice', age: 30 }];
      stmt.cursor = 0;
      expect(await stmt.fetchColumn(1)).toBe(30);
    });

    it('should return null if no rows left', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.result = [];
      stmt.cursor = 0;
      expect(await stmt.fetchColumn()).toBeNull();
    });

    it('should handle array row for fetchColumn (line 147)', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      stmt.result = [{ a: 'Alice', b: 30, c: true }];
      stmt.cursor = 0;
      // _formatSingleRow in array mode returns Object.values -> ['Alice', 30, true]
      expect(await stmt.fetchColumn(1)).toBe(30);
    });

    it('should return primitive row directly for fetchColumn (line 153)', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      stmt.result = [{ val: 42 }];
      stmt.cursor = 0;
      // _formatSingleRow in column mode returns first value -> 42 (primitive)
      expect(await stmt.fetchColumn()).toBe(42);
    });

    it('should return null when array row element is undefined (line 147 ?? branch)', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      stmt.result = [{ a: 'Alice' }];
      stmt.cursor = 0;
      // array mode -> ['Alice'], index 5 is undefined -> ?? null
      expect(await stmt.fetchColumn(5)).toBeNull();
    });

    it('should return null when object row column is undefined (line 150 ?? branch)', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.result = [{ name: 'Alice' }];
      stmt.cursor = 0;
      // object mode, index 5 is out of bounds -> ?? null
      expect(await stmt.fetchColumn(5)).toBeNull();
    });
  });

  describe('rowCount()', () => {
    it('should return affectedRows for write result', async () => {
      const stmt = new MySQLStatement(adapter, 'UPDATE t');
      stmt.result = { affectedRows: 3 };
      expect(await stmt.rowCount()).toBe(3);
    });

    it('should return array length for SELECT result', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT');
      stmt.result = [{ id: 1 }, { id: 2 }];
      expect(await stmt.rowCount()).toBe(2);
    });

    it('should return 0 for null result', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT');
      stmt.result = null;
      expect(await stmt.rowCount()).toBe(0);
    });

    it('should return 0 when affectedRows is 0 (line 161)', async () => {
      const stmt = new MySQLStatement(adapter, 'DELETE FROM t');
      stmt.result = { affectedRows: 0 };
      expect(await stmt.rowCount()).toBe(0);
    });
  });

  describe('lastInsertId()', () => {
    it('should return insertId from OkPacket', async () => {
      const stmt = new MySQLStatement(adapter, 'INSERT');
      stmt.result = { insertId: 42, affectedRows: 1 };
      expect(await stmt.lastInsertId()).toBe(42);
    });

    it('should return null for SELECT result', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT');
      stmt.result = [{ id: 1 }];
      expect(await stmt.lastInsertId()).toBeNull();
    });

    it('should return null for null result', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT');
      stmt.result = null;
      expect(await stmt.lastInsertId()).toBeNull();
    });

    it('should return null when insertId is 0 (line 171)', async () => {
      const stmt = new MySQLStatement(adapter, 'INSERT');
      stmt.result = { insertId: 0, affectedRows: 1 };
      expect(await stmt.lastInsertId()).toBeNull();
    });
  });

  describe('_close()', () => {
    it('should close prepared statement and reset state', async () => {
      const mockPrepared = { close: jest.fn().mockResolvedValue(undefined) };
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.preparedStatement = mockPrepared;
      stmt.result = [{ id: 1 }];
      stmt.cursor = 5;

      await stmt._close();

      expect(mockPrepared.close).toHaveBeenCalled();
      expect(stmt.preparedStatement).toBeNull();
      expect(stmt.result).toBeNull();
      expect(stmt.cursor).toBe(0);
    });

    it('should handle close errors gracefully', async () => {
      const mockPrepared = { close: jest.fn().mockRejectedValue(new Error('close error')) };
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.preparedStatement = mockPrepared;

      // Should not throw
      await stmt._close();
      expect(stmt.result).toBeNull();
    });

    it('should handle no prepared statement', async () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.preparedStatement = null;
      await stmt._close();
      expect(stmt.result).toBeNull();
    });
  });

  describe('_formatSingleRow()', () => {
    it('should return object by default', () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      expect(stmt._formatSingleRow({ id: 1 })).toEqual({ id: 1 });
    });

    it('should return array in array mode', () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      expect(stmt._formatSingleRow({ a: 1, b: 2 })).toEqual([1, 2]);
    });

    it('should return first value in column mode', () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      expect(stmt._formatSingleRow({ a: 1, b: 2 })).toBe(1);
    });

    it('should return null for null row', () => {
      const stmt = new MySQLStatement(adapter, 'SELECT 1');
      expect(stmt._formatSingleRow(null)).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SQLServerStatement
// ═══════════════════════════════════════════════════════════════════
describe('SQLServerStatement', () => {
  let adapter;

  beforeEach(() => {
    // Reset mock state for each test
    mockMssqlRequest.input.mockClear();
    mockMssqlRequest.query.mockClear();
    mockMssqlRequest.parameters = {};

    adapter = createMockAdapter('sqlserver');
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt.request).toBeNull();
      expect(stmt.result).toBeNull();
      expect(stmt.cursor).toBe(0);
      expect(stmt._processedSql).toBeNull();
    });
  });

  describe('_prepare()', () => {
    it('should call ensureConnected and create a request', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT @param0');
      await stmt._prepare();

      expect(adapter.ensureConnected).toHaveBeenCalled();
      expect(stmt.request).not.toBeNull();
    });

    it('should throw if pool is missing', async () => {
      adapter.pool = null;
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      await expect(stmt._prepare()).rejects.toThrow('Database not connected');
    });

    it('should throw wrapped error when Request construction fails (line 48)', async () => {
      // Make mssql Request throw
      const mssql = require('mssql');
      const origRequest = mssql.Request;
      mssql.Request = function() { throw new Error('mssql init fail'); };
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      await expect(stmt._prepare()).rejects.toThrow('statement preparation failed: mssql init fail');
      mssql.Request = origRequest;
    });
  });

  describe('_execute()', () => {
    it('should execute query and return standardized result', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1, name: 'Alice' }],
        rowsAffected: [1],
      });

      const stmt = new SQLServerStatement(adapter, 'SELECT * FROM users WHERE id = ?');
      stmt.request = mockMssqlRequest;
      stmt.parameters = [1];
      stmt.prepared = true;

      const result = await stmt._execute();

      expect(result.rows).toEqual([{ id: 1, name: 'Alice' }]);
      expect(result.rowCount).toBe(1);
    });

    it('should handle empty result', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });

      const stmt = new SQLServerStatement(adapter, 'SELECT * FROM users WHERE id = ?');
      stmt.request = mockMssqlRequest;
      stmt.parameters = [];
      stmt.prepared = true;

      const result = await stmt._execute();
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
      expect(result.insertedId).toBeNull();
    });

    it('should throw if pool is missing during execute', async () => {
      adapter.pool = null;
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.prepared = true;
      await expect(stmt._execute()).rejects.toThrow('Database not connected');
    });

    it('should wrap execution errors', async () => {
      mockMssqlRequest.query.mockRejectedValue(new Error('timeout'));
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.request = mockMssqlRequest;
      stmt.parameters = [];
      stmt.prepared = true;
      await expect(stmt._execute()).rejects.toThrow('SQL Server statement execution failed: timeout');
    });

    it('should create a request if none exists', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 5 }],
        rowsAffected: [1],
      });

      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.request = null;
      stmt.parameters = [];
      stmt.prepared = true;

      const result = await stmt._execute();
      expect(result.rows).toEqual([{ id: 5 }]);
    });
  });

  describe('fetch()', () => {
    it('should return rows one at a time', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.result = { recordset: [{ id: 1 }, { id: 2 }] };
      stmt.cursor = 0;

      expect(await stmt.fetch()).toEqual({ id: 1 });
      expect(await stmt.fetch()).toEqual({ id: 2 });
      expect(await stmt.fetch()).toBeNull();
    });

    it('should return null if result is empty', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.result = null;
      expect(await stmt.fetch()).toBeNull();
    });
  });

  describe('fetchAll()', () => {
    it('should return remaining rows', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.result = { recordset: [{ id: 1 }, { id: 2 }, { id: 3 }] };
      stmt.cursor = 1;

      expect(await stmt.fetchAll()).toEqual([{ id: 2 }, { id: 3 }]);
    });

    it('should return empty array if no recordset', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.result = {};
      expect(await stmt.fetchAll()).toEqual([]);
    });
  });

  describe('fetchColumn()', () => {
    it('should return value at column index', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.result = { recordset: [{ name: 'Bob', age: 25 }] };
      stmt.cursor = 0;
      expect(await stmt.fetchColumn(1)).toBe(25);
    });

    it('should return null when no rows remain', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.result = { recordset: [] };
      expect(await stmt.fetchColumn()).toBeNull();
    });

    it('should handle array row for fetchColumn (line 139)', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      stmt.result = { recordset: [{ a: 'Alice', b: 30, c: true }] };
      stmt.cursor = 0;
      // _formatSingleRow in array mode returns Object.values -> [Alice, 30, true]
      expect(await stmt.fetchColumn(1)).toBe(30);
    });

    it('should return primitive row directly for fetchColumn (line 145)', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      stmt.result = { recordset: [{ val: 42 }] };
      stmt.cursor = 0;
      // _formatSingleRow in column mode returns first value -> 42 (primitive)
      expect(await stmt.fetchColumn()).toBe(42);
    });
  });

  describe('rowCount()', () => {
    it('should return rowsAffected', async () => {
      const stmt = new SQLServerStatement(adapter, 'UPDATE t');
      stmt.result = { rowsAffected: [3] };
      expect(await stmt.rowCount()).toBe(3);
    });

    it('should fall back to recordset length', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT');
      stmt.result = { recordset: [{ id: 1 }, { id: 2 }] };
      expect(await stmt.rowCount()).toBe(2);
    });

    it('should return 0 for null result', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT');
      stmt.result = null;
      expect(await stmt.rowCount()).toBe(0);
    });

    it('should return 0 when rowsAffected[0] is 0 (line 152 || branch)', async () => {
      const stmt = new SQLServerStatement(adapter, 'DELETE FROM t');
      stmt.result = { rowsAffected: [0] };
      expect(await stmt.rowCount()).toBe(0);
    });
  });

  describe('lastInsertId()', () => {
    it('should extract InsertedId from recordset', async () => {
      const stmt = new SQLServerStatement(adapter, 'INSERT');
      stmt.result = { recordset: [{ InsertedId: 99 }] };
      expect(await stmt.lastInsertId()).toBe(99);
    });

    it('should fall back to id key', async () => {
      const stmt = new SQLServerStatement(adapter, 'INSERT');
      stmt.result = { recordset: [{ id: 77 }] };
      expect(await stmt.lastInsertId()).toBe(77);
    });

    it('should return null for empty recordset', async () => {
      const stmt = new SQLServerStatement(adapter, 'DELETE');
      stmt.result = { recordset: [] };
      expect(await stmt.lastInsertId()).toBeNull();
    });
  });

  describe('_close()', () => {
    it('should reset all state', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.request = mockMssqlRequest;
      stmt.result = { recordset: [] };
      stmt.cursor = 5;
      stmt._processedSql = 'SELECT 1';

      await stmt._close();

      expect(stmt.request).toBeNull();
      expect(stmt.result).toBeNull();
      expect(stmt.cursor).toBe(0);
      expect(stmt._processedSql).toBeNull();
    });
  });

  describe('_processPlaceholders()', () => {
    it('should convert $1 style to @param0 style', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      const { processedSql } = stmt._processPlaceholders('SELECT * FROM t WHERE a = $1 AND b = $2');
      expect(processedSql).toBe('SELECT * FROM t WHERE a = @param0 AND b = @param1');
    });

    it('should convert ? style to @param0 style', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      const { processedSql } = stmt._processPlaceholders('SELECT * FROM t WHERE a = ? AND b = ?');
      expect(processedSql).toBe('SELECT * FROM t WHERE a = @param0 AND b = @param1');
    });

    it('should handle SQL with no placeholders', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      const { processedSql } = stmt._processPlaceholders('SELECT 1');
      expect(processedSql).toBe('SELECT 1');
    });
  });

  describe('_bindParams()', () => {
    it('should bind parameters to request with param names', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      const req = { input: jest.fn() };
      stmt._bindParams(req, ['Alice', 30]);

      expect(req.input).toHaveBeenCalledWith('param0', 'Alice');
      expect(req.input).toHaveBeenCalledWith('param1', 30);
    });

    it('should handle empty params', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      const req = { input: jest.fn() };
      stmt._bindParams(req, []);
      expect(req.input).not.toHaveBeenCalled();
    });

    it('should handle non-array params', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      const req = { input: jest.fn() };
      stmt._bindParams(req, null);
      expect(req.input).not.toHaveBeenCalled();
    });
  });

  describe('_extractInsertedId()', () => {
    it('should detect various id key names', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId([{ InsertedId: 1 }])).toBe(1);
      expect(stmt._extractInsertedId([{ insertedId: 2 }])).toBe(2);
      expect(stmt._extractInsertedId([{ id: 3 }])).toBe(3);
      expect(stmt._extractInsertedId([{ file_id: 4 }])).toBe(4);
      expect(stmt._extractInsertedId([{ folder_id: 5 }])).toBe(5);
    });

    it('should return null for empty or invalid rows', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId([])).toBeNull();
      expect(stmt._extractInsertedId(null)).toBeNull();
      expect(stmt._extractInsertedId([null])).toBeNull();
    });
  });

  describe('_formatSingleRow()', () => {
    it('should return object by default', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._formatSingleRow({ id: 1 })).toEqual({ id: 1 });
    });

    it('should return array in array mode', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      expect(stmt._formatSingleRow({ a: 1, b: 2 })).toEqual([1, 2]);
    });

    it('should return first value in column mode', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      expect(stmt._formatSingleRow({ a: 10, b: 20 })).toBe(10);
    });

    it('should return null for null', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._formatSingleRow(null)).toBeNull();
    });
  });

  describe('branch coverage: _prepare() without ensureConnected (line 28)', () => {
    it('should skip ensureConnected when adapter lacks it', async () => {
      const adapterNoEnsure = {
        getParameterPlaceholder: jest.fn((i) => `@param${i}`),
        pool: {},
      };
      const stmt = new SQLServerStatement(adapterNoEnsure, 'SELECT 1');
      await stmt._prepare();
      expect(stmt.request).not.toBeNull();
    });
  });

  describe('branch coverage: _execute() without ensureConnected (line 59)', () => {
    it('should skip ensureConnected when adapter lacks it', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }],
        rowsAffected: [1],
      });
      const adapterNoEnsure = {
        getParameterPlaceholder: jest.fn((i) => `@param${i}`),
        pool: {},
      };
      const stmt = new SQLServerStatement(adapterNoEnsure, 'SELECT 1');
      stmt.request = mockMssqlRequest;
      stmt.parameters = [];
      stmt.prepared = true;
      const result = await stmt._execute();
      expect(result.rows).toEqual([{ id: 1 }]);
    });
  });

  describe('branch coverage: _execute() with non-array recordset/rowsAffected (lines 90-91)', () => {
    it('should handle missing recordset (not an array)', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: undefined,
        rowsAffected: undefined,
      });
      const stmt = new SQLServerStatement(adapter, 'INSERT INTO t VALUES (?)');
      stmt.request = mockMssqlRequest;
      stmt.parameters = [];
      stmt.prepared = true;
      const result = await stmt._execute();
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should use rows.length when rowsAffected is not an array', async () => {
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1 }, { id: 2 }],
        rowsAffected: null,
      });
      const stmt = new SQLServerStatement(adapter, 'SELECT * FROM t');
      stmt.request = mockMssqlRequest;
      stmt.parameters = [];
      stmt.prepared = true;
      const result = await stmt._execute();
      expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.rowCount).toBe(2);
    });
  });

  describe('branch coverage: fetchColumn with array row (line 139)', () => {
    it('should return value at index when fetch returns array row', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      stmt.result = { recordset: [{ a: 'Bob', b: 25, c: false }] };
      stmt.cursor = 0;
      // array mode -> Object.values -> ['Bob', 25, false]
      const val = await stmt.fetchColumn(1);
      expect(val).toBe(25);
    });

    it('should return null when array row element is undefined (line 139 ?? branch)', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      stmt.result = { recordset: [{ a: 'Bob' }] };
      stmt.cursor = 0;
      // array mode -> ['Bob'], index 5 is undefined -> ?? null
      expect(await stmt.fetchColumn(5)).toBeNull();
    });
  });

  describe('branch coverage: fetchColumn returns primitive (line 145)', () => {
    it('should return primitive value directly when row is not object/array', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      stmt.result = { recordset: [{ val: 99 }] };
      stmt.cursor = 0;
      // column mode -> first value -> 99 (primitive)
      const val = await stmt.fetchColumn();
      expect(val).toBe(99);
    });
  });

  describe('branch coverage: fetchColumn object ?? branch (line 142)', () => {
    it('should return null when object row column is out of bounds', async () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      stmt.result = { recordset: [{ name: 'Alice' }] };
      stmt.cursor = 0;
      // object mode, index 5 is out of bounds -> ?? null
      expect(await stmt.fetchColumn(5)).toBeNull();
    });
  });

  describe('branch coverage: lastInsertId with no recordset (line 161)', () => {
    it('should return null when result has no recordset', async () => {
      const stmt = new SQLServerStatement(adapter, 'DELETE FROM t');
      stmt.result = {};
      expect(await stmt.lastInsertId()).toBeNull();
    });

    it('should return null when result is null', async () => {
      const stmt = new SQLServerStatement(adapter, 'DELETE FROM t');
      stmt.result = null;
      expect(await stmt.lastInsertId()).toBeNull();
    });
  });

  describe('branch coverage: _processPlaceholders with invalid $n (line 201)', () => {
    it('should leave invalid $0 placeholder as-is', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      const { processedSql } = stmt._processPlaceholders('SELECT * FROM t WHERE a = $0');
      expect(processedSql).toBe('SELECT * FROM t WHERE a = $0');
    });
  });

  describe('branch coverage: _extractInsertedId with non-object first row (line 225)', () => {
    it('should return null when first row is a primitive string', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId(['not-an-object'])).toBeNull();
    });

    it('should return null when first row is a number', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId([42])).toBeNull();
    });

    it('should detect user_id key', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId([{ user_id: 10 }])).toBe(10);
    });

    it('should detect event_id key', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId([{ event_id: 20 }])).toBe(20);
    });

    it('should detect tenant_id key', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId([{ tenant_id: 30 }])).toBe(30);
    });

    it('should detect ID key', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId([{ ID: 40 }])).toBe(40);
    });

    it('should return null when row has no recognized id key (full ?? chain fallthrough)', () => {
      const stmt = new SQLServerStatement(adapter, 'SELECT 1');
      expect(stmt._extractInsertedId([{ unrelated_column: 'value' }])).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SQLiteStatement
// ═══════════════════════════════════════════════════════════════════
describe('SQLiteStatement', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMockAdapter('sqlite');
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      expect(stmt.preparedStatement).toBeNull();
      expect(stmt.result).toBeNull();
      expect(stmt.cursor).toBe(0);
      expect(stmt.isSelect).toBe(false);
      expect(stmt._lastRowCount).toBe(0);
      expect(stmt._lastInsertedId).toBeNull();
      expect(stmt._processedSql).toBeNull();
      expect(stmt._processedParams).toBeNull();
    });
  });

  describe('_getDbHandle()', () => {
    it('should return adapter.db', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      adapter.db = { fake: 'db' };
      expect(stmt._getDbHandle()).toBe(adapter.db);
    });

    it('should fall back to adapter.database', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      adapter.db = null;
      adapter.database = { fake: 'database' };
      expect(stmt._getDbHandle()).toBe(adapter.database);
    });

    it('should fall back to adapter.connection', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      adapter.db = null;
      adapter.database = null;
      adapter.connection = { fake: 'conn' };
      expect(stmt._getDbHandle()).toBe(adapter.connection);
    });

    it('should return null if nothing available', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      adapter.db = null;
      adapter.database = null;
      adapter.connection = null;
      expect(stmt._getDbHandle()).toBeNull();
    });
  });

  describe('_rewriteDollarParams()', () => {
    it('should rewrite $1,$2 to ? and reorder params', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      const { sql, params } = stmt._rewriteDollarParams(
        'SELECT * FROM t WHERE a = $2 AND b = $1',
        ['val1', 'val2']
      );
      expect(sql).toBe('SELECT * FROM t WHERE a = ? AND b = ?');
      expect(params).toEqual(['val2', 'val1']);
    });

    it('should pass through if no $ placeholders', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      const { sql, params } = stmt._rewriteDollarParams(
        'SELECT * FROM t WHERE a = ?',
        ['val1']
      );
      expect(sql).toBe('SELECT * FROM t WHERE a = ?');
      expect(params).toEqual(['val1']);
    });
  });

  describe('_prepare()', () => {
    // Helper: create a mock db.prepare that calls the callback asynchronously
    // (matching real sqlite3 behavior where callback fires after prepare returns)
    function createMockDb(mockStmt, error) {
      return {
        prepare: jest.fn((sql, cb) => {
          process.nextTick(() => {
            if (error) cb(error);
            else cb(null);
          });
          return mockStmt;
        }),
      };
    }

    it('should prepare a SELECT statement', async () => {
      const mockStmt = { all: jest.fn(), run: jest.fn(), finalize: jest.fn() };
      adapter.db = createMockDb(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'SELECT * FROM t');
      await stmt._prepare();

      expect(adapter.ensureConnected).toHaveBeenCalled();
      expect(stmt.isSelect).toBe(true);
      expect(stmt.preparedStatement).toBe(mockStmt);
    });

    it('should detect INSERT as non-select', async () => {
      const mockStmt = { all: jest.fn(), run: jest.fn(), finalize: jest.fn() };
      adapter.db = createMockDb(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'INSERT INTO t (a) VALUES (?)');
      await stmt._prepare();

      expect(stmt.isSelect).toBe(false);
    });

    it('should detect WITH as select', async () => {
      const mockStmt = { all: jest.fn(), run: jest.fn(), finalize: jest.fn() };
      adapter.db = createMockDb(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'WITH cte AS (SELECT 1) SELECT * FROM cte');
      await stmt._prepare();
      expect(stmt.isSelect).toBe(true);
    });

    it('should detect PRAGMA as select', async () => {
      const mockStmt = { all: jest.fn(), run: jest.fn(), finalize: jest.fn() };
      adapter.db = createMockDb(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'PRAGMA table_info("users")');
      await stmt._prepare();
      expect(stmt.isSelect).toBe(true);
    });

    it('should throw if no db handle', async () => {
      adapter.db = null;
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      await expect(stmt._prepare()).rejects.toThrow('Database not connected');
    });

    it('should wrap preparation errors', async () => {
      adapter.db = createMockDb({}, new Error('bad sql'));

      const stmt = new SQLiteStatement(adapter, 'INVALID');
      await expect(stmt._prepare()).rejects.toThrow('SQLite statement preparation failed: bad sql');
    });

    it('should skip ensureConnected when adapter lacks it (line 62)', async () => {
      const mockStmt = { all: jest.fn(), run: jest.fn(), finalize: jest.fn() };
      const adapterNoEnsure = {
        getParameterPlaceholder: jest.fn(() => '?'),
        db: createMockDb(mockStmt),
      };
      const stmt = new SQLiteStatement(adapterNoEnsure, 'SELECT * FROM t');
      await stmt._prepare();
      expect(stmt.isSelect).toBe(true);
      expect(stmt.preparedStatement).toBe(mockStmt);
    });
  });

  describe('_execute()', () => {
    function createMockDbForExec(mockStmt) {
      return {
        prepare: jest.fn((sql, cb) => {
          process.nextTick(() => cb(null));
          return mockStmt;
        }),
      };
    }

    it('should execute SELECT and return rows', async () => {
      const mockStmt = {
        all: jest.fn((params, cb) => cb(null, [{ id: 1 }, { id: 2 }])),
        run: jest.fn(),
        finalize: jest.fn(),
      };
      adapter.db = createMockDbForExec(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'SELECT * FROM t');
      const result = await stmt._execute();

      expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.rowCount).toBe(2);
      expect(result.insertedId).toBeNull();
    });

    it('should execute INSERT and return write metadata', async () => {
      const mockStmt = {
        all: jest.fn(),
        run: jest.fn((params, cb) => {
          cb.call({ lastID: 42, changes: 1 }, null);
        }),
        finalize: jest.fn(),
      };
      adapter.db = createMockDbForExec(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'INSERT INTO t (name) VALUES (?)');
      stmt.parameters = ['Alice'];
      const result = await stmt._execute();

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(1);
      expect(result.insertedId).toBe(42);
    });

    it('should wrap execution errors for SELECT', async () => {
      const mockStmt = {
        all: jest.fn((params, cb) => cb(new Error('query failed'))),
        run: jest.fn(),
        finalize: jest.fn(),
      };
      adapter.db = createMockDbForExec(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'SELECT * FROM nonexistent');
      await expect(stmt._execute()).rejects.toThrow('SQLite statement execution failed');
    });

    it('should wrap execution errors for INSERT', async () => {
      const mockStmt = {
        all: jest.fn(),
        run: jest.fn((params, cb) => cb(new Error('constraint violation'))),
        finalize: jest.fn(),
      };
      adapter.db = createMockDbForExec(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'INSERT INTO t (name) VALUES (?)');
      stmt.parameters = ['Alice'];
      await expect(stmt._execute()).rejects.toThrow('SQLite statement execution failed');
    });

    it('should use this.sql and this.parameters when _processedSql/_processedParams are null (lines 108-109)', async () => {
      const mockStmt = {
        all: jest.fn((params, cb) => cb(null, [{ id: 1 }])),
        run: jest.fn(),
        finalize: jest.fn(),
      };
      adapter.db = createMockDbForExec(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'SELECT * FROM t');
      // Manually set preparedStatement and isSelect to skip _prepare call
      stmt.preparedStatement = mockStmt;
      stmt.isSelect = true;
      stmt.parameters = [];
      stmt._processedSql = null;
      stmt._processedParams = null;
      const result = await stmt._execute();
      expect(result.rows).toEqual([{ id: 1 }]);
    });

    it('should handle SELECT returning null rows (line 125)', async () => {
      const mockStmt = {
        all: jest.fn((params, cb) => cb(null, null)),
        run: jest.fn(),
        finalize: jest.fn(),
      };
      adapter.db = createMockDbForExec(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'SELECT * FROM t');
      stmt.preparedStatement = mockStmt;
      stmt.isSelect = true;
      stmt.parameters = [];
      stmt._processedSql = 'SELECT * FROM t';
      stmt._processedParams = [];
      const result = await stmt._execute();
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should handle write with zero changes and zero lastID (lines 151-152)', async () => {
      const mockStmt = {
        all: jest.fn(),
        run: jest.fn((params, cb) => {
          cb.call({ lastID: 0, changes: 0 }, null);
        }),
        finalize: jest.fn(),
      };
      adapter.db = createMockDbForExec(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'DELETE FROM t WHERE id = ?');
      stmt.preparedStatement = mockStmt;
      stmt.isSelect = false;
      stmt.parameters = [999];
      stmt._processedSql = 'DELETE FROM t WHERE id = ?';
      stmt._processedParams = [999];
      const result = await stmt._execute();
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
      expect(result.insertedId).toBeNull();
    });

    it('should log parameters when params.length > 0 (line 112)', async () => {
      const mockStmt = {
        all: jest.fn((params, cb) => cb(null, [{ id: 1 }])),
        run: jest.fn(),
        finalize: jest.fn(),
      };
      adapter.db = createMockDbForExec(mockStmt);

      const stmt = new SQLiteStatement(adapter, 'SELECT * FROM t WHERE id = ?');
      stmt.preparedStatement = mockStmt;
      stmt.isSelect = true;
      stmt.parameters = [42];
      stmt._processedSql = 'SELECT * FROM t WHERE id = ?';
      stmt._processedParams = [42];
      const result = await stmt._execute();
      expect(result.rows).toEqual([{ id: 1 }]);
    });
  });

  describe('fetch()', () => {
    it('should return rows one at a time', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.result = [{ id: 1 }, { id: 2 }];
      stmt.cursor = 0;

      expect(await stmt.fetch()).toEqual({ id: 1 });
      expect(await stmt.fetch()).toEqual({ id: 2 });
      expect(await stmt.fetch()).toBeNull();
    });

    it('should return null for null result', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.result = null;
      expect(await stmt.fetch()).toBeNull();
    });
  });

  describe('fetchAll()', () => {
    it('should return remaining rows', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.result = [{ id: 1 }, { id: 2 }, { id: 3 }];
      stmt.cursor = 1;
      expect(await stmt.fetchAll()).toEqual([{ id: 2 }, { id: 3 }]);
    });

    it('should return empty array for non-array result', async () => {
      const stmt = new SQLiteStatement(adapter, 'INSERT');
      stmt.result = null;
      expect(await stmt.fetchAll()).toEqual([]);
    });
  });

  describe('fetchColumn()', () => {
    it('should return column at given index', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.result = [{ name: 'Alice', age: 30 }];
      stmt.cursor = 0;
      expect(await stmt.fetchColumn(1)).toBe(30);
    });

    it('should return null if no rows left', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.result = [];
      stmt.cursor = 0;
      expect(await stmt.fetchColumn()).toBeNull();
    });

    it('should handle array row for fetchColumn (line 200)', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      stmt.result = [{ a: 'Alice', b: 30, c: true }];
      stmt.cursor = 0;
      // _formatSingleRow in array mode returns Object.values -> ['Alice', 30, true]
      expect(await stmt.fetchColumn(1)).toBe(30);
    });

    it('should return primitive row directly for fetchColumn (line 206)', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      stmt.result = [{ val: 42 }];
      stmt.cursor = 0;
      // _formatSingleRow in column mode returns first value -> 42 (primitive)
      expect(await stmt.fetchColumn()).toBe(42);
    });

    it('should return null when array row element is undefined (line 200 ?? branch)', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      stmt.result = [{ a: 'Alice' }];
      stmt.cursor = 0;
      // array mode -> ['Alice'], index 5 is undefined -> ?? null
      expect(await stmt.fetchColumn(5)).toBeNull();
    });

    it('should return null when object row column is undefined (line 203 ?? branch)', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.result = [{ name: 'Alice' }];
      stmt.cursor = 0;
      // object mode, index 5 is out of bounds -> ?? null
      expect(await stmt.fetchColumn(5)).toBeNull();
    });
  });

  describe('rowCount()', () => {
    it('should return array length for SELECT', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT');
      stmt.result = [{ id: 1 }, { id: 2 }];
      expect(await stmt.rowCount()).toBe(2);
    });

    it('should return _lastRowCount for writes', async () => {
      const stmt = new SQLiteStatement(adapter, 'UPDATE');
      stmt.result = null;
      stmt._lastRowCount = 5;
      expect(await stmt.rowCount()).toBe(5);
    });

    it('should return 0 when no result or metadata', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT');
      stmt.result = null;
      stmt._lastRowCount = 0;
      expect(await stmt.rowCount()).toBe(0);
    });
  });

  describe('lastInsertId()', () => {
    it('should return _lastInsertedId', async () => {
      const stmt = new SQLiteStatement(adapter, 'INSERT');
      stmt._lastInsertedId = 42;
      expect(await stmt.lastInsertId()).toBe(42);
    });

    it('should return null when not set', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT');
      stmt._lastInsertedId = null;
      expect(await stmt.lastInsertId()).toBeNull();
    });
  });

  describe('_close()', () => {
    it('should finalize prepared statement and reset state', async () => {
      const mockFinalize = jest.fn((cb) => cb(null));
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.preparedStatement = { finalize: mockFinalize };
      stmt.result = [{ id: 1 }];
      stmt.cursor = 5;
      stmt._lastRowCount = 3;
      stmt._lastInsertedId = 10;
      stmt._processedSql = 'SELECT 1';
      stmt._processedParams = [];

      await stmt._close();

      expect(mockFinalize).toHaveBeenCalled();
      expect(stmt.preparedStatement).toBeNull();
      expect(stmt.result).toBeNull();
      expect(stmt.cursor).toBe(0);
      expect(stmt._lastRowCount).toBe(0);
      expect(stmt._lastInsertedId).toBeNull();
      expect(stmt._processedSql).toBeNull();
      expect(stmt._processedParams).toBeNull();
    });

    it('should handle finalize errors gracefully', async () => {
      const mockFinalize = jest.fn((cb) => cb(new Error('finalize error')));
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.preparedStatement = { finalize: mockFinalize };

      // Should not throw
      await stmt._close();
      expect(stmt.result).toBeNull();
    });

    it('should handle no prepared statement', async () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.preparedStatement = null;
      await stmt._close();
      expect(stmt.result).toBeNull();
    });
  });

  describe('_formatSingleRow()', () => {
    it('should return object by default', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      expect(stmt._formatSingleRow({ id: 1 })).toEqual({ id: 1 });
    });

    it('should return array in array mode', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      expect(stmt._formatSingleRow({ a: 1, b: 2 })).toEqual([1, 2]);
    });

    it('should return first value in column mode', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      expect(stmt._formatSingleRow({ a: 10, b: 20 })).toBe(10);
    });

    it('should return null for null', () => {
      const stmt = new SQLiteStatement(adapter, 'SELECT 1');
      expect(stmt._formatSingleRow(null)).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Integration: base Statement class methods via subclasses
// ═══════════════════════════════════════════════════════════════════
describe('Statement base class integration', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMockAdapter('postgres');
  });

  describe('prepare() / execute() flow', () => {
    it('should call _prepare only once', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      jest.spyOn(stmt, '_prepare').mockResolvedValue(undefined);
      jest.spyOn(stmt, '_execute').mockResolvedValue({ rows: [], rowCount: 0, insertedId: null });

      await stmt.execute();
      await stmt.execute();

      expect(stmt._prepare).toHaveBeenCalledTimes(1);
      expect(stmt._execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('execute() with params', () => {
    it('should accept array params', async () => {
      adapter.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const stmt = new PostgreSQLStatement(adapter, 'SELECT * FROM t WHERE id = $1');
      await stmt.execute([42]);
      expect(stmt.parameters).toEqual([42]);
    });

    it('should accept object params via bindParams', async () => {
      adapter.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const stmt = new PostgreSQLStatement(adapter, 'SELECT * FROM t WHERE name = :name');
      await stmt.execute({ name: 'Alice' });
      expect(stmt.boundParams.has('name')).toBe(true);
    });
  });

  describe('bindParam / bindValue', () => {
    it('should bind numeric index params', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.bindParam(0, 'hello');
      expect(stmt.parameters[0]).toBe('hello');
    });

    it('should bind named params', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.bindParam('name', 'Alice');
      expect(stmt.boundParams.get('name')).toEqual({ value: 'Alice', type: null });
    });

    it('should support bindValue as alias', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      const result = stmt.bindValue(0, 42);
      expect(stmt.parameters[0]).toBe(42);
      expect(result).toBe(stmt); // chaining
    });
  });

  describe('setFetchMode()', () => {
    it('should set fetch mode and return this for chaining', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      const result = stmt.setFetchMode('array');
      expect(stmt.fetchMode).toBe('array');
      expect(result).toBe(stmt);
    });
  });

  describe('close()', () => {
    it('should call _close and reset prepared flag', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.prepared = true;
      await stmt.close();
      expect(stmt.prepared).toBe(false);
    });
  });

  describe('getSQL()', () => {
    it('should return the SQL string', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT * FROM users');
      expect(stmt.getSQL()).toBe('SELECT * FROM users');
    });
  });

  describe('getParameters()', () => {
    it('should return parameters array when no boundParams', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.parameters = [1, 2, 3];
      expect(stmt.getParameters()).toEqual([1, 2, 3]);
    });

    it('should return boundParams map when present', () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.bindParam('name', 'Alice');
      const params = stmt.getParameters();
      expect(params instanceof Map).toBe(true);
      expect(params.get('name')).toEqual({ value: 'Alice', type: null });
    });
  });

  describe('fetchRow()', () => {
    it('should return first row from fetchAll', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [{ id: 1 }, { id: 2 }] };
      stmt.cursor = 0;
      const row = await stmt.fetchRow();
      expect(row).toEqual({ id: 1 });
    });

    it('should return null when no rows', async () => {
      const stmt = new PostgreSQLStatement(adapter, 'SELECT 1');
      stmt.result = { rows: [] };
      stmt.cursor = 0;
      const row = await stmt.fetchRow();
      expect(row).toBeNull();
    });
  });
});
