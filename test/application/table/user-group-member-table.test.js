const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserGroupMemberTable;
beforeAll(() => {
  UserGroupMemberTable = require(globalThis.applicationPath('/application/table/user-group-member-table'));
});

describe('UserGroupMemberTable', () => {
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
    table = new UserGroupMemberTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('user_group_member');
    });

    it('should set composite primary key', () => {
      expect(table.primaryKey).toEqual(['group_id', 'user_id']);
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    });
  });

  describe('fetchByGroupId', () => {
    it('should query by group_id', async () => {
      const result = await table.fetchByGroupId('g-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('group_id = ?', 'g-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ group_id: 'g-1', user_id: 'u-1' }] });
      const result = await table.fetchByGroupId('g-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByUserId', () => {
    it('should query by user_id', async () => {
      const result = await table.fetchByUserId('u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ group_id: 'g-1', user_id: 'u-1' }] });
      const result = await table.fetchByUserId('u-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByGroupWithUserDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchByGroupWithUserDetails('g-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ m: 'user_group_member' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('m.group_id = ?', 'g-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchByUserWithGroupDetails', () => {
    it('should build join query for group details', async () => {
      const result = await table.fetchByUserWithGroupDetails('u-1');
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('m.user_id = ?', 'u-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('addMember', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ group_id: 'g-1', user_id: 'u-1' }], rowCount: 1 });
      const result = await table.addMember('g-1', 'u-1');
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.addMember('g-1', 'u-1');
      expect(result).toBeNull();
    });
  });

  describe('removeMember', () => {
    it('should execute delete query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.removeMember('g-1', 'u-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('removeAllMembersFromGroup', () => {
    it('should execute delete query for group', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 3 });
      const result = await table.removeAllMembersFromGroup('g-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('removeUserFromAllGroups', () => {
    it('should execute delete query for user', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 2 });
      const result = await table.removeUserFromAllGroups('u-1');
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
