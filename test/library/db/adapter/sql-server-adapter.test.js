const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

// ─── Mock mssql ─────────────────────────────────────────────────
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

// Mock statement require path (must use inline requires per jest rules)
jest.mock(
  require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/sqlServerStatement'),
  () => require(require('path').join(require('path').resolve(__dirname, '../../../../'), 'library/db/statement/sql-server-statement')),
  { virtual: true }
);

const SqlServerAdapter = require(path.join(projectRoot, 'library/db/adapter/sql-server-adapter'));

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

beforeEach(() => {
  jest.clearAllMocks();
  // Reset pool mock to defaults
  mockMssqlPool.connected = true;
  mockMssqlPool.connecting = false;
  mockMssqlPool.connect.mockResolvedValue(undefined);
  mockMssqlPool.close.mockResolvedValue(undefined);
  mockMssqlRequest.input.mockClear();
  mockMssqlRequest.query.mockReset();
});

// Helper: create adapter and mark it as connected (simulating a prior connect)
function createConnectedAdapter(config = {}) {
  const adapter = new SqlServerAdapter({
    server: 'localhost',
    database: 'testdb',
    user: 'sa',
    password: 'pass',
    ...config,
  });
  // Simulate a successful prior connection
  adapter.pool = mockMssqlPool;
  adapter.connected = true;
  adapter.connection = mockMssqlPool;
  adapter._connected = true;
  return adapter;
}

