const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Profiler = require(path.join(projectRoot, 'library/profiler/profiler'));
const ProfilerFactory = require(path.join(projectRoot, 'library/profiler/profiler-factory'));

describe('Profiler', () => {
  let profiler;

  beforeEach(() => {
    profiler = new Profiler();
  });

  describe('basic state', () => {
    it('should be disabled by default', () => {
      expect(profiler.isEnabled()).toBe(false);
    });

    it('should toggle enabled', () => {
      profiler.setEnabled(true);
      expect(profiler.isEnabled()).toBe(true);
      profiler.setEnabled(false);
      expect(profiler.isEnabled()).toBe(false);
    });

    it('should coerce enabled to boolean', () => {
      profiler.setEnabled(1);
      expect(profiler.isEnabled()).toBe(true);
      profiler.setEnabled(0);
      expect(profiler.isEnabled()).toBe(false);
    });
  });

  describe('createContext', () => {
    it('should create context with defaults', () => {
      const ctx = profiler.createContext();
      expect(ctx.requestStart).toBeDefined();
      expect(ctx.route).toEqual({});
      expect(ctx.queries).toEqual([]);
      expect(ctx.cacheOps).toEqual([]);
      expect(ctx.consoleLogs).toEqual([]);
    });

    it('should include route info', () => {
      const ctx = profiler.createContext({ method: 'GET', path: '/test' });
      expect(ctx.route).toEqual({ method: 'GET', path: '/test' });
    });
  });

  describe('context management', () => {
    it('should return null when no context', () => {
      expect(profiler.getContext()).toBeNull();
    });

    it('should run in context and retrieve store', () => {
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        expect(profiler.getContext()).toBe(ctx);
      });
    });
  });

  describe('recording', () => {
    it('should record query within context', () => {
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        profiler.recordQuery('SELECT * FROM users', [], 1.234);
        expect(ctx.queries).toHaveLength(1);
        expect(ctx.queries[0].sql).toBe('SELECT * FROM users');
        expect(ctx.queries[0].durationMs).toBe(1.23);
      });
    });

    it('should truncate long SQL', () => {
      const ctx = profiler.createContext();
      const longSql = 'SELECT ' + 'x'.repeat(400);
      profiler.runInContext(ctx, () => {
        profiler.recordQuery(longSql, [], 0);
        expect(ctx.queries[0].sql.length).toBeLessThanOrEqual(303);
        expect(ctx.queries[0].sql).toContain('...');
      });
    });

    it('should skip empty params', () => {
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        profiler.recordQuery('SELECT 1', [], 0);
        expect(ctx.queries[0].params).toBeUndefined();
      });
    });

    it('should include non-empty params', () => {
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        profiler.recordQuery('SELECT $1', [1], 0);
        expect(ctx.queries[0].params).toEqual([1]);
      });
    });

    it('should not record without context', () => {
      profiler.recordQuery('SELECT 1', [], 0);
      // No error thrown
    });

    it('should record cache ops', () => {
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        profiler.recordCacheOp('key1', true);
        profiler.recordCacheOp('key2', false);
        expect(ctx.cacheOps).toHaveLength(2);
        expect(ctx.cacheOps[0]).toEqual({ key: 'key1', hit: true });
        expect(ctx.cacheOps[1]).toEqual({ key: 'key2', hit: false });
      });
    });

    it('should not record cache ops without context', () => {
      profiler.recordCacheOp('key', true);
    });

    it('should record console messages', () => {
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        profiler.recordConsole('log', ['hello', 'world']);
        expect(ctx.consoleLogs).toHaveLength(1);
        expect(ctx.consoleLogs[0]).toEqual({ level: 'log', message: 'hello world' });
      });
    });

    it('should stringify objects in console recording', () => {
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        profiler.recordConsole('log', [{ a: 1 }]);
        expect(ctx.consoleLogs[0].message).toBe('{"a":1}');
      });
    });

    it('should handle circular objects in console recording', () => {
      const ctx = profiler.createContext();
      const circular = {};
      circular.self = circular;
      profiler.runInContext(ctx, () => {
        profiler.recordConsole('log', [circular]);
        expect(ctx.consoleLogs[0].message).toBe('[object Object]');
      });
    });

    it('should not record console without context', () => {
      profiler.recordConsole('log', ['test']);
    });
  });

  describe('getProfileData', () => {
    it('should return null without context', () => {
      expect(profiler.getProfileData()).toBeNull();
    });

    it('should return profile data with context', () => {
      const ctx = profiler.createContext({ method: 'GET', path: '/' });
      profiler.runInContext(ctx, () => {
        profiler.recordQuery('SELECT 1', [], 5.5);
        profiler.recordCacheOp('key', true);
        profiler.recordCacheOp('key2', false);

        const data = profiler.getProfileData();
        expect(data.totalMs).toBeGreaterThanOrEqual(0);
        expect(data.queryCount).toBe(1);
        expect(data.totalQueryMs).toBe(5.5);
        expect(data.cacheHits).toBe(1);
        expect(data.cacheMisses).toBe(1);
        expect(data.cacheTotal).toBe(2);
        expect(data.route).toEqual({ method: 'GET', path: '/' });
      });
    });
  });

  describe('printSummary', () => {
    it('should not throw without context', () => {
      expect(() => profiler.printSummary()).not.toThrow();
    });

    it('should print summary with queries and cache ops', () => {
      const ctx = profiler.createContext({ method: 'GET', path: '/test', routeName: 'testRoute' });
      profiler.runInContext(ctx, () => {
        profiler.recordQuery('SELECT * FROM users', [1], 2.5);
        profiler.recordCacheOp('users:1', true);
        profiler.recordCacheOp('users:2', false);

        const logSpy = jest.spyOn(console, 'log').mockImplementation();
        profiler.printSummary();
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
      });
    });

    it('should print summary without queries', () => {
      const ctx = profiler.createContext({ method: 'GET', path: '/test' });
      profiler.runInContext(ctx, () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation();
        profiler.printSummary();
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
      });
    });
  });

  describe('instrumentConsole', () => {
    it('should instrument console methods (idempotent)', () => {
      const origLog = console.log;
      profiler.instrumentConsole();
      expect(console.log).not.toBe(origLog);

      // Call again - should be idempotent
      profiler.instrumentConsole();

      // Restore
      if (profiler._originalConsole) {
        console.log = profiler._originalConsole.log;
        console.warn = profiler._originalConsole.warn;
        console.error = profiler._originalConsole.error;
      }
    });

    it('should record console.log calls within context', () => {
      profiler.instrumentConsole();
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        const spy = jest.spyOn(profiler._originalConsole, 'log').mockImplementation(() => {});
        console.log('test instrumented log');
        expect(ctx.consoleLogs.length).toBeGreaterThanOrEqual(1);
        spy.mockRestore();
      });
      console.log = profiler._originalConsole.log;
      console.warn = profiler._originalConsole.warn;
      console.error = profiler._originalConsole.error;
    });

    it('should record console.warn calls within context', () => {
      profiler.instrumentConsole();
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        const spy = jest.spyOn(profiler._originalConsole, 'warn').mockImplementation(() => {});
        console.warn('test instrumented warn');
        expect(ctx.consoleLogs.some(l => l.level === 'warn')).toBe(true);
        spy.mockRestore();
      });
      console.log = profiler._originalConsole.log;
      console.warn = profiler._originalConsole.warn;
      console.error = profiler._originalConsole.error;
    });

    it('should record console.error calls within context', () => {
      profiler.instrumentConsole();
      const ctx = profiler.createContext();
      profiler.runInContext(ctx, () => {
        const spy = jest.spyOn(profiler._originalConsole, 'error').mockImplementation(() => {});
        console.error('test instrumented error');
        expect(ctx.consoleLogs.some(l => l.level === 'error')).toBe(true);
        spy.mockRestore();
      });
      console.log = profiler._originalConsole.log;
      console.warn = profiler._originalConsole.warn;
      console.error = profiler._originalConsole.error;
    });
  });

  describe('instrumentDbAdapter', () => {
    it('should wrap adapter query method', async () => {
      const mockAdapter = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };

      profiler.setEnabled(true);
      profiler.instrumentDbAdapter(mockAdapter);

      const ctx = profiler.createContext();
      await profiler.runInContext(ctx, async () => {
        await mockAdapter.query('SELECT 1', []);
        expect(ctx.queries).toHaveLength(1);
      });
    });

    it('should call original query when profiler disabled', async () => {
      const origQuery = jest.fn().mockResolvedValue({ rows: [] });
      const mockAdapter = { query: origQuery };

      profiler.instrumentDbAdapter(mockAdapter);
      // profiler is disabled by default, no context active
      const result = await mockAdapter.query('SELECT 1');
      expect(origQuery).toHaveBeenCalledWith('SELECT 1', []);
      expect(result).toEqual({ rows: [] });
    });

    it('should be idempotent', () => {
      const mockAdapter = { query: jest.fn() };
      profiler.instrumentDbAdapter(mockAdapter);
      const wrapped = mockAdapter.query;
      profiler.instrumentDbAdapter(mockAdapter);
      expect(mockAdapter.query).toBe(wrapped);
    });
  });
});

