const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserAuthPasswordTable;
beforeAll(() => {
  UserAuthPasswordTable = require(globalThis.applicationPath('/application/table/user-auth-password-table'));
});

describe('UserAuthPasswordTable', () => {
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
    table = new UserAuthPasswordTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('user_auth_password');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('user_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new UserAuthPasswordTable({ adapter: mockAdapter, hydrator: customHydrator });
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

  describe('fetchByUserId', () => {
    it('should return null when no rows found', async () => {
      const result = await table.fetchByUserId('u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('uap.user_id = ?', 'u-1');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('fetchSecurityProfile', () => {
    it('should return null when no rows', async () => {
      const result = await table.fetchSecurityProfile('u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('uap.user_id = ?', 'u-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchAllSecurityProfiles', () => {
    it('should return array of DTOs', async () => {
      const result = await table.fetchAllSecurityProfiles();
      expect(mockSelectQuery.order).toHaveBeenCalledWith('uap.created_dt', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply limit and offset', async () => {
      await table.fetchAllSecurityProfiles({ limit: 10, offset: 5 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(5);
    });

    it('should not apply limit when null', async () => {
      await table.fetchAllSecurityProfiles({ limit: null, offset: null });
      expect(mockSelectQuery.limit).not.toHaveBeenCalled();
      expect(mockSelectQuery.offset).not.toHaveBeenCalled();
    });

    it('should return DTOs when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ user_id: 'u-1', password_algo: 'bcrypt' }] });
      const result = await table.fetchAllSecurityProfiles();
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByUserId - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ user_id: 'u-1', password_hash: 'hash' }] });
      const result = await table.fetchByUserId('u-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchSecurityProfile - found', () => {
    it('should return DTO when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ user_id: 'u-1', password_algo: 'bcrypt' }] });
      const result = await table.fetchSecurityProfile('u-1');
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
      const realTable = new UserAuthPasswordTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('entityFactory', () => {
    it('should create entity from row data', () => {
      if (table.entityFactory) {
        const entity = table.entityFactory({ user_id: 'u-1', password_hash: 'hash' });
        expect(entity).toBeDefined();
      }
    });
  });
});
