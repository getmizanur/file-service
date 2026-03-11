const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let StorageBackendTable;
beforeAll(() => {
  StorageBackendTable = require(globalThis.applicationPath('/application/table/storage-backend-table'));
});

describe('StorageBackendTable', () => {
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
    table = new StorageBackendTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('storage_backend');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('storage_backend_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new StorageBackendTable({ adapter: mockAdapter, hydrator: customHydrator });
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

  describe('constructor edge cases', () => {
    it('should create instance with no arguments', () => {
      const t = new StorageBackendTable();
      expect(t.table).toBe('storage_backend');
    });
  });

  describe('getSelectQuery', () => {
    it('should create a Select query object', async () => {
      const realTable = new StorageBackendTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('fetchById', () => {
    it('should return null when no rows found', async () => {
      const result = await table.fetchById('sb-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('sb.storage_backend_id = ?', 'sb-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchByTenantId', () => {
    it('should return array of DTOs', async () => {
      const result = await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('sb.provider', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchAll', () => {
    it('should return array of DTOs', async () => {
      const result = await table.fetchAll();
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ sb: 'storage_backend' }, []);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ storage_backend_id: 'sb-1', name: 'S3' }] });
      const result = await table.fetchAll();
      expect(result.length).toBe(1);
    });
  });

  describe('fetchById - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ storage_backend_id: 'sb-1', name: 'S3' }] });
      const result = await table.fetchById('sb-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantId - with results', () => {
    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ storage_backend_id: 'sb-1' }, { storage_backend_id: 'sb-2' }] });
      const result = await table.fetchByTenantId('t-1');
      expect(result.length).toBe(2);
    });
  });

  describe('_normalizeRows', () => {
    it('should return rows from result object', () => {
      expect(table._normalizeRows({ rows: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    });

    it('should return array directly', () => {
      expect(table._normalizeRows([{ id: 1 }])).toEqual([{ id: 1 }]);
    });

    it('should return empty array for null', () => {
      expect(table._normalizeRows(null)).toEqual([]);
    });
  });

  describe('getSelectQuery', () => {
    it('should return a Select instance', async () => {
      const realTable = new StorageBackendTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('entityFactory', () => {
    it('should create entity from row data', () => {
      if (table.entityFactory) {
        const entity = table.entityFactory({ storage_backend_id: 'sb-1', name: 'S3' });
        expect(entity).toBeDefined();
      }
    });
  });

  describe('_hydrateToDtoArray', () => {
    it('should hydrate rows to DTOs', () => {
      const rows = [{ storage_backend_id: 'sb-1', name: 'S3' }];
      const result = table._hydrateToDtoArray(rows, {});
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