describe('ProfilerFactory', () => {
  it('should create profiler with disabled by default', () => {
    const factory = new ProfilerFactory();
    const sm = { get: jest.fn() };
    const original = process.env.PROFILER_ENABLED;
    delete process.env.PROFILER_ENABLED;

    const profiler = factory.createService(sm);
    expect(profiler).toBeInstanceOf(Profiler);
    expect(profiler.isEnabled()).toBe(false);

    if (original !== undefined) process.env.PROFILER_ENABLED = original;
  });

  it('should enable profiler when env var set', () => {
    const factory = new ProfilerFactory();
    const mockAdapter = { query: jest.fn() };
    const sm = { get: jest.fn().mockReturnValue(mockAdapter) };
    const original = process.env.PROFILER_ENABLED;
    process.env.PROFILER_ENABLED = 'true';

    const profiler = factory.createService(sm);
    expect(profiler.isEnabled()).toBe(true);

    process.env.PROFILER_ENABLED = original || '';
    // Restore console if instrumented
    if (profiler._originalConsole) {
      console.log = profiler._originalConsole.log;
      console.warn = profiler._originalConsole.warn;
      console.error = profiler._originalConsole.error;
    }
  });

  it('should handle missing DbAdapter gracefully', () => {
    const factory = new ProfilerFactory();
    const sm = { get: jest.fn().mockImplementation(() => { throw new Error('Not found'); }) };
    const original = process.env.PROFILER_ENABLED;
    process.env.PROFILER_ENABLED = 'true';

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const profiler = factory.createService(sm);
    expect(profiler).toBeInstanceOf(Profiler);
    warnSpy.mockRestore();

    process.env.PROFILER_ENABLED = original || '';
    if (profiler._originalConsole) {
      console.log = profiler._originalConsole.log;
      console.warn = profiler._originalConsole.warn;
      console.error = profiler._originalConsole.error;
    }
  });
});
