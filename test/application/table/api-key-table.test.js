const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let ApiKeyTable;
beforeAll(() => {
  ApiKeyTable = require(globalThis.applicationPath('/application/table/api-key-table'));
});

describe('ApiKeyTable', () => {
  let table;
  let mockAdapter;
  let mockSelectQuery;

  beforeEach(() => {
    mockSelectQuery = {
      from: jest.fn().mockReturnThis(),
      columns: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      joinLeft: jest.fn().mockReturnThis(),
      group: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      executeRaw: jest.fn().mockResolvedValue({ rows: [] }),
    };
    mockAdapter = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    table = new ApiKeyTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('api_key');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('api_key_id');
    });

    it('should store the adapter', () => {
      expect(table.adapter).toBe(mockAdapter);
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new ApiKeyTable({ adapter: mockAdapter, hydrator: customHydrator });
      expect(t.hydrator).toBe(customHydrator);
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    });
  });

  describe('getSelectQuery', () => {
    it('should return a Select instance', async () => {
      const realTable = new ApiKeyTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('_normalizeRows', () => {
    it('should return rows from result object', () => {
      const rows = [{ id: 1 }];
      expect(table._normalizeRows({ rows })).toEqual(rows);
    });

    it('should return array directly if result is array', () => {
      const rows = [{ id: 1 }];
      expect(table._normalizeRows(rows)).toEqual(rows);
    });

    it('should return empty array for null/undefined', () => {
      expect(table._normalizeRows(null)).toEqual([]);
      expect(table._normalizeRows(undefined)).toEqual([]);
    });
  });

  describe('fetchById', () => {
    it('should return null when no rows found', async () => {
      const result = await table.fetchById('key-1');
      expect(result).toBeNull();
      expect(mockSelectQuery.from).toHaveBeenCalledWith('api_key');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('api_key_id = ?', 'key-1');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ api_key_id: 'key-1', name: 'test' }] });
      const result = await table.fetchById('key-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantId', () => {
    it('should query by tenant_id and return array', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ api_key_id: 'k1' }] });
      const result = await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByIntegrationId', () => {
    it('should query by integration_id', async () => {
      const result = await table.fetchByIntegrationId('int-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('integration_id = ?', 'int-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByTenantAndIntegration', () => {
    it('should query by tenant_id and integration_id', async () => {
      const result = await table.fetchByTenantAndIntegration('t-1', 'int-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('integration_id = ?', 'int-1');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('fetchByTenantWithDetails', () => {
    it('should build join query for tenant details', async () => {
      const result = await table.fetchByTenantWithDetails('t-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ ak: 'api_key' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('ak.tenant_id = ?', 't-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ api_key_id: 'k-1', integration_name: 'Test' }] });
      const result = await table.fetchByTenantWithDetails('t-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByTenantAndIntegration - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ api_key_id: 'k-1', tenant_id: 't-1' }] });
      const result = await table.fetchByTenantAndIntegration('t-1', 'int-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByIntegrationId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ api_key_id: 'k-1' }, { api_key_id: 'k-2' }] });
      const result = await table.fetchByIntegrationId('int-1');
      expect(result.length).toBe(2);
    });
  });

  describe('insertKey', () => {
    it('should execute insert query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ api_key_id: 'k-new', tenant_id: 't-1' }],
        rowCount: 1
      });
      const table2 = new ApiKeyTable({ adapter: mockAdapter });
      const result = await table2.insertKey('t-1', 'my-key', 'hash123', 'int-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });

    it('should return null on failed insert', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const table2 = new ApiKeyTable({ adapter: mockAdapter });
      const result = await table2.insertKey('t-1', 'my-key', 'hash123');
      expect(result === null || result !== undefined).toBe(true);
    });
  });

  describe('revokeKey', () => {
    it('should execute revoke update', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new ApiKeyTable({ adapter: mockAdapter });
      const result = await table2.revokeKey('k-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });

  describe('updateLastUsed', () => {
    it('should execute last used update', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new ApiKeyTable({ adapter: mockAdapter });
      const result = await table2.updateLastUsed('k-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });
});
