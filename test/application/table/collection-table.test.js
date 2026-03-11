const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let CollectionTable;
beforeAll(() => {
  CollectionTable = require(globalThis.applicationPath('/application/table/collection-table'));
});

describe('CollectionTable', () => {
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
    table = new CollectionTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('collection');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('collection_id');
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
      const result = await table.fetchById('c-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('collection_id = ?', 'c-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ collection_id: 'c-1' }] });
      const result = await table.fetchById('c-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantId', () => {
    it('should query by tenant_id with soft delete filter', async () => {
      const result = await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply limit and offset when provided', async () => {
      await table.fetchByTenantId('t-1', { limit: 10, offset: 20 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(20);
    });

    it('should not apply limit/offset when not provided', async () => {
      await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.limit).not.toHaveBeenCalled();
      expect(mockSelectQuery.offset).not.toHaveBeenCalled();
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ collection_id: 'c-1' }] });
      const result = await table.fetchByTenantId('t-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByTenantWithDetails', () => {
    it('should build join query for tenant details', async () => {
      const result = await table.fetchByTenantWithDetails('t-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ c: 'collection' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('c.tenant_id = ?', 't-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply limit and offset when provided', async () => {
      await table.fetchByTenantWithDetails('t-1', { limit: 5, offset: 10 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(5);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('insert', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ collection_id: 'c-1' }], rowCount: 1 });
      const result = await table.insert('c-1', 't-1', 'My Collection', 'desc', 'u-1');
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.insert('c-1', 't-1', 'My Collection', 'desc', 'u-1');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should execute update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.update('c-1', { name: 'Updated' });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('softDelete', () => {
    it('should execute soft delete update', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.softDelete('c-1', 'u-1');
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
