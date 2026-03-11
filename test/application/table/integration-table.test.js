const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let IntegrationTable;
beforeAll(() => {
  IntegrationTable = require(globalThis.applicationPath('/application/table/integration-table'));
});

describe('IntegrationTable', () => {
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
    };
    mockAdapter = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    table = new IntegrationTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('integration');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('integration_id');
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    });
  });

  describe('fetchById', () => {
    it('should return null when no rows found', async () => {
      const result = await table.fetchById('int-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('integration_id = ?', 'int-1');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ integration_id: 'int-1' }] });
      const result = await table.fetchById('int-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantId', () => {
    it('should query by tenant_id', async () => {
      const result = await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('name', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ integration_id: 'int-1' }] });
      const result = await table.fetchByTenantId('t-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByCode', () => {
    it('should query by tenant_id and code', async () => {
      const result = await table.fetchByCode('t-1', 'my-code');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('code = ?', 'my-code');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ integration_id: 'int-1', code: 'my-code' }] });
      const result = await table.fetchByCode('t-1', 'my-code');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantWithDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchByTenantWithDetails('t-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ i: 'integration' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('i.tenant_id = ?', 't-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('insert', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ integration_id: 'int-1' }], rowCount: 1 });
      const result = await table.insert({ tenantId: 't-1', code: 'c1', name: 'Test' });
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.insert({ tenantId: 't-1', code: 'c1', name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should execute update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.update('int-1', { name: 'Updated' });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('updateStatus', () => {
    it('should execute status update', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.updateStatus('int-1', 'inactive');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('updateWebhookSecret', () => {
    it('should execute webhook secret update', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.updateWebhookSecret('int-1', 'secret-hash');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('_normalizeRows', () => {
    it('should handle result with rows property', () => {
      expect(table._normalizeRows({ rows: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    });

    it('should handle array result', () => {
      expect(table._normalizeRows([{ id: 1 }])).toEqual([{ id: 1 }]);
    });

    it('should handle null', () => {
      expect(table._normalizeRows(null)).toEqual([]);
    });
  });
});
