const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Statement = require(path.join(projectRoot, 'library/db/sql/statement'));

describe('Statement', () => {
  const mockAdapter = {
    getParameterPlaceholder: (i) => `$${i + 1}`
  };

  describe('constructor', () => {
    it('should initialize with adapter and sql', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      expect(stmt.adapter).toBe(mockAdapter);
      expect(stmt.sql).toBe('SELECT 1');
      expect(stmt.parameters).toEqual([]);
      expect(stmt.fetchMode).toBe('object');
      expect(stmt.prepared).toBe(false);
    });
  });

  describe('prepare', () => {
    it('should set prepared flag', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      await stmt.prepare();
      expect(stmt.prepared).toBe(true);
    });

    it('should not re-prepare if already prepared', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      stmt.prepared = true;
      const spy = jest.spyOn(stmt, '_prepare');
      await stmt.prepare();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('bindParam', () => {
    it('should bind by index', () => {
      const stmt = new Statement(mockAdapter, 'SELECT ?');
      stmt.bindParam(0, 'value');
      expect(stmt.parameters[0]).toBe('value');
    });

    it('should bind by name', () => {
      const stmt = new Statement(mockAdapter, 'SELECT :name');
      stmt.bindParam('name', 'John');
      expect(stmt.boundParams.get('name')).toEqual({ value: 'John', type: null });
    });

    it('should return this for chaining', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      expect(stmt.bindParam(0, 'x')).toBe(stmt);
    });
  });

  describe('bindParams', () => {
    it('should bind multiple params', () => {
      const stmt = new Statement(mockAdapter, 'SELECT :a, :b');
      stmt.bindParams({ a: 1, b: 2 });
      expect(stmt.boundParams.get('a')).toEqual({ value: 1, type: null });
      expect(stmt.boundParams.get('b')).toEqual({ value: 2, type: null });
    });
  });

  describe('bindValue', () => {
    it('should delegate to bindParam', () => {
      const stmt = new Statement(mockAdapter, 'SELECT ?');
      stmt.bindValue(0, 'val');
      expect(stmt.parameters[0]).toBe('val');
    });
  });

  describe('setFetchMode', () => {
    it('should set fetch mode', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      expect(stmt.setFetchMode('array')).toBe(stmt);
      expect(stmt.fetchMode).toBe('array');
    });
  });

  describe('abstract methods', () => {
    it('fetch should throw', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      await expect(stmt.fetch()).rejects.toThrow('must be implemented');
    });

    it('fetchAll should throw', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      await expect(stmt.fetchAll()).rejects.toThrow('must be implemented');
    });

    it('fetchColumn should throw', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      await expect(stmt.fetchColumn()).rejects.toThrow('must be implemented');
    });

    it('rowCount should throw', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      await expect(stmt.rowCount()).rejects.toThrow('must be implemented');
    });

    it('lastInsertId should throw', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      await expect(stmt.lastInsertId()).rejects.toThrow('must be implemented');
    });

    it('_execute should throw', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      await expect(stmt._execute()).rejects.toThrow('must be implemented');
    });
  });

  describe('getSQL / getParameters', () => {
    it('getSQL should return sql', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      expect(stmt.getSQL()).toBe('SELECT 1');
    });

    it('getParameters should return array when no bound params', () => {
      const stmt = new Statement(mockAdapter, 'SELECT ?');
      stmt.parameters = [1, 2];
      expect(stmt.getParameters()).toEqual([1, 2]);
    });

    it('getParameters should return boundParams when populated', () => {
      const stmt = new Statement(mockAdapter, 'SELECT :a');
      stmt.bindParam('a', 1);
      expect(stmt.getParameters()).toBeInstanceOf(Map);
    });
  });

  describe('close', () => {
    it('should reset prepared flag', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      stmt.prepared = true;
      await stmt.close();
      expect(stmt.prepared).toBe(false);
    });
  });

  describe('_prepareParameters', () => {
    it('should return parameters when no bound params', () => {
      const stmt = new Statement(mockAdapter, 'SELECT ?');
      stmt.parameters = [1];
      expect(stmt._prepareParameters()).toEqual([1]);
    });

    it('should return parameters when no bound params exist', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      stmt.parameters = ['a', 'b'];
      expect(stmt._prepareParameters()).toEqual(['a', 'b']);
    });

    // Note: String.prototype.replaceAll requires a global RegExp in newer Node versions.
    // The source code creates a non-global RegExp, so we patch replaceAll in these tests
    // to add the global flag automatically, matching the intended behavior.
    let originalReplaceAll;
    beforeAll(() => {
      originalReplaceAll = String.prototype.replaceAll;
      String.prototype.replaceAll = function(searchValue, replaceValue) {
        if(searchValue instanceof RegExp && !searchValue.global) {
          searchValue = new RegExp(searchValue.source, searchValue.flags + 'g');
        }
        return originalReplaceAll.call(this, searchValue, replaceValue);
      };
    });
    afterAll(() => {
      String.prototype.replaceAll = originalReplaceAll;
    });

    it('should replace named placeholders with positional placeholders', () => {
      const stmt = new Statement(mockAdapter, 'SELECT * FROM users WHERE name = :name AND age = :age');
      stmt.bindParam('name', 'John');
      stmt.bindParam('age', 30);
      const params = stmt._prepareParameters();
      expect(params).toEqual(['John', 30]);
      expect(stmt.sql).toBe('SELECT * FROM users WHERE name = $1 AND age = $2');
      expect(stmt.parameters).toEqual(['John', 30]);
    });

    it('should replace multiple occurrences of the same named placeholder', () => {
      const stmt = new Statement(mockAdapter, 'SELECT * FROM t WHERE a = :val OR b = :val');
      stmt.bindParam('val', 'test');
      const params = stmt._prepareParameters();
      expect(params).toEqual(['test']);
      expect(stmt.sql).toBe('SELECT * FROM t WHERE a = $1 OR b = $1');
    });

    it('should handle a single bound parameter', () => {
      const stmt = new Statement(mockAdapter, 'DELETE FROM t WHERE id = :id');
      stmt.bindParam('id', 42);
      const params = stmt._prepareParameters();
      expect(params).toEqual([42]);
      expect(stmt.sql).toBe('DELETE FROM t WHERE id = $1');
    });
  });

  describe('_formatResult', () => {
    it('should return rows as-is for object mode', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      const rows = [{ a: 1 }, { a: 2 }];
      expect(stmt._formatResult(rows)).toEqual(rows);
    });

    it('should convert to arrays for array mode', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      const result = stmt._formatResult([{ a: 1, b: 2 }]);
      expect(result).toEqual([[1, 2]]);
    });

    it('should extract first column for column mode', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      const result = stmt._formatResult([{ a: 1, b: 2 }]);
      expect(result).toEqual([1]);
    });

    it('should handle non-array input', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      expect(stmt._formatResult('not-array')).toBe('not-array');
    });

    it('should handle non-object rows in array mode', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      stmt.fetchMode = 'array';
      expect(stmt._formatResult([42])).toEqual([42]);
    });

    it('should return non-object rows as-is in column mode', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      expect(stmt._formatResult([42, 'hello'])).toEqual([42, 'hello']);
    });

    it('should handle null rows in column mode', () => {
      const stmt = new Statement(mockAdapter, 'SELECT 1');
      stmt.fetchMode = 'column';
      expect(stmt._formatResult([null, 5])).toEqual([null, 5]);
    });
  });

  describe('execute', () => {
    it('should auto-prepare and bind array params', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT ?');
      jest.spyOn(stmt, '_execute').mockResolvedValue([]);
      const result = await stmt.execute([1, 2]);
      expect(stmt.parameters).toEqual([1, 2]);
      expect(stmt.prepared).toBe(true);
    });

    it('should bind object params', async () => {
      const stmt = new Statement(mockAdapter, 'SELECT :a');
      jest.spyOn(stmt, '_execute').mockResolvedValue([]);
      await stmt.execute({ a: 1 });
      expect(stmt.boundParams.get('a')).toEqual({ value: 1, type: null });
    });
  });
});
