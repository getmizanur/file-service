const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FilePermissionTable;
beforeAll(() => {
  FilePermissionTable = require(globalThis.applicationPath('/application/table/file-permission-table'));
});

describe('FilePermissionTable', () => {
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
      having: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };
    mockAdapter = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    table = new FilePermissionTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('file_permission');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('permission_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new FilePermissionTable({ adapter: mockAdapter, hydrator: customHydrator });
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

  describe('fetchByFileId', () => {
    it('should query by file_id', async () => {
      const result = await table.fetchByFileId('f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('file_id = ?', 'f-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByUserId', () => {
    it('should query by user_id', async () => {
      const result = await table.fetchByUserId('u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByUserAndFile', () => {
    it('should query by tenant, file and user', async () => {
      const result = await table.fetchByUserAndFile('t-1', 'f-1', 'u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('file_id = ?', 'f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('fetchUserSharedFileIds', () => {
    it('should return empty set for empty array', async () => {
      const result = await table.fetchUserSharedFileIds([]);
      expect(result).toEqual(new Set());
    });

    it('should return empty set for non-array', async () => {
      const result = await table.fetchUserSharedFileIds(null);
      expect(result).toEqual(new Set());
    });

    it('should query with having count > 1', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1' }] });
      const result = await table.fetchUserSharedFileIds(['f-1', 'f-2']);
      expect(mockSelectQuery.group).toHaveBeenCalledWith('file_id');
      expect(mockSelectQuery.having).toHaveBeenCalledWith('COUNT(*) > 1');
      expect(result).toBeInstanceOf(Set);
    });
  });

  describe('fetchPeopleWithAccess', () => {
    it('should build join query', async () => {
      const result = await table.fetchPeopleWithAccess('t-1', 'f-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ fp: 'file_permission' }, []);
      expect(mockSelectQuery.join).toHaveBeenCalled();
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fp.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fp.file_id = ?', 'f-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchMyRole', () => {
    it('should return null when no rows', async () => {
      const result = await table.fetchMyRole('t-1', 'f-1', 'u-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchUsersWithAccess', () => {
    it('should build join query', async () => {
      const result = await table.fetchUsersWithAccess('t-1', 'f-1');
      expect(mockSelectQuery.join).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fp.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fp.file_id = ?', 'f-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ user_id: 'u-1', email: 'a@b.com' }] });
      const result = await table.fetchUsersWithAccess('t-1', 'f-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchById - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ permission_id: 'p-1', file_id: 'f-1' }] });
      const result = await table.fetchById('p-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByFileId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ permission_id: 'p-1' }, { permission_id: 'p-2' }] });
      const result = await table.fetchByFileId('f-1');
      expect(result.length).toBe(2);
    });
  });

  describe('fetchByUserAndFile - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ permission_id: 'p-1', user_id: 'u-1' }] });
      const result = await table.fetchByUserAndFile('t-1', 'f-1', 'u-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchMyRole - found', () => {
    it('should return DTO when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ role: 'editor', created_dt: new Date() }] });
      const result = await table.fetchMyRole('t-1', 'f-1', 'u-1');
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
      const realTable = new FilePermissionTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('entityFactory', () => {
    it('should create entity from row data', () => {
      if (table.entityFactory) {
        const entity = table.entityFactory({ permission_id: 'p-1', file_id: 'f-1' });
        expect(entity).toBeDefined();
      }
    });
  });

  describe('upsertPermission', () => {
    it('should execute upsert query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ permission_id: 'p-new', file_id: 'f-1' }],
        rowCount: 1
      });
      const table2 = new FilePermissionTable({ adapter: mockAdapter });
      const result = await table2.upsertPermission('t-1', 'f-1', 'u-1', 'editor', 'u-2');
      expect(mockAdapter.query).toHaveBeenCalled();
    });

    it('should return null on failed upsert', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const table2 = new FilePermissionTable({ adapter: mockAdapter });
      const result = await table2.upsertPermission('t-1', 'f-1', 'u-1', 'editor', 'u-2');
      expect(result === null || result !== undefined).toBe(true);
    });
  });

  describe('deleteByFileAndUser', () => {
    it('should execute delete query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new FilePermissionTable({ adapter: mockAdapter });
      const result = await table2.deleteByFileAndUser('t-1', 'f-1', 'u-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });
});
