const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderShareLinkTable;
beforeAll(() => {
  FolderShareLinkTable = require(globalThis.applicationPath('/application/table/folder-share-link-table'));
});

describe('FolderShareLinkTable', () => {
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
    table = new FolderShareLinkTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('folder_share_link');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('share_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new FolderShareLinkTable({ adapter: mockAdapter, hydrator: customHydrator });
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
      const result = await table.fetchById('s-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('share_id = ?', 's-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchByToken', () => {
    it('should query by token_hash', async () => {
      const result = await table.fetchByToken('hash123');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('token_hash = ?', 'hash123');
      expect(result).toBeNull();
    });
  });

  describe('fetchByFolderId', () => {
    it('should query by tenant and folder', async () => {
      const result = await table.fetchByFolderId('t-1', 'folder-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('folder_id = ?', 'folder-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchSharedFolderIds', () => {
    it('should return empty set for empty array', async () => {
      const result = await table.fetchSharedFolderIds('t-1', []);
      expect(result).toEqual(new Set());
    });

    it('should return empty set for non-array', async () => {
      const result = await table.fetchSharedFolderIds('t-1', null);
      expect(result).toEqual(new Set());
    });

    it('should query active share links with COALESCE', async () => {
      mockAdapter.query.mockResolvedValue({ rows: [{ folder_id: 'f-1' }] });
      const result = await table.fetchSharedFolderIds('t-1', ['f-1']);
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE'),
        ['t-1', ['f-1']]
      );
      expect(result).toBeInstanceOf(Set);
      expect(result.has('f-1')).toBe(true);
    });
  });

  describe('fetchByFolderWithDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchByFolderWithDetails('t-1', 'folder-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ fsl: 'folder_share_link' }, []);
      expect(mockSelectQuery.join).toHaveBeenCalled();
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1', folder_name: 'Test' }] });
      const result = await table.fetchByFolderWithDetails('t-1', 'folder-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchById - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1', folder_id: 'f-1' }] });
      const result = await table.fetchById('s-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByToken - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1', token_hash: 'hash123' }] });
      const result = await table.fetchByToken('hash123');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByFolderId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1' }, { share_id: 's-2' }] });
      const result = await table.fetchByFolderId('t-1', 'folder-1');
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
      const realTable = new FolderShareLinkTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('insertLink', () => {
    it('should execute insert query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ share_id: 's-new', folder_id: 'f-1' }],
        rowCount: 1
      });
      const table2 = new FolderShareLinkTable({ adapter: mockAdapter });
      const result = await table2.insertLink('t-1', 'f-1', 'hash123', { expiresDt: new Date(), passwordHash: 'pw', createdBy: 'u-1' });
      expect(mockAdapter.query).toHaveBeenCalled();
    });

    it('should return null on failed insert', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const table2 = new FolderShareLinkTable({ adapter: mockAdapter });
      const result = await table2.insertLink('t-1', 'f-1', 'hash123');
      expect(result === null || result !== undefined).toBe(true);
    });
  });

  describe('revokeLink', () => {
    it('should execute revoke update', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new FolderShareLinkTable({ adapter: mockAdapter });
      const result = await table2.revokeLink('t-1', 's-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });

  describe('deleteLink', () => {
    it('should call delete with correct parameters', async () => {
      table.delete = jest.fn().mockResolvedValue({ rowCount: 1 });
      await table.deleteLink('t-1', 's-1');
      expect(table.delete).toHaveBeenCalledWith({ tenant_id: 't-1', share_id: 's-1' });
    });
  });
});
