const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let ShareLinkTable;
beforeAll(() => {
  ShareLinkTable = require(globalThis.applicationPath('/application/table/share-link-table'));
});

describe('ShareLinkTable', () => {
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
    table = new ShareLinkTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('share_link');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('share_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new ShareLinkTable({ adapter: mockAdapter, hydrator: customHydrator });
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
      expect(mockSelectQuery.where).toHaveBeenCalledWith('sl.share_id = ?', 's-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchByToken', () => {
    it('should query by token_hash', async () => {
      const result = await table.fetchByToken('hash123');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('sl.token_hash = ?', 'hash123');
      expect(result).toBeNull();
    });
  });

  describe('fetchByFileId', () => {
    it('should query by file_id', async () => {
      const result = await table.fetchByFileId('f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('sl.file_id = ?', 'f-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('sl.created_dt', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchActiveByFileId', () => {
    it('should query with active filters', async () => {
      const result = await table.fetchActiveByFileId('f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('sl.file_id = ?', 'f-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('sl.revoked_dt IS NULL');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('fetchSharedFileIds', () => {
    it('should return empty set for empty array', async () => {
      const result = await table.fetchSharedFileIds([]);
      expect(result).toEqual(new Set());
    });

    it('should return empty set for non-array', async () => {
      const result = await table.fetchSharedFileIds(null);
      expect(result).toEqual(new Set());
    });

    it('should query active share links using raw adapter query', async () => {
      mockAdapter.query.mockResolvedValue({ rows: [{ file_id: 'f-1' }] });
      const result = await table.fetchSharedFileIds(['f-1']);
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT'),
        [['f-1']]
      );
      expect(result).toBeInstanceOf(Set);
      expect(result.has('f-1')).toBe(true);
    });
  });

  describe('fetchDtoByToken', () => {
    it('should return null when no rows', async () => {
      const result = await table.fetchDtoByToken('hash123');
      expect(result).toBeNull();
    });
  });

  describe('fetchDtosByFileId', () => {
    it('should return array of DTOs', async () => {
      const result = await table.fetchDtosByFileId('f-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1', file_id: 'f-1' }] });
      const result = await table.fetchDtosByFileId('f-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchById - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1', file_id: 'f-1' }] });
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

  describe('fetchByFileId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1' }, { share_id: 's-2' }] });
      const result = await table.fetchByFileId('f-1');
      expect(result.length).toBe(2);
    });
  });

  describe('fetchActiveByFileId - found', () => {
    it('should return entity when active link found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1', file_id: 'f-1' }] });
      const result = await table.fetchActiveByFileId('f-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchDtoByToken - found', () => {
    it('should return DTO when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ share_id: 's-1', token_hash: 'hash123' }] });
      const result = await table.fetchDtoByToken('hash123');
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
      const realTable = new ShareLinkTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('entityFactory', () => {
    it('should create entity from row data', () => {
      if (table.entityFactory) {
        const entity = table.entityFactory({ share_id: 's-1', file_id: 'f-1' });
        expect(entity).toBeDefined();
      }
    });
  });

  describe('revoke', () => {
    it('should execute revoke update', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new ShareLinkTable({ adapter: mockAdapter });
      const result = await table2.revoke('t-1', 'f-1');
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should call insert with data', async () => {
      table.insert = jest.fn().mockResolvedValue({ share_id: 's-new' });
      const data = { tenant_id: 't-1', file_id: 'f-1', token_hash: 'hash' };
      const result = await table.create(data);
      expect(table.insert).toHaveBeenCalledWith(data);
    });
  });
});
