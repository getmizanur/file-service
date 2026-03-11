const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const ProfilerToolbarHelper = require(globalThis.applicationPath('/application/helper/profiler-toolbar-helper'));

describe('ProfilerToolbarHelper', () => {
  let helper;
  let originalEnv;

  beforeEach(() => {
    helper = new ProfilerToolbarHelper();
    originalEnv = process.env.PROFILER_ENABLED;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PROFILER_ENABLED;
    } else {
      process.env.PROFILER_ENABLED = originalEnv;
    }
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(ProfilerToolbarHelper);
  });

  describe('render()', () => {
    it('returns empty string when PROFILER_ENABLED is not true', () => {
      delete process.env.PROFILER_ENABLED;
      expect(helper.render()).toBe('');
    });

    it('returns empty string when PROFILER_ENABLED is false', () => {
      process.env.PROFILER_ENABLED = 'false';
      expect(helper.render()).toBe('');
    });

    it('returns empty string when profiler is enabled but no profiler in context', () => {
      process.env.PROFILER_ENABLED = 'true';
      const ctx = { ctx: {}, env: {} };
      expect(helper.render(ctx)).toBe('');
    });

    it('returns empty string when profiler is disabled in context', () => {
      process.env.PROFILER_ENABLED = 'true';
      const ctx = { _profiler: { isEnabled: () => false }, ctx: {}, env: {} };
      expect(helper.render(ctx)).toBe('');
    });

    it('returns empty string when profiler returns no data', () => {
      process.env.PROFILER_ENABLED = 'true';
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => null }, ctx: {}, env: {} };
      expect(helper.render(ctx)).toBe('');
    });

    it('renders profiler toolbar when data is available', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 123.45,
        queryCount: 5,
        totalQueryMs: 45.67,
        cacheTotal: 10,
        cacheHits: 7,
        queries: [
          { sql: 'SELECT 1', durationMs: 5.2, params: [1] }
        ],
        consoleLogs: [
          { level: 'log', message: 'test message' }
        ],
        cacheOps: [
          { key: 'user:1', hit: true }
        ],
        route: { method: 'GET', path: '/test' },
        request: {
          method: 'GET', url: '/test', ip: '127.0.0.1',
          query: { page: '1' }, body: {}, params: {}, cookies: {}, headers: {}
        }
      };
      const ctx = {
        _profiler: { isEnabled: () => true, getProfileData: () => data },
        ctx: {}, env: {}
      };
      const html = helper.render(ctx);
      expect(html).toContain('pft-root');
      expect(html).toContain('Profiler');
      expect(html).toContain('123.5ms');
      expect(html).toContain('SQL: 5');
      expect(html).toContain('SELECT 1');
      expect(html).toContain('test message');
    });
  });

  describe('_consoleLabel()', () => {
    it('returns count without error suffix when no errors', () => {
      expect(helper._consoleLabel(5, 0)).toBe('Console: 5');
    });

    it('returns count with error suffix when errors exist', () => {
      const result = helper._consoleLabel(5, 2);
      expect(result).toContain('Console: 5');
      expect(result).toContain('2 err');
    });
  });

  describe('_queryColor()', () => {
    it('returns green for fast queries under 10ms', () => {
      expect(helper._queryColor(5)).toBe('#4ade80');
    });

    it('returns yellow for medium queries 10-50ms', () => {
      expect(helper._queryColor(25)).toBe('#facc15');
    });

    it('returns red for slow queries over 50ms', () => {
      expect(helper._queryColor(100)).toBe('#f87171');
    });
  });

  describe('_consoleBadgeClass()', () => {
    it('returns error class for error level', () => {
      expect(helper._consoleBadgeClass('error')).toBe('pft-con-error');
    });

    it('returns warn class for warn level', () => {
      expect(helper._consoleBadgeClass('warn')).toBe('pft-con-warn');
    });

    it('returns log class for other levels', () => {
      expect(helper._consoleBadgeClass('log')).toBe('pft-con-log');
      expect(helper._consoleBadgeClass('info')).toBe('pft-con-log');
    });
  });

  describe('_buildHtml() branch coverage', () => {
    it('handles missing route properties', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10, queryCount: 0, totalQueryMs: 0,
        cacheTotal: 0, cacheHits: 0,
        queries: [], consoleLogs: [], cacheOps: [],
        route: {}, // missing method and path
        request: {}
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('?'); // fallback for missing route
    });

    it('handles query without params', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10, queryCount: 1, totalQueryMs: 5,
        cacheTotal: 0, cacheHits: 0,
        queries: [{ sql: 'SELECT 1', durationMs: 5 }], // no params
        consoleLogs: [], cacheOps: [],
        route: { method: 'GET', path: '/' },
        request: {}
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('SELECT 1');
      // The query row should not contain a params div (only in CSS definition)
      expect(html).not.toContain('<div class="pft-params">');
    });

    it('handles console log with no level (defaults to log)', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10, queryCount: 0, totalQueryMs: 0,
        cacheTotal: 0, cacheHits: 0,
        queries: [], consoleLogs: [{ message: 'test' }], // no level
        cacheOps: [],
        route: { method: 'GET', path: '/' },
        request: {}
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('LOG');
      expect(html).toContain('pft-con-log');
    });

    it('handles request section with object-valued header', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10, queryCount: 0, totalQueryMs: 0,
        cacheTotal: 0, cacheHits: 0,
        queries: [], consoleLogs: [], cacheOps: [],
        route: { method: 'GET', path: '/' },
        request: { method: 'GET', url: '/', ip: '127.0.0.1', headers: { 'x-custom': { nested: true } } }
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('x-custom');
    });

    it('handles empty request sections (no requestContent)', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10, queryCount: 0, totalQueryMs: 0,
        cacheTotal: 0, cacheHits: 0,
        queries: [], consoleLogs: [], cacheOps: [],
        route: {}, // empty route
        request: { query: {}, body: {}, params: {}, cookies: {}, headers: {} }
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      // Route section still renders with ?, but empty query/body/params/cookies/headers produce no sections
      expect(html).toContain('pft-root');
    });

    it('handles warn-level console logs', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10, queryCount: 0, totalQueryMs: 0,
        cacheTotal: 0, cacheHits: 0,
        queries: [], consoleLogs: [{ level: 'warn', message: 'warning!' }],
        cacheOps: [],
        route: { method: 'GET', path: '/' },
        request: {}
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('pft-con-warn');
      expect(html).toContain('WARN');
    });

    it('handles renderSection with null/undefined obj', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10, queryCount: 0, totalQueryMs: 0,
        cacheTotal: 0, cacheHits: 0,
        queries: [], consoleLogs: [], cacheOps: [],
        route: { method: 'GET', path: '/' },
        request: { method: 'GET', url: '/', ip: '127.0.0.1', query: null, body: null, params: null, cookies: null, headers: null }
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('pft-root');
    });
  });

  describe('render() additional', () => {
    it('renders with empty queries and console logs', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 50,
        queryCount: 0,
        totalQueryMs: 0,
        cacheTotal: 0,
        cacheHits: 0,
        queries: [],
        consoleLogs: [],
        cacheOps: [],
        route: { method: 'GET', path: '/' },
        request: { method: 'GET', url: '/', ip: '127.0.0.1', query: {}, body: {}, params: {}, cookies: {}, headers: {} }
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('50.0ms');
      expect(html).toContain('SQL: 0');
    });

    it('renders error-level console logs with error badge', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10,
        queryCount: 0,
        totalQueryMs: 0,
        cacheTotal: 0,
        cacheHits: 0,
        queries: [],
        consoleLogs: [{ level: 'error', message: 'something failed' }],
        cacheOps: [],
        route: { method: 'GET', path: '/' },
        request: { method: 'GET', url: '/', ip: '127.0.0.1', query: {}, body: {}, params: {}, cookies: {}, headers: {} }
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('pft-con-error');
      expect(html).toContain('something failed');
    });

    it('renders cache operations with miss indicator', () => {
      process.env.PROFILER_ENABLED = 'true';
      const data = {
        totalMs: 10,
        queryCount: 0,
        totalQueryMs: 0,
        cacheTotal: 2,
        cacheHits: 1,
        queries: [],
        consoleLogs: [],
        cacheOps: [
          { key: 'user:1', hit: true },
          { key: 'user:2', hit: false }
        ],
        route: { method: 'POST', path: '/api' },
        request: { method: 'POST', url: '/api', ip: '10.0.0.1', query: {}, body: { data: 1 }, params: {}, cookies: {}, headers: {} }
      };
      const ctx = { _profiler: { isEnabled: () => true, getProfileData: () => data }, ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toContain('Cache (2)');
      expect(html).toContain('user:1');
      expect(html).toContain('user:2');
    });
  });
});
