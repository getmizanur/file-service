const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileDerivativeTable;
beforeAll(() => {
  FileDerivativeTable = require(globalThis.applicationPath('/application/table/file-derivative-table'));
});

describe('FileDerivativeTable', () => {
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
    table = new FileDerivativeTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('file_derivative');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('derivative_id');
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
      const result = await table.fetchById('d-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('derivative_id = ?', 'd-1');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ derivative_id: 'd-1' }] });
      const result = await table.fetchById('d-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByFileId', () => {
    it('should query by file_id', async () => {
      const result = await table.fetchByFileId('f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('file_id = ?', 'f-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ derivative_id: 'd-1' }] });
      const result = await table.fetchByFileId('f-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByFileIdAndKind', () => {
    it('should query by file_id and kind and return null when not found', async () => {
      const result = await table.fetchByFileIdAndKind('f-1', 'thumbnail');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('file_id = ?', 'f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('kind = ?', 'thumbnail');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ derivative_id: 'd-1', kind: 'thumbnail' }] });
      const result = await table.fetchByFileIdAndKind('f-1', 'thumbnail');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByFileWithDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchByFileWithDetails('f-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ d: 'file_derivative' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('d.file_id = ?', 'f-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByFileIdKindSize', () => {
    it('should query by file_id, kind and size and return null when not found', async () => {
      const result = await table.fetchByFileIdKindSize('f-1', 'thumbnail', 256);
      expect(mockSelectQuery.where).toHaveBeenCalledWith('file_id = ?', 'f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('kind = ?', 'thumbnail');
      expect(mockSelectQuery.where).toHaveBeenCalledWith("(spec->>'size')::int = ?", 256);
      expect(mockSelectQuery.where).toHaveBeenCalledWith("status = ?", 'ready');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ derivative_id: 'd-1' }] });
      const result = await table.fetchByFileIdKindSize('f-1', 'thumbnail', 256);
      expect(result).not.toBeNull();
    });
  });

  describe('fetchDerivativeFlags', () => {
    it('should return empty object for empty input', async () => {
      const result = await table.fetchDerivativeFlags([]);
      expect(result).toEqual({});
    });

    it('should return empty object for null input', async () => {
      const result = await table.fetchDerivativeFlags(null);
      expect(result).toEqual({});
    });

    it('should return flags keyed by file_id', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [
          { file_id: 'f-1', kind: 'thumbnail' },
          { file_id: 'f-1', kind: 'preview_pages' },
          { file_id: 'f-2', kind: 'thumbnail' },
        ]
      });
      const result = await table.fetchDerivativeFlags(['f-1', 'f-2']);
      expect(result['f-1']).toEqual({ has_thumbnail: true, has_preview_pages: true });
      expect(result['f-2']).toEqual({ has_thumbnail: true, has_preview_pages: false });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining("kind IN ('thumbnail', 'preview_pages')"),
        [['f-1', 'f-2']]
      );
    });
  });

  describe('fetchFileIdsWithThumbnails', () => {
    it('should return empty set for empty input', async () => {
      const result = await table.fetchFileIdsWithThumbnails([]);
      expect(result).toEqual(new Set());
    });

    it('should return set of file IDs with thumbnails', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ file_id: 'f-1', kind: 'thumbnail' }, { file_id: 'f-2', kind: 'preview_pages' }]
      });
      const result = await table.fetchFileIdsWithThumbnails(['f-1', 'f-2']);
      expect(result).toBeInstanceOf(Set);
      expect(result.has('f-1')).toBe(true);
      expect(result.has('f-2')).toBe(false);
    });
  });

  describe('fetchFileIdsWithPreviewPages', () => {
    it('should return empty set for empty input', async () => {
      const result = await table.fetchFileIdsWithPreviewPages([]);
      expect(result).toEqual(new Set());
    });

    it('should return set of file IDs with preview pages', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ file_id: 'f-1', kind: 'thumbnail' }, { file_id: 'f-2', kind: 'preview_pages' }]
      });
      const result = await table.fetchFileIdsWithPreviewPages(['f-1', 'f-2']);
      expect(result).toBeInstanceOf(Set);
      expect(result.has('f-1')).toBe(false);
      expect(result.has('f-2')).toBe(true);
    });
  });

  describe('insertDerivative', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ derivative_id: 'd-1' }], rowCount: 1 });
      const result = await table.insertDerivative({
        fileId: 'f-1',
        kind: 'thumbnail',
        storageBackendId: 'sb-1',
        objectKey: 'key-1',
      });
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.insertDerivative({
        fileId: 'f-1',
        kind: 'thumbnail',
        storageBackendId: 'sb-1',
        objectKey: 'key-1',
      });
      expect(result).toBeNull();
    });
  });

  describe('upsertDerivative', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ derivative_id: 'd-1' }], rowCount: 1 });
      const result = await table.upsertDerivative({
        fileId: 'f-1',
        kind: 'thumbnail',
        spec: { size: 256 },
        storageBackendId: 'sb-1',
        objectKey: 'key-1',
      });
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.upsertDerivative({
        fileId: 'f-1',
        kind: 'thumbnail',
        spec: '{}',
        storageBackendId: 'sb-1',
        objectKey: 'key-1',
      });
      expect(result).toBeNull();
    });

    it('should handle manifest as string', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ derivative_id: 'd-1' }], rowCount: 1 });
      await table.upsertDerivative({
        fileId: 'f-1',
        kind: 'preview_pages',
        spec: '{}',
        storageBackendId: 'sb-1',
        objectKey: 'key-1',
        manifest: '{"pages":10}',
      });
      expect(mockAdapter.query).toHaveBeenCalled();
    });

    it('should handle manifest as object', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ derivative_id: 'd-1' }], rowCount: 1 });
      await table.upsertDerivative({
        fileId: 'f-1',
        kind: 'preview_pages',
        spec: { size: 100 },
        storageBackendId: 'sb-1',
        objectKey: 'key-1',
        manifest: { pages: 10 },
      });
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it('should execute delete query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.deleteById('d-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('deleteByFileId', () => {
    it('should execute delete query for file', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 3 });
      const result = await table.deleteByFileId('f-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
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
