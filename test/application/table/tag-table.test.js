const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TagTable;
beforeAll(() => {
  TagTable = require(globalThis.applicationPath('/application/table/tag-table'));
});

describe('TagTable', () => {
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
      groupBy: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };
    mockAdapter = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    table = new TagTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('tag');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('tag_id');
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
      const result = await table.fetchById('tag-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tag_id = ?', 'tag-1');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tag_id: 'tag-1' }] });
      const result = await table.fetchById('tag-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantId', () => {
    it('should query by tenant_id', async () => {
      const result = await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('name', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tag_id: 'tag-1' }] });
      const result = await table.fetchByTenantId('t-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByName', () => {
    it('should query by tenant and name and return null when not found', async () => {
      const result = await table.fetchByName('t-1', 'important');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('name = ?', 'important');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tag_id: 'tag-1', name: 'important' }] });
      const result = await table.fetchByName('t-1', 'important');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantWithDetails', () => {
    it('should build join query with grouping', async () => {
      const result = await table.fetchByTenantWithDetails('t-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ t: 'tag' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.groupBy).toHaveBeenCalledWith('t.tag_id');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('t.tenant_id = ?', 't-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('insert', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ tag_id: 'tag-1' }], rowCount: 1 });
      const result = await table.insert('t-1', 'new-tag');
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.insert('t-1', 'new-tag');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should execute update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.update('tag-1', 'renamed-tag');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('deleteById', () => {
    it('should execute delete query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.deleteById('tag-1');
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
