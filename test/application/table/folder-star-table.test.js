const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderStarTable;
beforeAll(() => {
  FolderStarTable = require(globalThis.applicationPath('/application/table/folder-star-table'));
});

describe('FolderStarTable', () => {
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
    table = new FolderStarTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
    table.select = jest.fn().mockResolvedValue([]);
    table.insert = jest.fn().mockResolvedValue({});
    table.delete = jest.fn().mockResolvedValue({});
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('folder_star');
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
      await table.add('t-1', 'folder-1', 'u-1');
      expect(table.insert).toHaveBeenCalledWith({
        tenant_id: 't-1',
        folder_id: 'folder-1',
        user_id: 'u-1',
      });
    });
  });

  describe('remove', () => {
    it('should call delete with correct data', async () => {
      await table.remove('t-1', 'folder-1', 'u-1');
      expect(table.delete).toHaveBeenCalledWith({
        tenant_id: 't-1',
        folder_id: 'folder-1',
        user_id: 'u-1',
      });
    });
  });

  describe('check', () => {
    it('should return false when not starred', async () => {
      const result = await table.check('t-1', 'folder-1', 'u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('folder_id = ?', 'folder-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(result).toBe(false);
    });

    it('should return true when starred', async () => {
      table.select.mockResolvedValue([{ created_dt: new Date() }]);
      const result = await table.check('t-1', 'folder-1', 'u-1');
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
  });

  describe('fetchIdsByUser', () => {
    it('should return array of folder_ids', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ folder_id: 'f-1' }, { folder_id: 'f-2' }] });
      const result = await table.fetchIdsByUser('t-1', 'u-1');
      expect(result).toEqual(['f-1', 'f-2']);
    });

    it('should return empty array when no results', async () => {
      const result = await table.fetchIdsByUser('t-1', 'u-1');
      expect(result).toEqual([]);
    });

    it('should handle array result format', async () => {
      mockSelectQuery.execute.mockResolvedValue([{ folder_id: 'f-3' }]);
      const result = await table.fetchIdsByUser('t-1', 'u-1');
      expect(result).toEqual(['f-3']);
    });

    it('should handle null/undefined result', async () => {
      mockSelectQuery.execute.mockResolvedValue(null);
      const result = await table.fetchIdsByUser('t-1', 'u-1');
      expect(result).toEqual([]);
    });
  });

  describe('fetchByUser - with results', () => {
    it('should return results from select', async () => {
      table.select.mockResolvedValue([{ folder_id: 'f-1' }, { folder_id: 'f-2' }]);
      const result = await table.fetchByUser('t-1', 'u-1');
      expect(result.length).toBe(2);
    });
  });

  describe('fetchWithFolderDetails', () => {
    it('should build join query and return DTOs', async () => {
      table.select.mockResolvedValue([{ folder_id: 'f-1', name: 'Test' }]);
      const result = await table.fetchWithFolderDetails('t-1', 'u-1');
      expect(table.select).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getSelectQuery', () => {
    it('should return a Select instance', async () => {
      const realTable = new FolderStarTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });
});
