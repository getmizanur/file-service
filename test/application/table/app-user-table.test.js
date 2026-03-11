const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let AppUserTable;
beforeAll(() => {
  AppUserTable = require(globalThis.applicationPath('/application/table/app-user-table'));
});

describe('AppUserTable', () => {
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
      _addParameter: jest.fn().mockReturnValue('$1'),
    };
    mockAdapter = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    table = new AppUserTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
    table.select = jest.fn().mockResolvedValue([]);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('app_user');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('user_id');
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
    it('should query by primary key and return null when not found', async () => {
      const result = await table.fetchById('u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });

    it('should return first result when found', async () => {
      const entity = { user_id: 'u-1' };
      table.select.mockResolvedValue([entity]);
      const result = await table.fetchById('u-1');
      expect(result).toBe(entity);
    });
  });

  describe('fetchByEmail', () => {
    it('should query by email', async () => {
      const result = await table.fetchByEmail('test@example.com');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('email = ?', 'test@example.com');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
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

    it('should query with whereIn for valid ids', async () => {
      table.select.mockResolvedValue([]);
      await table.fetchByIds(['u-1', 'u-2']);
      expect(mockSelectQuery.whereIn).toHaveBeenCalledWith('user_id', ['u-1', 'u-2']);
    });

    it('should deduplicate ids', async () => {
      table.select.mockResolvedValue([]);
      await table.fetchByIds(['u-1', 'u-1', 'u-2']);
      expect(mockSelectQuery.whereIn).toHaveBeenCalledWith('user_id', ['u-1', 'u-2']);
    });
  });

  describe('searchByTerm', () => {
    it('should build search query with term', async () => {
      await table.searchByTerm('john', 't-1', 10);
      expect(mockSelectQuery.from).toHaveBeenCalled();
      expect(mockSelectQuery.join).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tm.tenant_id = ?', 't-1');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should handle null term', async () => {
      await table.searchByTerm(null, 't-1');
      expect(mockSelectQuery.from).toHaveBeenCalled();
    });
  });

  describe('resolveByEmail', () => {
    it('should throw when user not found', async () => {
      await expect(table.resolveByEmail('missing@example.com')).rejects.toThrow('User not found');
    });
  });

  describe('fetchWithTenantByEmail', () => {
    it('should return null when not found', async () => {
      const result = await table.fetchWithTenantByEmail('test@example.com');
      expect(result).toBeNull();
    });
  });

  describe('fetchByEmailInTenant', () => {
    it('should query by tenant and email', async () => {
      const result = await table.fetchByEmailInTenant('t-1', 'test@example.com');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tm.tenant_id = ?', 't-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('au.email = ?', 'test@example.com');
      expect(result).toBeNull();
    });

    it('should return DTO when found', async () => {
      const dto = { user_id: 'u-1', tenant_id: 't-1' };
      table.select.mockResolvedValue([dto]);
      const result = await table.fetchByEmailInTenant('t-1', 'test@example.com');
      expect(result).toBe(dto);
    });
  });

  describe('fetchByEmail - found', () => {
    it('should return entity when found', async () => {
      const entity = { user_id: 'u-1', email: 'test@example.com' };
      table.select.mockResolvedValue([entity]);
      const result = await table.fetchByEmail('test@example.com');
      expect(result).toBe(entity);
    });
  });

  describe('fetchByIds - with results', () => {
    it('should return entities when found', async () => {
      const entities = [{ user_id: 'u-1' }, { user_id: 'u-2' }];
      table.select.mockResolvedValue(entities);
      const result = await table.fetchByIds(['u-1', 'u-2']);
      expect(result).toBe(entities);
    });
  });

  describe('searchByTerm - with results', () => {
    it('should return DTOs when found', async () => {
      const dtos = [{ user_id: 'u-1', email: 'john@test.com' }];
      table.select.mockResolvedValue(dtos);
      const result = await table.searchByTerm('john', 't-1', 10);
      expect(result).toBe(dtos);
    });

    it('should handle empty term', async () => {
      table.select.mockResolvedValue([]);
      const result = await table.searchByTerm('', 't-1');
      expect(mockSelectQuery.from).toHaveBeenCalled();
    });
  });

  describe('resolveByEmail - found', () => {
    it('should return DTO when user found', async () => {
      const dto = { user_id: 'u-1', tenant_id: 't-1' };
      table.select.mockResolvedValue([dto]);
      const result = await table.resolveByEmail('test@example.com');
      expect(result).toBe(dto);
    });
  });

  describe('fetchWithTenantByEmail - found', () => {
    it('should return DTO when found', async () => {
      const dto = { user_id: 'u-1', email: 'test@example.com', tenant_id: 't-1' };
      table.select.mockResolvedValue([dto]);
      const result = await table.fetchWithTenantByEmail('test@example.com');
      expect(result).toBe(dto);
    });
  });

  describe('getSelectQuery', () => {
    it('should return a Select instance', async () => {
      const realTable = new AppUserTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });
});
