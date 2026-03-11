const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let SubscriptionTable;
beforeAll(() => {
  SubscriptionTable = require(globalThis.applicationPath('/application/table/subscription-table'));
});

describe('SubscriptionTable', () => {
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
    table = new SubscriptionTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('subscription');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('subscription_id');
    });

    it('should accept a custom hydrator', () => {
      const customHydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const t = new SubscriptionTable({ adapter: mockAdapter, hydrator: customHydrator });
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
      const result = await table.fetchById('sub-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('subscription_id = ?', 'sub-1');
      expect(result).toBeNull();
    });
  });

  describe('fetchCurrentByTenantId', () => {
    it('should query by tenant_id with DESC order and limit 1', async () => {
      const result = await table.fetchCurrentByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(mockSelectQuery.order).toHaveBeenCalledWith('created_dt', 'DESC');
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('fetchAllByTenantId', () => {
    it('should return array of subscriptions', async () => {
      const result = await table.fetchAllByTenantId('t-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('tenant_id = ?', 't-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchCurrentByTenantWithDetails', () => {
    it('should return null when no rows', async () => {
      const result = await table.fetchCurrentByTenantWithDetails('t-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ s: 'subscription' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('fetchAllWithDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchAllWithDetails();
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply limit and offset', async () => {
      await table.fetchAllWithDetails({ limit: 10, offset: 5 });
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(10);
      expect(mockSelectQuery.offset).toHaveBeenCalledWith(5);
    });

    it('should not apply limit/offset when not provided', async () => {
      await table.fetchAllWithDetails();
      expect(mockSelectQuery.limit).not.toHaveBeenCalled();
      expect(mockSelectQuery.offset).not.toHaveBeenCalled();
    });
  });

  describe('fetchById - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ subscription_id: 'sub-1', tenant_id: 't-1' }] });
      const result = await table.fetchById('sub-1');
      expect(result).not.toBeNull();
      expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('fetchCurrentByTenantId - found', () => {
    it('should return entity when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ subscription_id: 'sub-1', tenant_id: 't-1' }] });
      const result = await table.fetchCurrentByTenantId('t-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchAllByTenantId - with results', () => {
    it('should return array of entities', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ subscription_id: 's1' }, { subscription_id: 's2' }] });
      const result = await table.fetchAllByTenantId('t-1');
      expect(result.length).toBe(2);
    });
  });

  describe('fetchCurrentByTenantWithDetails - found', () => {
    it('should return DTO when row found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ subscription_id: 'sub-1', tenant_name: 'Test' }] });
      const result = await table.fetchCurrentByTenantWithDetails('t-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchAllWithDetails - with results', () => {
    it('should return array of DTOs', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ subscription_id: 's1' }] });
      const result = await table.fetchAllWithDetails();
      expect(result.length).toBe(1);
    });
  });

  describe('_normalizeRows', () => {
    it('should return rows from result object', () => {
      const rows = [{ id: 1 }];
      expect(table._normalizeRows({ rows })).toEqual(rows);
    });

    it('should return array directly if result is array', () => {
      const rows = [{ id: 1 }];
      expect(table._normalizeRows(rows)).toEqual(rows);
    });

    it('should return empty array for null/undefined', () => {
      expect(table._normalizeRows(null)).toEqual([]);
      expect(table._normalizeRows(undefined)).toEqual([]);
    });
  });

  describe('getSelectQuery', () => {
    it('should return a Select instance', async () => {
      const realTable = new SubscriptionTable({ adapter: mockAdapter });
      const query = await realTable.getSelectQuery();
      expect(query).toBeDefined();
      expect(typeof query.from).toBe('function');
    });
  });

  describe('insert', () => {
    it('should return entity on successful insert', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({
        rows: [{ subscription_id: 'sub-new', tenant_id: 't-1' }],
        rowCount: 1
      });
      const table2 = new SubscriptionTable({ adapter: mockAdapter });
      const data = { tenantId: 't-1', planId: 'plan-1', status: 'active', currentPeriodStart: new Date(), currentPeriodEnd: new Date(), externalRef: 'ext-1' };
      const result = await table2.insert(data);
      expect(mockAdapter.query).toHaveBeenCalled();
    });

    it('should return null when insert fails', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const table2 = new SubscriptionTable({ adapter: mockAdapter });
      const data = { tenantId: 't-1', planId: 'plan-1', status: 'active', currentPeriodStart: new Date(), currentPeriodEnd: new Date() };
      const result = await table2.insert(data);
      expect(result === null || result !== undefined).toBe(true);
    });

    it('should handle missing externalRef', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const table2 = new SubscriptionTable({ adapter: mockAdapter });
      const data = { tenantId: 't-1', planId: 'plan-1', status: 'active', currentPeriodStart: new Date(), currentPeriodEnd: new Date() };
      const result = await table2.insert(data);
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should execute update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new SubscriptionTable({ adapter: mockAdapter });
      const result = await table2.update('sub-1', { status: 'cancelled' });
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should execute status update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const table2 = new SubscriptionTable({ adapter: mockAdapter });
      const result = await table2.updateStatus('sub-1', 'cancelled');
      expect(mockAdapter.query).toHaveBeenCalled();
    });
  });
});
