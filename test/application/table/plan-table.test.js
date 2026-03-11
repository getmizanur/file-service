const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let PlanTable;
beforeAll(() => {
  PlanTable = require(globalThis.applicationPath('/application/table/plan-table'));
});

describe('PlanTable', () => {
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
    table = new PlanTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('plan');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('plan_id');
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
      const result = await table.fetchById('plan-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('plan_id = ?', 'plan-1');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ plan_id: 'plan-1' }] });
      const result = await table.fetchById('plan-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByCode', () => {
    it('should query by code and return null when not found', async () => {
      const result = await table.fetchByCode('free');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('code = ?', 'free');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ plan_id: 'plan-1', code: 'free' }] });
      const result = await table.fetchByCode('free');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchAll', () => {
    it('should query all plans ordered by price', async () => {
      const result = await table.fetchAll();
      expect(mockSelectQuery.from).toHaveBeenCalledWith('plan');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('monthly_price_pence', 'ASC');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return entity instances when rows found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ plan_id: 'p-1' }, { plan_id: 'p-2' }] });
      const result = await table.fetchAll();
      expect(result.length).toBe(2);
    });
  });

  describe('fetchAllWithDetails', () => {
    it('should build join query with grouping', async () => {
      const result = await table.fetchAllWithDetails();
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ p: 'plan' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.groupBy).toHaveBeenCalledWith('p.plan_id');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('insert', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ plan_id: 'plan-1' }], rowCount: 1 });
      const result = await table.insert({ code: 'pro', name: 'Pro Plan' });
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.insert({ code: 'pro', name: 'Pro Plan' });
      expect(result).toBeNull();
    });

    it('should use default values for optional fields', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ plan_id: 'plan-1' }], rowCount: 1 });
      const result = await table.insert({ code: 'basic', name: 'Basic' });
      expect(result).not.toBeNull();
    });
  });

  describe('update', () => {
    it('should execute update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.update('plan-1', { name: 'Updated Plan' });
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
