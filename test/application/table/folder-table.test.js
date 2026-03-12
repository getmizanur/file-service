const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderTable;
beforeAll(() => {
  FolderTable = require(globalThis.applicationPath('/application/table/folder-table'));
});

describe('FolderTable', () => {
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
    table = new FolderTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
    table.select = jest.fn().mockResolvedValue([]);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('folder');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('folder_id');
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    });

    it('should exclude owner from columns', () => {
      const cols = table.baseColumns();
      expect(cols).not.toContain('owner');
    });
  });

  describe('constructor edge cases', () => {
    it('should create instance with no arguments', () => {
      const t = new FolderTable();
      expect(t.table).toBe('folder');
      expect(t.hydrator).toBeDefined();
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new FolderTable({ adapter: mockAdapter, hydrator: customHydrator });
      expect(t.hydrator).toBe(customHydrator);
    });

    it('should use fallback hydrator in methods when hydrator is nulled', async () => {
      const t = new FolderTable({ adapter: mockAdapter });
      t.hydrator = null;
      t.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
      t.select = jest.fn().mockResolvedValue([]);
      // This triggers `this.hydrator || new ClassMethodsHydrator()` in fetchByUserEmail
      const result = await t.fetchByUserEmail('test@test.com');
      expect(t.select).toHaveBeenCalled();
    });

    it('should use fallback hydrator in fetchByParent when hydrator is nulled', async () => {
      const t = new FolderTable({ adapter: mockAdapter });
      t.hydrator = null;
      t.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
      t.select = jest.fn().mockResolvedValue([]);
      const result = await t.fetchByParent('p1', 't1');
      expect(t.select).toHaveBeenCalled();
    });

    it('should use fallback hydrator in fetchDeletedFolders when hydrator is nulled', async () => {
      const t = new FolderTable({ adapter: mockAdapter });
      t.hydrator = null;
      t.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
      t.select = jest.fn().mockResolvedValue([]);
      const result = await t.fetchDeletedFolders('test@test.com');
      expect(t.select).toHaveBeenCalled();
    });

    it('should use fallback hydrator in fetchSearchResults when hydrator is nulled', async () => {
      const t = new FolderTable({ adapter: mockAdapter });
      t.hydrator = null;
      t.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
      t.select = jest.fn().mockResolvedValue([]);
      const result = await t.fetchSearchResults('t1', 'u1', 'test');
      expect(t.select).toHaveBeenCalled();
    });
  });

  describe('getSelectQuery', () => {
    it('should create a Select query object', async () => {
      const realTable = new FolderTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('fetchById', () => {
    it('should return entity when found', async () => {
      const mockEntity = { getFolderId: () => 'f1' };
      table.select = jest.fn().mockResolvedValue([mockEntity]);

      const result = await table.fetchById('f1');
      expect(result).toBe(mockEntity);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('folder_id = ?', 'f1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when not found', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      const result = await table.fetchById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('fetchByTenant', () => {
    it('should query by tenant_id with soft delete filter', async () => {
      const mockEntities = [{ name: 'folder1' }, { name: 'folder2' }];
      table.select = jest.fn().mockResolvedValue(mockEntities);

      const result = await table.fetchByTenant('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('name');
      expect(result).toBe(mockEntities);
    });
  });

  describe('fetchByParent', () => {
    it('should build join query for parent folder with default sort', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      const result = await table.fetchByParent('parent-1', 't-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ f: 'folder' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.parent_folder_id = ?', 'parent-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.deleted_at IS NULL');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('f.name', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should sort by last_modified', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      await table.fetchByParent('parent-1', 't-1', 'last_modified');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('COALESCE(f.updated_dt, f.created_dt)', 'DESC');
    });

    it('should sort by owner', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      await table.fetchByParent('parent-1', 't-1', 'owner');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('u.display_name', 'ASC');
    });

    it('should sort by size (fallback to name)', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      await table.fetchByParent('parent-1', 't-1', 'size');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('f.name', 'ASC');
    });
  });

  describe('fetchByUserEmail', () => {
    it('should build join query with email filter', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      const result = await table.fetchByUserEmail('user@example.com');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ f: 'folder' }, []);
      expect(mockSelectQuery.join).toHaveBeenCalledWith({ tm: 'tenant_member' }, 'f.tenant_id = tm.tenant_id', []);
      expect(mockSelectQuery.join).toHaveBeenCalledWith({ u: 'app_user' }, 'tm.user_id = u.user_id', []);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('u.email = ?', 'user@example.com');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.deleted_at IS NULL');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchDeletedFolders', () => {
    it('should build query for deleted folders', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      const result = await table.fetchDeletedFolders('user@example.com');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('u.email = ?', 'user@example.com');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.deleted_at IS NOT NULL');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('f.deleted_at', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByIdIncludeDeleted', () => {
    it('should return entity without deleted_at filter', async () => {
      const mockEntity = { getFolderId: () => 'f1' };
      table.select = jest.fn().mockResolvedValue([mockEntity]);
      const result = await table.fetchByIdIncludeDeleted('f1');
      expect(result).toBe(mockEntity);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('folder_id = ?', 'f1');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when not found', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      const result = await table.fetchByIdIncludeDeleted('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('fetchRootByTenantId', () => {
    it('should query for root folder and return when found', async () => {
      const mockEntity = { getFolderId: () => 'root-1' };
      table.select = jest.fn().mockResolvedValue([mockEntity]);
      const result = await table.fetchRootByTenantId('t-1');
      expect(result).toBe(mockEntity);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('parent_folder_id IS NULL');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when not found', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      const result = await table.fetchRootByTenantId('t-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchSearchResults', () => {
    it('should build search query with searchTerm', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      const result = await table.fetchSearchResults('t-1', 'u-1', 'documents');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.deleted_at IS NULL');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.created_by = ?', 'u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.name ILIKE ?', '%documents%');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('COALESCE(f.updated_dt, f.created_dt)', 'DESC');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(50);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply intitle search', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      await table.fetchSearchResults('t-1', 'u-1', null, 50, { intitle: 'report' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.name ~* ?', expect.stringContaining('report'));
    });

    it('should apply allintitle search', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      await table.fetchSearchResults('t-1', 'u-1', null, 50, { allintitle: ['report', 'annual'] });
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.name ~* ?', expect.stringContaining('report'));
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.name ~* ?', expect.stringContaining('annual'));
    });

    it('should apply author filter', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      await table.fetchSearchResults('t-1', 'u-1', 'docs', 50, { author: 'John' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith('u.display_name ILIKE ?', '%John%');
    });

    it('should use custom limit', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      await table.fetchSearchResults('t-1', 'u-1', 'docs', 20);
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(20);
    });

    it('should skip search term filters when none provided', async () => {
      table.select = jest.fn().mockResolvedValue([]);
      await table.fetchSearchResults('t-1', 'u-1', null);
      expect(mockSelectQuery.where).not.toHaveBeenCalledWith('f.name ILIKE ?', expect.anything());
    });
  });

  describe('isDescendantOf', () => {
    it('should return true when descendant found', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ found: 1 }] });
      const result = await table.isDescendantOf('t-1', 'child-1', 'ancestor-1');
      expect(result).toBe(true);
      expect(mockAdapter.query).toHaveBeenCalledWith(expect.stringContaining('WITH RECURSIVE'), ['t-1', 'ancestor-1', 'child-1']);
    });

    it('should return false when not descendant', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [] });
      const result = await table.isDescendantOf('t-1', 'child-1', 'ancestor-1');
      expect(result).toBe(false);
    });

    it('should return falsy when rows is undefined', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({});
      const result = await table.isDescendantOf('t-1', 'child-1', 'ancestor-1');
      expect(result).toBeFalsy();
    });
  });

  describe('create', () => {
    it('should return folder_id from insertedRecord when rows returned', async () => {
      // adapter returns rows, so Insert.execute() produces insertedRecord = rows[0]
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ folder_id: 'new-f1' }], rowCount: 1 });
      const result = await table.create({ name: 'New Folder', tenant_id: 't-1' });
      expect(result).toBe('new-f1');
    });

    it('should return insertedId when no rows but insertedId is set', async () => {
      // adapter returns no rows but provides insertedId
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1, insertedId: 'fallback-id' });
      const result = await table.create({ name: 'Test', tenant_id: 't-1' });
      expect(result).toBe('fallback-id');
    });

    it('should return null when insert returns no rows and no insertedId', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.create({ name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('fetchAllDescendantFolderIds()', () => {
    it('returns folder IDs from recursive query result', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ folder_id: 'root' }, { folder_id: 'child1' }, { folder_id: 'child2' }]
      });
      const result = await table.fetchAllDescendantFolderIds('root', 't1');
      expect(result).toEqual(['root', 'child1', 'child2']);
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        ['t1', 'root']
      );
    });

    it('returns empty array when no descendants found', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [] });
      const result = await table.fetchAllDescendantFolderIds('leaf', 't1');
      expect(result).toEqual([]);
    });

    it('handles missing rows property gracefully', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({});
      const result = await table.fetchAllDescendantFolderIds('f1', 't1');
      expect(result).toEqual([]);
    });
  });

  describe('deleteAllTrashed()', () => {
    it('calls adapter.query with correct SQL and tenantId', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rowCount: 5 });
      await table.deleteAllTrashed('t1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM folder'),
        ['t1']
      );
      expect(mockAdapter.query.mock.calls[0][0]).toContain('deleted_at IS NOT NULL');
    });

    it('returns query result', async () => {
      const expected = { rowCount: 3 };
      mockAdapter.query = jest.fn().mockResolvedValue(expected);
      const result = await table.deleteAllTrashed('t1');
      expect(result).toBe(expected);
    });
  });

  describe('restoreAllTrashed()', () => {
    it('calls adapter.query with correct SQL, tenantId and updatedBy', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rowCount: 2 });
      await table.restoreAllTrashed('t1', 'admin@test.com');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE folder'),
        ['t1', 'admin@test.com']
      );
      expect(mockAdapter.query.mock.calls[0][0]).toContain('deleted_at = NULL');
    });

    it('returns query result', async () => {
      const expected = { rowCount: 4 };
      mockAdapter.query = jest.fn().mockResolvedValue(expected);
      const result = await table.restoreAllTrashed('t1', 'u1');
      expect(result).toBe(expected);
    });
  });
});
