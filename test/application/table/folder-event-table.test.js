const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderEventTable;
beforeAll(() => {
  FolderEventTable = require(globalThis.applicationPath('/application/table/folder-event-table'));
});

describe('FolderEventTable', () => {
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
    table = new FolderEventTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('folder_event');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('event_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new FolderEventTable({ adapter: mockAdapter, hydrator: customHydrator });
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
      const result = await table.fetchById('e-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fe.event_id = ?', 'e-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchByFolderId', () => {
    it('should query by folder_id', async () => {
      const result = await table.fetchByFolderId('folder-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fe.folder_id = ?', 'folder-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('fe.created_dt', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchActivityByFolderId', () => {
    it('should build join query for activity feed', async () => {
      const result = await table.fetchActivityByFolderId('folder-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ fe: 'folder_event' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('fe.folder_id = ?', 'folder-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply limit and offset', async () => {
      await table.fetchActivityByFolderId('folder-1', { limit: 10, offset: 5 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(5);
    });

    it('should not apply limit when null', async () => {
      await table.fetchActivityByFolderId('folder-1', { limit: null, offset: null });
      expect(mockSelectQuery.limit).not.toHaveBeenCalled();
      expect(mockSelectQuery.offset).not.toHaveBeenCalled();
    });
  });

  describe('fetchRecentByTenant', () => {
    it('should build complex join query', async () => {
      const result = await table.fetchRecentByTenant('t-1', 20);
      expect(mockSelectQuery.join).toHaveBeenCalled();
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('f.deleted_at IS NULL');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(20);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ folder_id: 'f-1', name: 'Test' }] });
      const result = await table.fetchRecentByTenant('t-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchById - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ event_id: 'e-1', folder_id: 'f-1' }] });
      const result = await table.fetchById('e-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByFolderId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ event_id: 'e-1' }, { event_id: 'e-2' }] });
      const result = await table.fetchByFolderId('folder-1');
      expect(result.length).toBe(2);
    });
  });

  describe('fetchActivityByFolderId - with results', () => {
    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ event_id: 'e-1', event_type: 'CREATED' }] });
      const result = await table.fetchActivityByFolderId('folder-1');
      expect(result.length).toBe(1);
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
      const realTable = new FolderEventTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('insertEvent', () => {
    it('should execute insert query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new FolderEventTable({ adapter: mockAdapter });
      await table2.insertEvent('f-1', 'CREATED', { reason: 'test' }, 'u-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });

    it('should handle null detail', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new FolderEventTable({ adapter: mockAdapter });
      await table2.insertEvent('f-1', 'DELETED', null, 'u-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });
});
