const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileMetadataTable;
beforeAll(() => {
  FileMetadataTable = require(globalThis.applicationPath('/application/table/file-metadata-table'));
});

describe('FileMetadataTable', () => {
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
      executeRaw: jest.fn().mockResolvedValue({ rows: [] }),
    };
    mockAdapter = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    table = new FileMetadataTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('file_metadata');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('file_id');
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
      const result = await table.fetchById('f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('file_id = ?', 'f-1');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1' }] });
      const result = await table.fetchById('f-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByIds', () => {
    it('should return empty array for empty ids', async () => {
      const result = await table.fetchByIds([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for null ids', async () => {
      const result = await table.fetchByIds(null);
      expect(result).toEqual([]);
    });

    it('should query with whereIn', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1' }] });
      const result = await table.fetchByIds(['f-1', 'f-2']);
      expect(mockSelectQuery.whereIn).toHaveBeenCalledWith('file_id', ['f-1', 'f-2']);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1' }, { file_id: 'f-2' }] });
      const result = await table.fetchByIds(['f-1', 'f-2']);
      expect(result.length).toBe(2);
    });
  });

  describe('fetchByTenantId', () => {
    it('should query by tenant_id with soft delete filter', async () => {
      await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'DESC');
    });

    it('should apply limit and offset', async () => {
      await table.fetchByTenantId('t-1', { limit: 10, offset: 5 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(5);
    });

    it('should not apply limit/offset when not provided', async () => {
      await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.limit).not.toHaveBeenCalled();
      expect(mockSelectQuery.offset).not.toHaveBeenCalled();
    });
  });

  describe('fetchByPublicKey', () => {
    it('should query by public_key and return null when not found', async () => {
      const result = await table.fetchByPublicKey('pk-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('public_key = ?', 'pk-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1', public_key: 'pk-1' }] });
      const result = await table.fetchByPublicKey('pk-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByIdIncludeDeleted', () => {
    it('should delegate to fetchById', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1' }] });
      const result = await table.fetchByIdIncludeDeleted('f-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchFilesByFolder', () => {
    it('should build folder files query', async () => {
      const result = await table.fetchFilesByFolder('test@example.com', 'folder-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ fm: 'file_metadata' }, []);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('au.email = ?', 'test@example.com');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fm.folder_id = ?', 'folder-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should use IS NULL for null folderId', async () => {
      await table.fetchFilesByFolder('test@example.com', null);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fm.folder_id IS NULL');
    });

    it('should apply sort mode last_modified', async () => {
      await table.fetchFilesByFolder('test@example.com', 'f-1', null, 0, 'last_modified');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('COALESCE(fm.updated_dt, fm.created_dt)', 'DESC');
    });

    it('should apply sort mode size', async () => {
      await table.fetchFilesByFolder('test@example.com', 'f-1', null, 0, 'size');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('fm.size_bytes', 'DESC');
    });

    it('should apply sort mode owner', async () => {
      await table.fetchFilesByFolder('test@example.com', 'f-1', null, 0, 'owner');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('u.display_name', 'ASC');
    });

    it('should apply default sort mode name', async () => {
      await table.fetchFilesByFolder('test@example.com', 'f-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('name', 'ASC');
    });

    it('should apply limit and offset when provided', async () => {
      await table.fetchFilesByFolder('test@example.com', 'f-1', 10, 5);
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(5);
    });
  });

  describe('fetchFilesByFolderCount', () => {
    it('should return count', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [{ total: '5' }] });
      const result = await table.fetchFilesByFolderCount('test@example.com', 'f-1');
      expect(result).toBe(5);
    });

    it('should return 0 when no rows', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [] });
      const result = await table.fetchFilesByFolderCount('test@example.com', 'f-1');
      expect(result).toBe(0);
    });

    it('should handle null folderId', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [{ total: '3' }] });
      const result = await table.fetchFilesByFolderCount('test@example.com', null);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fm.folder_id IS NULL');
      expect(result).toBe(3);
    });
  });

  describe('fetchRecent', () => {
    it('should return empty array when user not found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [] });
      const result = await table.fetchRecent('test@example.com');
      expect(result).toEqual([]);
    });

    it('should query recent files with tenantId provided', async () => {
      // First call resolves user, second call fetches files
      mockSelectQuery.execute
        .mockResolvedValueOnce({ rows: [{ user_id: 'u-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await table.fetchRecent('test@example.com', 50, 't-1');
      expect(result).toEqual([]);
    });

    it('should resolve tenantId when not provided', async () => {
      mockSelectQuery.execute
        .mockResolvedValueOnce({ rows: [{ user_id: 'u-1', tenant_id: 't-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await table.fetchRecent('test@example.com');
      expect(result).toEqual([]);
    });
  });

  describe('fetchSharedWithMe', () => {
    it('should build shared files query', async () => {
      const result = await table.fetchSharedWithMe('u-1', 't-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ fp: 'file_permission' }, []);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fp.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fp.user_id = ?', 'u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith("fp.role <> 'owner'");
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply limit and offset', async () => {
      await table.fetchSharedWithMe('u-1', 't-1', 25, 10);
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(25);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('fetchDeletedFiles', () => {
    it('should build deleted files query', async () => {
      const result = await table.fetchDeletedFiles('test@example.com');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('au.email = ?', 'test@example.com');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fm.deleted_at IS NOT NULL');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('fm.deleted_at', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchSearchResults', () => {
    it('should build search query with search term', async () => {
      const result = await table.fetchSearchResults('t-1', 'u-1', 'report');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fm.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fm.title ILIKE ?', '%report%');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply intitle filter', async () => {
      await table.fetchSearchResults('t-1', 'u-1', null, 20, 0, { intitle: 'budget' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith(
        'COALESCE(fm.title, fm.original_filename) ~* ?',
        expect.stringContaining('budget')
      );
    });

    it('should apply allintitle filter', async () => {
      await table.fetchSearchResults('t-1', 'u-1', null, 20, 0, { allintitle: ['budget', 'q4'] });
      expect(mockSelectQuery.where).toHaveBeenCalledWith(
        'COALESCE(fm.title, fm.original_filename) ~* ?',
        expect.stringContaining('budget')
      );
      expect(mockSelectQuery.where).toHaveBeenCalledWith(
        'COALESCE(fm.title, fm.original_filename) ~* ?',
        expect.stringContaining('q4')
      );
    });

    it('should apply fileExtension filter', async () => {
      await table.fetchSearchResults('t-1', 'u-1', 'report', 20, 0, { fileExtension: 'PDF' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith('LOWER(fm.original_filename) LIKE ?', '%.pdf');
    });

    it('should apply author filter', async () => {
      await table.fetchSearchResults('t-1', 'u-1', 'report', 20, 0, { author: 'Jane' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith('u.display_name ILIKE ?', '%Jane%');
    });

    it('should apply limit and offset', async () => {
      await table.fetchSearchResults('t-1', 'u-1', 'test', 15, 30);
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(15);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(30);
    });
  });

  describe('fetchSearchResultsCount', () => {
    it('should return count', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [{ total: '12' }] });
      const result = await table.fetchSearchResultsCount('t-1', 'u-1', 'report');
      expect(result).toBe(12);
    });

    it('should return 0 when no results', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [] });
      const result = await table.fetchSearchResultsCount('t-1', 'u-1', 'nonexistent');
      expect(result).toBe(0);
    });

    it('should apply intitle filter', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [{ total: '3' }] });
      await table.fetchSearchResultsCount('t-1', 'u-1', null, { intitle: 'budget' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith(
        'COALESCE(fm.title, fm.original_filename) ~* ?',
        expect.stringContaining('budget')
      );
    });

    it('should apply fileExtension filter', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [{ total: '1' }] });
      await table.fetchSearchResultsCount('t-1', 'u-1', 'report', { fileExtension: 'docx' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith('LOWER(fm.original_filename) LIKE ?', '%.docx');
    });

    it('should apply allintitle filter with multiple terms', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [{ total: '2' }] });
      await table.fetchSearchResultsCount('t-1', 'u-1', null, { allintitle: ['budget', 'report'] });
      const calls = mockSelectQuery.where.mock.calls.map(c => c[0]);
      const allintitleCalls = calls.filter(c => c.includes('COALESCE(fm.title'));
      expect(allintitleCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply author filter', async () => {
      mockSelectQuery.executeRaw.mockResolvedValue({ rows: [{ total: '5' }] });
      await table.fetchSearchResultsCount('t-1', 'u-1', 'test', { author: 'Alice' });
      expect(mockSelectQuery.where).toHaveBeenCalledWith('u.display_name ILIKE ?', '%Alice%');
    });
  });

  describe('hasFilesByFolder', () => {
    it('should return true when files exist', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1' }] });
      const result = await table.hasFilesByFolder('folder-1');
      expect(result).toBe(true);
    });

    it('should return false when no files', async () => {
      const result = await table.hasFilesByFolder('folder-1');
      expect(result).toBe(false);
    });
  });

  describe('updateSubStatus', () => {
    it('should execute update with correct conditions', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.updateSubStatus('f-1', 't-1', { sub_status: 'processed' });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('deleteAllTrashed()', () => {
    it('calls adapter.query with DELETE SQL and tenantId', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rowCount: 3 });
      await table.deleteAllTrashed('t-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM file_metadata'),
        ['t-1']
      );
    });

    it('returns query result', async () => {
      const expected = { rowCount: 5 };
      mockAdapter.query = jest.fn().mockResolvedValue(expected);
      const result = await table.deleteAllTrashed('t-1');
      expect(result).toBe(expected);
    });
  });

  describe('restoreAllTrashed()', () => {
    it('calls adapter.query with UPDATE SQL and params', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rowCount: 2 });
      await table.restoreAllTrashed('t-1', 'admin@test.com');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE file_metadata'),
        ['t-1', 'admin@test.com']
      );
    });

    it('returns query result', async () => {
      const expected = { rowCount: 4 };
      mockAdapter.query = jest.fn().mockResolvedValue(expected);
      const result = await table.restoreAllTrashed('t-1', 'u1');
      expect(result).toBe(expected);
    });
  });

  describe('calculateSize()', () => {
    it('returns zero counts when both arrays are empty', async () => {
      const result = await table.calculateSize([], [], 't-1');
      expect(result).toEqual({ total_bytes: 0, file_count: 0 });
    });

    it('returns zero counts when both are null/undefined', async () => {
      const result = await table.calculateSize(null, null, 't-1');
      expect(result).toEqual({ total_bytes: 0, file_count: 0 });
    });

    it('calls adapter.query with fileIds only', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ total_bytes: '1024', file_count: '2' }]
      });
      const result = await table.calculateSize(['f-1', 'f-2'], [], 't-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        expect.arrayContaining(['t-1', ['f-1', 'f-2']])
      );
      expect(result).toEqual({ total_bytes: 1024, file_count: 2 });
    });

    it('calls adapter.query with folderIds only', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ total_bytes: '2048', file_count: '5' }]
      });
      const result = await table.calculateSize([], ['fold-1'], 't-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        expect.arrayContaining(['t-1', ['fold-1']])
      );
      expect(result).toEqual({ total_bytes: 2048, file_count: 5 });
    });

    it('calls adapter.query with both fileIds and folderIds', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ total_bytes: '4096', file_count: '10' }]
      });
      const result = await table.calculateSize(['f-1'], ['fold-1'], 't-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        expect.arrayContaining(['t-1'])
      );
      expect(result).toEqual({ total_bytes: 4096, file_count: 10 });
    });

    it('returns zero when query returns no rows', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [] });
      const result = await table.calculateSize(['f-1'], [], 't-1');
      expect(result).toEqual({ total_bytes: 0, file_count: 0 });
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

    it('should handle undefined', () => {
      expect(table._normalizeRows(undefined)).toEqual([]);
    });

    it('should handle non-array non-object', () => {
      expect(table._normalizeRows('string')).toEqual([]);
    });
  });

  describe('_hydrateToDtoArray', () => {
    it('should return an array', () => {
      const result = table._hydrateToDtoArray([], {});
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
