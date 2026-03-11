const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TenantTable;
beforeAll(() => {
  TenantTable = require(globalThis.applicationPath('/application/table/tenant-table'));
});

describe('TenantTable', () => {
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
    table = new TenantTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('tenant');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('tenant_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new TenantTable({ adapter: mockAdapter, hydrator: customHydrator });
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

  describe('fetchById', () => {
    it('should return null when no rows found', async () => {
      const result = await table.fetchById('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('t.tenant_id = ?', 't-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchBySlug', () => {
    it('should query by slug', async () => {
      const result = await table.fetchBySlug('my-tenant');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('t.slug = ?', 'my-tenant');
      expect(result).toBeNull();
    });
  });

  describe('fetchAll', () => {
    it('should return array of DTOs', async () => {
      const result = await table.fetchAll();
      expect(mockSelectQuery.order).toHaveBeenCalledWith('t.created_dt', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply status filter when provided', async () => {
      await table.fetchAll({ status: 'active' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith('t.status = ?', 'active');
    });

    it('should apply limit and offset', async () => {
      await table.fetchAll({ limit: 10, offset: 5 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(5);
    });

    it('should not apply status when not provided', async () => {
      await table.fetchAll();
      expect(mockSelectQuery.where).not.toHaveBeenCalled();
    });

    it('should not apply limit/offset when not provided', async () => {
      await table.fetchAll();
      expect(mockSelectQuery.limit).not.toHaveBeenCalled();
      expect(mockSelectQuery.offset).not.toHaveBeenCalled();
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tenant_id: 't-1', name: 'Test' }] });
      const result = await table.fetchAll();
      expect(result.length).toBe(1);
    });
  });

  describe('fetchById - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tenant_id: 't-1', name: 'Test' }] });
      const result = await table.fetchById('t-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchBySlug - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tenant_id: 't-1', slug: 'my-tenant' }] });
      const result = await table.fetchBySlug('my-tenant');
      expect(result).not.toBeNull();
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
      const realTable = new TenantTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('entityFactory', () => {
    it('should create entity from row data', () => {
      if (table.entityFactory) {
        const entity = table.entityFactory({ tenant_id: 't-1', name: 'Test' });
        expect(entity).toBeDefined();
      }
    });
  });
});
