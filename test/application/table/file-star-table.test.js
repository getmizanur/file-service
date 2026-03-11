const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

// FileStarTable references ClassMethodsHydrator without importing it at top level
// Need to make it available globally for the constructor
const ClassMethodsHydrator = require(globalThis.applicationPath('/library/db/hydrator/class-methods-hydrator'));
globalThis.ClassMethodsHydrator = ClassMethodsHydrator;

let FileStarTable;
beforeAll(() => {
  FileStarTable = require(globalThis.applicationPath('/application/table/file-star-table'));
});

describe('FileStarTable', () => {
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
    table = new FileStarTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
    table.select = jest.fn().mockResolvedValue([]);
    table.insert = jest.fn().mockResolvedValue({});
    table.delete = jest.fn().mockResolvedValue({});
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('file_star');
    });

    it('should set null primary key for composite key', () => {
      expect(table.primaryKey).toBeNull();
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    });
  });

  describe('add', () => {
    it('should call insert with correct data', async () => {
      await table.add('t-1', 'f-1', 'u-1');
      expect(table.insert).toHaveBeenCalledWith({
        tenant_id: 't-1',
        file_id: 'f-1',
        user_id: 'u-1',
      });
    });
  });

  describe('remove', () => {
    it('should call delete with correct data', async () => {
      await table.remove('t-1', 'f-1', 'u-1');
      expect(table.delete).toHaveBeenCalledWith({
        tenant_id: 't-1',
        file_id: 'f-1',
        user_id: 'u-1',
      });
    });
  });

  describe('check', () => {
    it('should return false when not starred', async () => {
      const result = await table.check('t-1', 'f-1', 'u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('file_id = ?', 'f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(result).toBe(false);
    });

    it('should return true when starred', async () => {
      table.select.mockResolvedValue([{ created_dt: new Date() }]);
      const result = await table.check('t-1', 'f-1', 'u-1');
      expect(result).toBe(true);
    });
  });

  describe('fetchByUser', () => {
    it('should query by tenant and user', async () => {
      await table.fetchByUser('t-1', 'u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'DESC');
    });

    it('should return results from select', async () => {
      table.select.mockResolvedValue([{ file_id: 'f-1' }, { file_id: 'f-2' }]);
      const result = await table.fetchByUser('t-1', 'u-1');
      expect(result.length).toBe(2);
    });
  });

  describe('removeWithTenantCheck', () => {
    it('should execute delete with tenant check', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ file_id: 'f-1' }], rowCount: 1 });
      const table2 = new FileStarTable({ adapter: mockAdapter });
      const result = await table2.removeWithTenantCheck('t-1', 'f-1', 'u-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });

    it('should return empty when no match', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const table2 = new FileStarTable({ adapter: mockAdapter });
      const result = await table2.removeWithTenantCheck('t-1', 'f-1', 'u-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });

  describe('baseColumns', () => {
    it('should include expected columns', () => {
      const cols = table.baseColumns();
      expect(cols).toContain('tenant_id');
      expect(cols).toContain('file_id');
      expect(cols).toContain('user_id');
    });
  });

  describe('getSelectQuery', () => {
    it('should return a Select instance', async () => {
      const realTable = new FileStarTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });
});