describe('SqlServerAdapter', () => {
  // ──────────────────────────────────────────────────────────────
  // Lines 68-69: connect() when pool exists, is connecting but not connected
  // ──────────────────────────────────────────────────────────────
  describe('connect() - pool exists but not yet connected (lines 68-69)', () => {
    it('should await pool.connect() when pool exists and is connecting but not connected', async () => {
      const adapter = new SqlServerAdapter({ server: 'localhost', database: 'testdb' });

      // Simulate: pool already exists, pool.connecting = true, pool.connected = false
      adapter.pool = mockMssqlPool;
      mockMssqlPool.connecting = true;
      mockMssqlPool.connected = false;

      await adapter.connect();

      // Should have called pool.connect() because pool was not connected
      expect(mockMssqlPool.connect).toHaveBeenCalled();
      expect(adapter.connected).toBe(true);
      expect(adapter.connection).toBe(mockMssqlPool);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Line 117: disconnect() error path
  // ──────────────────────────────────────────────────────────────
  describe('disconnect() - error path (line 117)', () => {
    it('should throw wrapped error when pool.close() fails', async () => {
      const adapter = createConnectedAdapter();
      mockMssqlPool.close.mockRejectedValue(new Error('close failed'));

      await expect(adapter.disconnect()).rejects.toThrow('SQL Server disconnection failed: close failed');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Lines 422-447: getTableInfo()
  // ──────────────────────────────────────────────────────────────
  describe('getTableInfo() (lines 422-447)', () => {
    it('should return table info with columns mapped correctly', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [
          {
            column_name: 'id',
            data_type: 'int',
            is_nullable: 'NO',
            column_default: null,
            is_identity: 1,
          },
          {
            column_name: 'name',
            data_type: 'nvarchar',
            is_nullable: 'YES',
            column_default: "('')",
            is_identity: 0,
          },
        ],
        rowsAffected: [2],
      });

      const result = await adapter.getTableInfo('users');

      expect(result.tableName).toBe('users');
      expect(result.columns).toHaveLength(2);
      expect(result.columns[0]).toEqual({
        name: 'id',
        type: 'int',
        nullable: false,
        default: null,
        identity: true,
      });
      expect(result.columns[1]).toEqual({
        name: 'name',
        type: 'nvarchar',
        nullable: true,
        default: "('')",
        identity: false,
      });
    });

    it('should return empty columns array for non-existent table', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });

      const result = await adapter.getTableInfo('nonexistent');
      expect(result.tableName).toBe('nonexistent');
      expect(result.columns).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Lines 450-462: listTables()
  // ──────────────────────────────────────────────────────────────
  describe('listTables() (lines 450-462)', () => {
    it('should return array of table names', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [
          { table_name: 'posts' },
          { table_name: 'users' },
        ],
        rowsAffected: [2],
      });

      const result = await adapter.listTables();

      expect(result).toEqual(['posts', 'users']);
    });

    it('should return empty array when no tables exist', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });

      const result = await adapter.listTables();
      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Lines 464-469: getVersion()
  // ──────────────────────────────────────────────────────────────
  describe('getVersion() (lines 464-469)', () => {
    it('should return the SQL Server version string', async () => {
      const adapter = createConnectedAdapter();

      const versionStr = 'Microsoft SQL Server 2019 (RTM) - 15.0.2000.5';
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ version: versionStr }],
        rowsAffected: [1],
      });

      const result = await adapter.getVersion();
      expect(result).toBe(versionStr);
    });

    it('should return undefined when no version row is returned', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });

      const result = await adapter.getVersion();
      expect(result).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Lines 485-490: getNextIdentity()
  // ──────────────────────────────────────────────────────────────
  describe('getNextIdentity() (lines 485-490)', () => {
    it('should return the next identity value', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ next_id: 42 }],
        rowsAffected: [1],
      });

      const result = await adapter.getNextIdentity('users');
      expect(result).toBe(42);
    });

    it('should return 1 when next_id is null or undefined', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ next_id: null }],
        rowsAffected: [1],
      });

      const result = await adapter.getNextIdentity('users');
      expect(result).toBe(1);
    });

    it('should return 1 when recordset is empty', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });

      const result = await adapter.getNextIdentity('users');
      expect(result).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Lines 492-500: selectTop()
  // ──────────────────────────────────────────────────────────────
  describe('selectTop() (lines 492-500)', () => {
    it('should return rows with TOP clause', async () => {
      const adapter = createConnectedAdapter();

      const rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      mockMssqlRequest.query.mockResolvedValue({
        recordset: rows,
        rowsAffected: [2],
      });

      const result = await adapter.selectTop('users', 2);
      expect(result).toEqual(rows);

      // Verify the SQL contains TOP
      const calledSql = mockMssqlRequest.query.mock.calls[0][0];
      expect(calledSql).toContain('TOP (2)');
      expect(calledSql).toContain('[users]');
    });

    it('should include WHERE clause when provided', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [{ id: 1, name: 'Alice' }],
        rowsAffected: [1],
      });

      const result = await adapter.selectTop('users', 5, 'active = ?', [1]);
      expect(result).toEqual([{ id: 1, name: 'Alice' }]);

      const calledSql = mockMssqlRequest.query.mock.calls[0][0];
      expect(calledSql).toContain('TOP (5)');
      expect(calledSql).toContain('WHERE active = @param0');
    });

    it('should return empty array when no rows match', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });

      const result = await adapter.selectTop('users', 10);
      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Lines 502-520: getTableSize()
  // ──────────────────────────────────────────────────────────────
  describe('getTableSize() (lines 502-520)', () => {
    it('should return table size info', async () => {
      const adapter = createConnectedAdapter();

      const sizeRow = { TotalSpaceKB: 1024, UsedSpaceKB: 800, UnusedSpaceKB: 224 };
      mockMssqlRequest.query.mockResolvedValue({
        recordset: [sizeRow],
        rowsAffected: [1],
      });

      const result = await adapter.getTableSize('users');
      expect(result).toEqual(sizeRow);
    });

    it('should return null when table does not exist', async () => {
      const adapter = createConnectedAdapter();

      mockMssqlRequest.query.mockResolvedValue({
        recordset: [],
        rowsAffected: [0],
      });

      const result = await adapter.getTableSize('nonexistent');
      expect(result).toBeNull();
    });
  });
});
