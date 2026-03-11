const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let CollectionAssetTable;
beforeAll(() => {
  CollectionAssetTable = require(globalThis.applicationPath('/application/table/collection-asset-table'));
});

describe('CollectionAssetTable', () => {
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
    table = new CollectionAssetTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('collection_asset');
    });

    it('should set composite primary key', () => {
      expect(table.primaryKey).toEqual(['collection_id', 'file_id']);
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    });
  });

  describe('fetchByCollectionId', () => {
    it('should query by collection_id', async () => {
      const result = await table.fetchByCollectionId('c-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('collection_id = ?', 'c-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ collection_id: 'c-1', file_id: 'f-1' }] });
      const result = await table.fetchByCollectionId('c-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByFileId', () => {
    it('should query by file_id', async () => {
      const result = await table.fetchByFileId('f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('file_id = ?', 'f-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ collection_id: 'c-1', file_id: 'f-1' }] });
      const result = await table.fetchByFileId('f-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByCollectionWithFileDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchByCollectionWithFileDetails('c-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ ca: 'collection_asset' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('ca.collection_id = ?', 'c-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByFileWithCollectionDetails', () => {
    it('should build join query for collection details', async () => {
      const result = await table.fetchByFileWithCollectionDetails('f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('ca.file_id = ?', 'f-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('addAsset', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ collection_id: 'c-1', file_id: 'f-1' }], rowCount: 1 });
      const result = await table.addAsset('c-1', 'f-1');
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.addAsset('c-1', 'f-1');
      expect(result).toBeNull();
    });
  });

  describe('removeAsset', () => {
    it('should execute delete query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.removeAsset('c-1', 'f-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('removeAllAssetsFromCollection', () => {
    it('should execute delete query for collection', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 5 });
      const result = await table.removeAllAssetsFromCollection('c-1');
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
