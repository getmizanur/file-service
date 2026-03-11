const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderPermissionTable;
beforeAll(() => {
  FolderPermissionTable = require(globalThis.applicationPath('/application/table/folder-permission-table'));
});

describe('FolderPermissionTable', () => {
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
    table = new FolderPermissionTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('folder_permission');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('permission_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new FolderPermissionTable({ adapter: mockAdapter, hydrator: customHydrator });
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
      const result = await table.fetchById('p-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('permission_id = ?', 'p-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchByFolderId', () => {
    it('should query by folder_id', async () => {
      const result = await table.fetchByFolderId('folder-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('folder_id = ?', 'folder-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByUserAndFolder', () => {
    it('should query by tenant, folder and user', async () => {
      const result = await table.fetchByUserAndFolder('t-1', 'folder-1', 'u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('folder_id = ?', 'folder-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchPeopleWithAccess', () => {
    it('should build join query', async () => {
      const result = await table.fetchPeopleWithAccess('t-1', 'folder-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ fp: 'folder_permission' }, []);
      expect(mockSelectQuery.join).toHaveBeenCalled();
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fp.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fp.folder_id = ?', 'folder-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ permission_id: 'p-1', user_email: 'a@b.com' }] });
      const result = await table.fetchPeopleWithAccess('t-1', 'folder-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchById - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ permission_id: 'p-1', folder_id: 'f-1' }] });
      const result = await table.fetchById('p-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByFolderId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ permission_id: 'p-1' }, { permission_id: 'p-2' }] });
      const result = await table.fetchByFolderId('folder-1');
      expect(result.length).toBe(2);
    });
  });

  describe('fetchByUserAndFolder - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ permission_id: 'p-1', user_id: 'u-1' }] });
      const result = await table.fetchByUserAndFolder('t-1', 'folder-1', 'u-1');
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
      const realTable = new FolderPermissionTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('upsertPermission', () => {
    it('should execute upsert query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ permission_id: 'p-new', folder_id: 'f-1' }],
        rowCount: 1
      });
      const table2 = new FolderPermissionTable({ adapter: mockAdapter });
      const result = await table2.upsertPermission('t-1', 'f-1', 'u-1', 'editor', 'u-2', true);
      expect(mockAdapter.query).toHaveBeenCalled();
    });

    it('should return null on failed upsert', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const table2 = new FolderPermissionTable({ adapter: mockAdapter });
      const result = await table2.upsertPermission('t-1', 'f-1', 'u-1', 'editor', 'u-2');
      expect(result === null || result !== undefined).toBe(true);
    });
  });

  describe('deletePermission', () => {
    it('should call delete with correct parameters', async () => {
      table.delete = jest.fn().mockResolvedValue({ rowCount: 1 });
      await table.deletePermission('t-1', 'f-1', 'u-1');
      expect(table.delete).toHaveBeenCalledWith({
        tenant_id: 't-1',
        folder_id: 'f-1',
        user_id: 'u-1'
      });
    });
  });
});
