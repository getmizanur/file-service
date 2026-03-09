// library/profiler/profiler.js
const { AsyncLocalStorage } = require('node:async_hooks');

class Profiler {
  enabled = false;
  _dbAdapterInstrumented = false;
  _consoleInstrumented = false;

  constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage();
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(flag) {
    this.enabled = !!flag;
    return this;
  }

  /**
   * Create a new profiling context for a request.
   */
  createContext(routeInfo = {}) {
    return {
      requestStart: process.hrtime.bigint(),
      route: routeInfo,
      queries: [],
      cacheOps: [],
      consoleLogs: []
    };
  }

  /**
   * Run a callback within a profiling context (AsyncLocalStorage).
   */
  runInContext(store, fn) {
    return this.asyncLocalStorage.run(store, fn);
  }

  /**
   * Get the current request's profiling context, or null.
   */
  getContext() {
    return this.asyncLocalStorage.getStore() || null;
  }

  // ---- Recording helpers ----

  recordQuery(sql, params, durationMs) {
    const ctx = this.getContext();
    if (!ctx) return;
    ctx.queries.push({
      sql: sql.length > 300 ? sql.substring(0, 300) + '...' : sql,
      params: params && params.length > 0 ? params : undefined,
      durationMs: Math.round(durationMs * 100) / 100
    });
  }

  recordCacheOp(key, hit) {
    const ctx = this.getContext();
    if (!ctx) return;
    ctx.cacheOps.push({ key, hit });
  }

  recordConsole(level, args) {
    const ctx = this.getContext();
    if (!ctx) return;
    const msg = args.map(a => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch (_) { /* Intentionally ignored - circular or non-serializable object; use String fallback */ return String(a); }
    }).join(' ');
    ctx.consoleLogs.push({ level, message: msg });
  }

  // ---- Instrumentation ----

  /**
   * Wrap console.log/warn/error to capture output per-request.
   * Original methods are preserved and still called.
   */
  instrumentConsole() {
    if (this._consoleInstrumented) return;
    this._consoleInstrumented = true;

    const _log = console.log;
    const _warn = console.warn;
    const _error = console.error;

    // Store originals so printSummary can bypass capture
    this._originalConsole = { log: _log, warn: _warn, error: _error };

    console.log = (...args) => {
      this.recordConsole('log', args);
      return _log.apply(console, args);
    };
    console.warn = (...args) => {
      this.recordConsole('warn', args);
      return _warn.apply(console, args);
    };
    console.error = (...args) => {
      this.recordConsole('error', args);
      return _error.apply(console, args);
    };
  }

  /**
   * Wrap PostgreSQLAdapter.query() to record timing.
   * Called once; idempotent.
   */
  instrumentDbAdapter(dbAdapter) {
    if (this._dbAdapterInstrumented) return;
    this._dbAdapterInstrumented = true;

    const originalQuery = dbAdapter.query.bind(dbAdapter);

    dbAdapter.query = async (sql, params = []) => {
      if (!this.isEnabled() || !this.getContext()) {
        return originalQuery(sql, params);
      }

      const start = process.hrtime.bigint();
      try {
        return await originalQuery(sql, params);
      } finally {
        const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
        this.recordQuery(sql, params, elapsed);
      }
    };
  }

  // ---- Data for toolbar ----

  getProfileData() {
    const ctx = this.getContext();
    if (!ctx) return null;

    const totalMs = Number(process.hrtime.bigint() - ctx.requestStart) / 1e6;
    const totalQueryMs = ctx.queries.reduce((s, q) => s + q.durationMs, 0);
    const cacheHits = ctx.cacheOps.filter(c => c.hit).length;

    return {
      totalMs: Math.round(totalMs * 100) / 100,
      totalQueryMs: Math.round(totalQueryMs * 100) / 100,
      queryCount: ctx.queries.length,
      queries: ctx.queries,
      cacheOps: ctx.cacheOps,
      cacheHits,
      cacheMisses: ctx.cacheOps.length - cacheHits,
      cacheTotal: ctx.cacheOps.length,
      consoleLogs: ctx.consoleLogs || [],
      request: ctx.request || null,
      route: ctx.route
    };
  }

  // ---- Summary / Output ----

  printSummary() {
    const ctx = this.getContext();
    if (!ctx) return;

    const totalMs = Number(process.hrtime.bigint() - ctx.requestStart) / 1e6;
    const totalQueries = ctx.queries.length;
    const totalQueryTime = ctx.queries.reduce((sum, q) => sum + q.durationMs, 0);
    const route = ctx.route;

    const routeStr = route.routeName || `${route.module || '?'}/${route.controller || '?'}/${route.action || '?'}`;
    const header = `\n====== PROFILER: ${route.method || '?'} ${route.path || '?'} ======`;

    console.log(header);
    console.log(`Route: ${routeStr} | Total: ${totalMs.toFixed(2)}ms`);
    console.log(`SQL queries: ${totalQueries} (${totalQueryTime.toFixed(2)}ms)`);

    if (totalQueries > 0) {
      console.log('');
      ctx.queries.forEach((q, i) => {
        const idx = `[${i + 1}]`.padStart(4);
        const ms = `${q.durationMs.toFixed(2)}ms`.padStart(9);
        console.log(`  ${idx} ${ms} | ${q.sql}`);
        if (q.params) console.log(`               Params: ${JSON.stringify(q.params)}`);
      });
    }

    if (ctx.cacheOps.length > 0) {
      const hits = ctx.cacheOps.filter(c => c.hit).length;
      console.log(`\nCache: ${hits}/${ctx.cacheOps.length} hits`);
      ctx.cacheOps.forEach(c => {
        console.log(`  ${c.hit ? 'HIT ' : 'MISS'} | ${c.key}`);
      });
    }

    console.log('='.repeat(header.length - 1) + '\n');
  }
}

module.exports = Profiler;
