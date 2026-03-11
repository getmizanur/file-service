const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let IntegrationPolicyOverrideTable;
beforeAll(() => {
  IntegrationPolicyOverrideTable = require(globalThis.applicationPath('/application/table/integration-policy-override-table'));
});

describe('IntegrationPolicyOverrideTable', () => {
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
    table = new IntegrationPolicyOverrideTable({ adapter: mockAdapter });
    table.getSelectQuery = jest.fn().mockResolvedValue(mockSelectQuery);
  });

  describe('constructor', () => {
    it('should set the table name', () => {
      expect(table.table).toBe('integration_policy_override');
    });

    it('should set the primary key', () => {
      expect(table.primaryKey).toBe('integration_id');
    });
  });

  describe('baseColumns', () => {
    it('should return an array of column names', () => {
      const cols = table.baseColumns();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    });
  });

  describe('fetchByIntegrationId', () => {
    it('should return null when no rows found', async () => {
      const result = await table.fetchByIntegrationId('int-1');
      expect(mockSelectQuery.where).toHaveBeenCalledWith('integration_id = ?', 'int-1');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ integration_id: 'int-1' }] });
      const result = await table.fetchByIntegrationId('int-1');
      expect(result).not.toBeNull();
    });
  });

  describe('fetchByIntegrationWithDetails', () => {
    it('should return null when no rows', async () => {
      const result = await table.fetchByIntegrationWithDetails('int-1');
      expect(mockSelectQuery.from).toHaveBeenCalledWith({ p: 'integration_policy_override' }, []);
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return DTO when found', async () => {
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ integration_id: 'int-1', integration_name: 'Test' }] });
      const result = await table.fetchByIntegrationWithDetails('int-1');
      expect(result).toBeDefined();
    });
  });

  describe('fetchByTenantWithDetails', () => {
    it('should build join query', async () => {
      const result = await table.fetchByTenantWithDetails('t-1');
      expect(mockSelectQuery.join).toHaveBeenCalled();
      expect(mockSelectQuery.joinLeft).toHaveBeenCalled();
      expect(mockSelectQuery.where).toHaveBeenCalledWith('i.tenant_id = ?', 't-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('upsert', () => {
    it('should call insert when entity does not exist', async () => {
      // fetchByIntegrationId returns null (no rows)
      mockSelectQuery.execute.mockResolvedValue({ rows: [] });
      // insert uses adapter.query
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ integration_id: 'int-1' }], rowCount: 1 });

      const result = await table.upsert('int-1', { keyTemplate: 'tpl' });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should call update when entity exists', async () => {
      // fetchByIntegrationId returns a row
      mockSelectQuery.execute.mockResolvedValue({ rows: [{ integration_id: 'int-1' }] });
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await table.upsert('int-1', { keyTemplate: 'tpl' });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
    });
  });

  describe('insert', () => {
    it('should return entity on success', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [{ integration_id: 'int-1' }], rowCount: 1 });
      const result = await table.insert('int-1', { keyTemplate: 'tpl' });
      expect(result).not.toBeNull();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should return null on failure', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await table.insert('int-1', {});
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should execute update query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.update('int-1', { key_template: 'new-tpl' });
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('success');
    });
  });

  describe('deleteByIntegrationId', () => {
    it('should execute delete query', async () => {
      mockAdapter.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await table.deleteByIntegrationId('int-1');
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
