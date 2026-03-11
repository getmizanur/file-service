const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TenantMemberTable;
beforeAll(() => {
  TenantMemberTable = require(globalThis.applicationPath('/application/table/tenant-member-table'));
});

describe('TenantMemberTable', () => {
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
    table = new TenantMemberTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('tenant_member');
    });

    it('should set composite primary key', () => {
      expect(table.primaryKey).toEqual(['tenant_id', 'user_id']);
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new TenantMemberTable({ adapter: mockAdapter, hydrator: customHydrator });
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

  describe('fetchByTenantAndUser', () => {
    it('should return null when no rows found', async () => {
      const result = await table.fetchByTenantAndUser('t-1', 'u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tm.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tm.user_id = ?', 'u-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchByTenantId', () => {
    it('should query by tenant_id', async () => {
      const result = await table.fetchByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tm.tenant_id = ?', 't-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('tm.created_dt', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByUserId', () => {
    it('should query by user_id', async () => {
      const result = await table.fetchByUserId('u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tm.user_id = ?', 'u-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchMembersWithUserDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchMembersWithUserDetails('t-1');
      expect(mockSelectQuery.join).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tm.tenant_id = ?', 't-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply limit and offset', async () => {
      await table.fetchMembersWithUserDetails('t-1', { limit: 10, offset: 5 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(5);
    });

    it('should not apply limit/offset when not provided', async () => {
      await table.fetchMembersWithUserDetails('t-1');
      expect(mockSelectQuery.limit).not.toHaveBeenCalled();
      expect(mockSelectQuery.offset).not.toHaveBeenCalled();
    });

    it('should not apply limit when null', async () => {
      await table.fetchMembersWithUserDetails('t-1', { limit: null, offset: null });
      expect(mockSelectQuery.limit).not.toHaveBeenCalled();
      expect(mockSelectQuery.offset).not.toHaveBeenCalled();
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ user_id: 'u-1', user_email: 'a@b.com' }] });
      const result = await table.fetchMembersWithUserDetails('t-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByTenantAndUser - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tenant_id: 't-1', user_id: 'u-1', role: 'admin' }] });
      const result = await table.fetchByTenantAndUser('t-1', 'u-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTenantId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ user_id: 'u-1' }, { user_id: 'u-2' }] });
      const result = await table.fetchByTenantId('t-1');
      expect(result.length).toBe(2);
    });
  });

  describe('fetchByUserId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ tenant_id: 't-1' }, { tenant_id: 't-2' }] });
      const result = await table.fetchByUserId('u-1');
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
      const realTable = new TenantMemberTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('entityFactory', () => {
    it('should create entity from row data', () => {
      if (table.entityFactory) {
        const entity = table.entityFactory({ tenant_id: 't-1', user_id: 'u-1' });
        expect(entity).toBeDefined();
      }
    });
  });
});
