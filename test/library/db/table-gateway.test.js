const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('TableGateway', () => {

  let mockAdapter;

  beforeEach(() => {
    mockAdapter = { query: jest.fn() };
  });

  describe('constructor', () => {
    it('should set all properties from the config object', () => {
      const entityFactory = jest.fn();
      const resultSet = {};
      const hydrator = {};
      const objectPrototype = {};

      const gw = new TableGateway({
        table: 'users',
        adapter: mockAdapter,
        primaryKey: 'user_id',
        entityFactory,
        resultSet,
        hydrator,
        objectPrototype
      });

      expect(gw.table).toBe('users');
      expect(gw.adapter).toBe(mockAdapter);
      expect(gw.primaryKey).toBe('user_id');
      expect(gw.entityFactory).toBe(entityFactory);
      expect(gw.resultSet).toBe(resultSet);
      expect(gw.hydrator).toBe(hydrator);
      expect(gw.objectPrototype).toBe(objectPrototype);
    });

    it('should default primaryKey to "id"', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      expect(gw.primaryKey).toBe('id');
    });

    it('should default optional properties to null', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      expect(gw.entityFactory).toBeNull();
      expect(gw.resultSet).toBeNull();
      expect(gw.hydrator).toBeNull();
      expect(gw.objectPrototype).toBeNull();
    });
  });

  describe('getAdapter', () => {
    it('should return the adapter', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      expect(gw.getAdapter()).toBe(mockAdapter);
    });
  });

  describe('getTableName', () => {
    it('should return the table name', () => {
      const gw = new TableGateway({ table: 'articles', adapter: mockAdapter });
      expect(gw.getTableName()).toBe('articles');
    });
  });

  describe('_buildResultSet', () => {
    it('should return options.resultSet if provided', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      const customRs = { custom: true };
      expect(gw._buildResultSet({ resultSet: customRs })).toBe(customRs);
    });

    it('should return null when no hydrator and no objectPrototype', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      expect(gw._buildResultSet()).toBeNull();
    });
  });

  describe('_applyWhereEntry', () => {
    let builder;

    beforeEach(() => {
      builder = {
        where: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis()
      };
    });

    it('should apply IS NULL for null values', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw._applyWhereEntry(builder, 'deleted_at', null);
      expect(builder.where).toHaveBeenCalledWith('deleted_at IS NULL');
    });

    it('should use whereIn for array values when available', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw._applyWhereEntry(builder, 'status', ['active', 'pending']);
      expect(builder.whereIn).toHaveBeenCalledWith('status', ['active', 'pending']);
    });

    it('should fallback to expanded placeholders when whereIn is not available', () => {
      delete builder.whereIn;
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw._applyWhereEntry(builder, 'status', ['active', 'pending']);
      expect(builder.where).toHaveBeenCalledWith('status IN (?, ?)', 'active', 'pending');
    });

    it('should handle empty array by forcing no rows', () => {
      delete builder.whereIn;
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw._applyWhereEntry(builder, 'status', []);
      expect(builder.where).toHaveBeenCalledWith('1 = 0');
    });

    it('should use = for scalar values', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw._applyWhereEntry(builder, 'id', 5);
      expect(builder.where).toHaveBeenCalledWith('id = ?', 5);
    });
  });

  describe('applyWhere', () => {
    let builder;

    beforeEach(() => {
      builder = {
        where: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis()
      };
    });

    it('should call builder.where with string where clause', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw.applyWhere(builder, 'id = 1');
      expect(builder.where).toHaveBeenCalledWith('id = 1');
    });

    it('should call function with builder when where is a function', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      const whereFn = jest.fn();
      gw.applyWhere(builder, whereFn);
      expect(whereFn).toHaveBeenCalledWith(builder);
    });

    it('should iterate object entries and call _applyWhereEntry', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      const spy = jest.spyOn(gw, '_applyWhereEntry');
      gw.applyWhere(builder, { status: 'active', category: null });
      expect(spy).toHaveBeenCalledWith(builder, 'status', 'active');
      expect(spy).toHaveBeenCalledWith(builder, 'category', null);
    });

    it('should do nothing when where is null/undefined', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw.applyWhere(builder, null);
      expect(builder.where).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // Additional coverage tests for select, get, insert, update, delete, selectSimple, _buildResultSet
  // =====================================================================

  describe('_buildResultSet (hydrator + objectPrototype)', () => {
    it('should return HydratingResultSet when hydrator and objectPrototype are configured', () => {
      const hydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const proto = { name: '' };
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter, hydrator, objectPrototype: proto });
      const rs = gw._buildResultSet();
      expect(rs).toBeDefined();
      expect(rs).not.toBeNull();
      // HydratingResultSet should have initialize and toArray
      expect(typeof rs.initialize).toBe('function');
      expect(typeof rs.toArray).toBe('function');
    });

    it('should use options.objectPrototype over instance objectPrototype', () => {
      const hydrator = { hydrate: jest.fn(), extract: jest.fn() };
      const instanceProto = { name: 'instance' };
      const optionProto = { name: 'option' };
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter, hydrator, objectPrototype: instanceProto });
      const rs = gw._buildResultSet({ objectPrototype: optionProto });
      expect(rs).not.toBeNull();
    });

    it('should return ResultSet when objectPrototype is set but no hydrator', () => {
      const proto = { name: '' };
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter, objectPrototype: proto });
      const rs = gw._buildResultSet();
      expect(rs).not.toBeNull();
      expect(typeof rs.initialize).toBe('function');
    });

    it('should return ResultSet when options.objectPrototype is set but no hydrator', () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      const rs = gw._buildResultSet({ objectPrototype: { name: '' } });
      expect(rs).not.toBeNull();
    });
  });

  describe('select', () => {
    let gw, mockSelect;

    beforeEach(() => {
      mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }])
      };
      gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      // Replace the Select constructor with a mock
      gw.Select = jest.fn(() => mockSelect);
    });

    it('should return raw rows when no entityFactory or resultSet', async () => {
      const rows = await gw.select();
      expect(rows).toEqual([{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }]);
    });

    it('should accept a where object and apply entries', async () => {
      await gw.select({ status: 'active' });
      expect(mockSelect.from).toHaveBeenCalledWith({ t: 'posts' });
      expect(mockSelect.where).toHaveBeenCalledWith('status = ?', 'active');
    });

    it('should accept a callback spec', async () => {
      const cb = jest.fn((select) => {
        select.from({ t: 'posts' });
        select.where('status = ?', 'active');
        return select;
      });
      await gw.select(cb);
      expect(cb).toHaveBeenCalledWith(mockSelect);
      // table should NOT be set by _buildSelectFromSpec when spec is a callback
      expect(mockSelect.from).toHaveBeenCalledTimes(1);
    });

    it('should apply order/limit/offset options', async () => {
      await gw.select(null, { order: 'created_at DESC', limit: 10, offset: 20 });
      expect(mockSelect.order).toHaveBeenCalledWith('created_at DESC');
      expect(mockSelect.limit).toHaveBeenCalledWith(10);
      expect(mockSelect.offset).toHaveBeenCalledWith(20);
    });

    it('should apply array order options', async () => {
      await gw.select(null, { order: ['created_at DESC', 'id ASC'] });
      expect(mockSelect.order).toHaveBeenCalledWith('created_at DESC', 'id ASC');
    });

    it('should use entityFactory when configured', async () => {
      const entityFactory = jest.fn((row) => ({ ...row, type: 'entity' }));
      gw.entityFactory = entityFactory;
      const rows = await gw.select();
      expect(rows).toHaveLength(2);
      expect(rows[0].type).toBe('entity');
      expect(entityFactory).toHaveBeenCalledTimes(2);
    });

    it('should use resultSet from _buildResultSet when available', async () => {
      const proto = { id: 0, title: '' };
      gw.objectPrototype = proto;
      const rows = await gw.select();
      // Should have gone through ResultSet
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });

    it('should pass through a pre-built Select object directly', async () => {
      const preBuilt = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([{ id: 99 }])
      };
      const rows = await gw.select(preBuilt);
      expect(preBuilt.execute).toHaveBeenCalled();
      expect(rows).toEqual([{ id: 99 }]);
    });
  });

  describe('get', () => {
    it('should select by primary key and return first row', async () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([{ id: 5, title: 'Found' }])
      };
      gw.Select = jest.fn(() => mockSelect);

      const result = await gw.get(5);
      expect(result).toEqual({ id: 5, title: 'Found' });
      expect(mockSelect.where).toHaveBeenCalledWith('id = ?', 5);
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when row not found', async () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([])
      };
      gw.Select = jest.fn(() => mockSelect);

      const result = await gw.get(999);
      expect(result).toBeNull();
    });

    it('should use custom primaryKey', async () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter, primaryKey: 'slug' });
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([{ slug: 'hello', title: 'Hello' }])
      };
      gw.Select = jest.fn(() => mockSelect);

      const result = await gw.get('hello');
      expect(mockSelect.where).toHaveBeenCalledWith('slug = ?', 'hello');
      expect(result).toEqual({ slug: 'hello', title: 'Hello' });
    });
  });

  describe('insert', () => {
    it('should build and execute an Insert query', async () => {
      const mockInsertInstance = {
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ insertId: 42 })
      };
      // Mock the Insert module
      jest.mock(path.join(projectRoot, 'library/db/sql/insert'), () => {
        return jest.fn(() => mockInsertInstance);
      });

      // Re-require TableGateway to pick up the mock
      jest.resetModules();
      global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
      globalThis.applicationPath = global.applicationPath;
      const TG = require(path.join(projectRoot, 'library/db/table-gateway'));
      const gw = new TG({ table: 'posts', adapter: mockAdapter });

      const result = await gw.insert({ title: 'New Post', body: 'Content' });
      expect(mockInsertInstance.into).toHaveBeenCalledWith('posts');
      expect(mockInsertInstance.values).toHaveBeenCalledWith({ title: 'New Post', body: 'Content' });
      expect(mockInsertInstance.execute).toHaveBeenCalled();
      expect(result).toEqual({ insertId: 42 });

      jest.restoreAllMocks();
    });
  });

  describe('update', () => {
    it('should build and execute an Update query with object where', async () => {
      const mockUpdateInstance = {
        table: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affectedRows: 1 })
      };
      jest.mock(path.join(projectRoot, 'library/db/sql/update'), () => {
        return jest.fn(() => mockUpdateInstance);
      });

      jest.resetModules();
      global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
      globalThis.applicationPath = global.applicationPath;
      const TG = require(path.join(projectRoot, 'library/db/table-gateway'));
      const gw = new TG({ table: 'posts', adapter: mockAdapter });

      const result = await gw.update({ id: 5 }, { title: 'Updated' });
      expect(mockUpdateInstance.table).toHaveBeenCalledWith('posts');
      expect(mockUpdateInstance.set).toHaveBeenCalledWith({ title: 'Updated' });
      expect(mockUpdateInstance.where).toHaveBeenCalledWith('id = ?', 5);
      expect(result).toEqual({ affectedRows: 1 });

      jest.restoreAllMocks();
    });

    it('should throw when where is falsy', async () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      await expect(gw.update(null, { title: 'x' })).rejects.toThrow('posts.update() requires a where');
    });
  });

  describe('delete', () => {
    it('should build and execute a Delete query with string where', async () => {
      const mockDeleteInstance = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affectedRows: 1 })
      };
      jest.mock(path.join(projectRoot, 'library/db/sql/delete'), () => {
        return jest.fn(() => mockDeleteInstance);
      });

      jest.resetModules();
      global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
      globalThis.applicationPath = global.applicationPath;
      const TG = require(path.join(projectRoot, 'library/db/table-gateway'));
      const gw = new TG({ table: 'posts', adapter: mockAdapter });

      const result = await gw.delete('id = 5');
      expect(mockDeleteInstance.from).toHaveBeenCalledWith('posts');
      expect(mockDeleteInstance.where).toHaveBeenCalledWith('id = 5');
      expect(result).toEqual({ affectedRows: 1 });

      jest.restoreAllMocks();
    });

    it('should throw when where is falsy', async () => {
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      await expect(gw.delete(null)).rejects.toThrow('posts.delete() requires a where');
    });
  });

  describe('selectSimple', () => {
    it('should call select with a callback that applies where, order, limit, offset', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([{ id: 1 }])
      };
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw.Select = jest.fn(() => mockSelect);

      const rows = await gw.selectSimple(
        { status: 'active' },
        { order: 'id DESC', limit: 5, offset: 10 }
      );
      expect(mockSelect.from).toHaveBeenCalledWith({ t: 'posts' });
      expect(mockSelect.where).toHaveBeenCalledWith('status = ?', 'active');
      expect(mockSelect.order).toHaveBeenCalledWith('id DESC');
      expect(mockSelect.limit).toHaveBeenCalledWith(5);
      expect(mockSelect.offset).toHaveBeenCalledWith(10);
      expect(rows).toEqual([{ id: 1 }]);
    });

    it('should work with no where and no options', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
      };
      const gw = new TableGateway({ table: 'posts', adapter: mockAdapter });
      gw.Select = jest.fn(() => mockSelect);

      const rows = await gw.selectSimple();
      expect(mockSelect.from).toHaveBeenCalledWith({ t: 'posts' });
      expect(mockSelect.order).not.toHaveBeenCalled();
      expect(mockSelect.limit).not.toHaveBeenCalled();
      expect(rows).toHaveLength(2);
    });
  });
});
