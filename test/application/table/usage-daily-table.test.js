const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UsageDailyTable;
beforeAll(() => {
  UsageDailyTable = require(globalThis.applicationPath('/application/table/usage-daily-table'));
});

describe('UsageDailyTable', () => {
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
    table = new UsageDailyTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('usage_daily');
    });

    it('should set composite primary key', () => {
      expect(table.primaryKey).toEqual(['tenant_id', 'day']);
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    });
  });

  describe('constructor edge cases', () => {
    it('should create instance with no arguments', () => {
      const t = new UsageDailyTable();
      expect(t.table).toBe('usage_daily');
      expect(t.hydrator).toBeDefined();
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new UsageDailyTable({ adapter: mockAdapter, hydrator: customHydrator });
      expect(t.hydrator).toBe(customHydrator);
    });
  });

  describe('getSelectQuery', () => {
    it('should create a Select query object', async () => {
      const realTable = new UsageDailyTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('fetchByTenantAndDay', () => {
    it('should return null when no rows found', async () => {
      const result = await table.fetchByTenantAndDay('t-1', '2024-01-01');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('day = ?', '2024-01-01');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tenant_id: 't-1', day: '2024-01-01' }] });
      const result = await table.fetchByTenantAndDay('t-1', '2024-01-01');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantId', () => {
    it('should query by tenant_id with default limit', async () => {
      const result = await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('day', 'DESC');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(30);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply custom limit', async () => {
      await table.fetchByTenantId('t-1', { limit: 10 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should return entity instances', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tenant_id: 't-1', day: '2024-01-01' }] });
      const result = await table.fetchByTenantId('t-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByTenantAndDateRange', () => {
    it('should query with date range', async () => {
      const result = await table.fetchByTenantAndDateRange('t-1', '2024-01-01', '2024-01-31');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('day >= ?', '2024-01-01');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('day <= ?', '2024-01-31');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('day', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByTenantWithDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchByTenantWithDetails('t-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ u: 'usage_daily' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('u.tenant_id = ?', 't-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply custom limit', async () => {
      await table.fetchByTenantWithDetails('t-1', { limit: 7 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(7);
    });
  });

  describe('fetchAllByDayWithDetails', () => {
    it('should build join query for specific day', async () => {
      const result = await table.fetchAllByDayWithDetails('2024-01-01');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('u.day = ?', '2024-01-01');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('upsert', () => {
    it('should call insert when no existing record', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [] });
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ tenant_id: 't-1', day: '2024-01-01' }], rowCount: 1 });

      const result = await table.upsert('t-1', '2024-01-01', { storage_bytes: 100 });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should call update when existing record found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tenant_id: 't-1', day: '2024-01-01' }] });
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await table.upsert('t-1', '2024-01-01', { storage_bytes: 200 });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
    });
  });

  describe('insert', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ tenant_id: 't-1', day: '2024-01-01' }], rowCount: 1 });
      const result = await table.insert('t-1', '2024-01-01', { storage_bytes: 100 });
      expect(result).not.toBeNull();
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.insert('t-1', '2024-01-01');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should execute update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.update('t-1', '2024-01-01', { storage_bytes: 500 });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('recordUpload', () => {
    it('should execute upsert with ON CONFLICT', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      await table.recordUpload('t-1', '2024-01-01', 1024);
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });
  });

  describe('recordDownload', () => {
    it('should execute upsert with ON CONFLICT', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      await table.recordDownload('t-1', '2024-01-01', 2048);
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });
  });

  describe('recordTransform', () => {
    it('should execute upsert with ON CONFLICT', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      await table.recordTransform('t-1', '2024-01-01');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
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
