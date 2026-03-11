const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let PasswordResetTokenTable;
beforeAll(() => {
  PasswordResetTokenTable = require(globalThis.applicationPath('/application/table/password-reset-token-table'));
});

describe('PasswordResetTokenTable', () => {
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
    table = new PasswordResetTokenTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('password_reset_token');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('token_id');
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
      const result = await table.fetchById('tok-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('token_id = ?', 'tok-1');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ token_id: 'tok-1' }] });
      const result = await table.fetchById('tok-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByTokenHash', () => {
    it('should query by token_hash and return null when not found', async () => {
      const result = await table.fetchByTokenHash('hash123');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('token_hash = ?', 'hash123');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ token_id: 'tok-1', token_hash: 'hash123' }] });
      const result = await table.fetchByTokenHash('hash123');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByUserId', () => {
    it('should query by user_id', async () => {
      const result = await table.fetchByUserId('u-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('user_id = ?', 'u-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'DESC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ token_id: 'tok-1', user_id: 'u-1' }] });
      const result = await table.fetchByUserId('u-1');
      expect(result.length).toBe(1);
    });
  });

  describe('fetchByUserWithDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchByUserWithDetails('u-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ t: 'password_reset_token' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('t.user_id = ?', 'u-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('insertToken', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ token_id: 'tok-1' }], rowCount: 1 });
      const expiry = new Date('2025-01-01');
      const result = await table.insertToken('u-1', 'hash123', expiry);
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.insertToken('u-1', 'hash123', new Date());
      expect(result).toBeNull();
    });
  });

  describe('markUsed', () => {
    it('should execute update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.markUsed('tok-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('invalidateAllForUser', () => {
    it('should execute update query for all unused tokens', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 3 });
      const result = await table.invalidateAllForUser('u-1');
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
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
