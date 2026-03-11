const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let AssetTagTable;
beforeAll(() => {
  AssetTagTable = require(globalThis.applicationPath('/application/table/asset-tag-table'));
});

describe('AssetTagTable', () => {
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
    table = new AssetTagTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('asset_tag');
    });

    it('should set composite primary key', () => {
      expect(table.primaryKey).toEqual(['file_id', 'tag_id']);
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
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
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1', tag_id: 'tag-1' }] });
      const result = await table.fetchByFileId('f-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByTagId', () => {
    it('should query by tag_id', async () => {
      const result = await table.fetchByTagId('tag-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tag_id = ?', 'tag-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ file_id: 'f-1', tag_id: 'tag-1' }] });
      const result = await table.fetchByTagId('tag-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByFileWithTagDetails', () => {
    it('should build join query for tag details', async () => {
      const result = await table.fetchByFileWithTagDetails('f-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ at: 'asset_tag' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('at.file_id = ?', 'f-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByTagWithFileDetails', () => {
    it('should build join query for file details', async () => {
      const result = await table.fetchByTagWithFileDetails('tag-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('at.tag_id = ?', 'tag-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('addTag', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ file_id: 'f-1', tag_id: 'tag-1' }], rowCount: 1 });
      const result = await table.addTag('f-1', 'tag-1');
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.addTag('f-1', 'tag-1');
      expect(result).toBeNull();
    });
  });

  describe('removeTag', () => {
    it('should execute delete query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.removeTag('f-1', 'tag-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('removeAllTagsFromFile', () => {
    it('should execute delete query for file', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 3 });
      const result = await table.removeAllTagsFromFile('f-1');
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
