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
    const mem = process.memoryUsage();
    return {
      requestStart: process.hrtime.bigint(),
      route: routeInfo,
      queries: [],
      cacheOps: [],
      consoleLogs: [],
      timings: [],
      memory: {
        start: { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, rss: mem.rss, external: mem.external, arrayBuffers: mem.arrayBuffers || 0 },
        end: null
      }
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

  /**
   * Record a named timing entry (e.g. controller action, service method).
   * @param {string} label - e.g. "IndexActionService.list"
   * @param {number} durationMs
   * @param {{ parent?: string }} meta - optional grouping info
   */
  recordTiming(label, durationMs, meta = {}) {
    const ctx = this.getContext();
    if (!ctx) return;
    ctx.timings.push({
      label,
      durationMs: Math.round(durationMs * 100) / 100,
      parent: meta.parent || null
    });
  }

  /**
   * Convenience wrapper: time an async function and record it.
   * Usage: await profiler.time('FolderDomainService.list', () => svc.list(...))
   * @param {string} label
   * @param {Function} fn - async or sync function to time
   * @param {{ parent?: string }} meta
   * @returns {*} return value of fn
   */
  async time(label, fn, meta = {}) {
    if (!this.isEnabled() || !this.getContext()) return fn();
    const start = process.hrtime.bigint();
    try {
      return await fn();
    } finally {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      this.recordTiming(label, elapsed, meta);
    }
  }

  /**
   * Capture end-of-request memory snapshot.
   */
  captureMemoryEnd() {
    const ctx = this.getContext();
    if (!ctx) return;
    const mem = process.memoryUsage();
    ctx.memory.end = { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, rss: mem.rss, external: mem.external, arrayBuffers: mem.arrayBuffers || 0 };
  }

  recordConsole(level, args) {
    const ctx = this.getContext();
    if (!ctx) return;
    const msg = args.map(a => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { /* Intentionally ignored - circular or non-serializable object; use String fallback */ return String(a); }
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

    // Capture end memory if not yet done
    if (!ctx.memory.end) this.captureMemoryEnd();

    const fmt = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100; // → MB
    const memStart = ctx.memory.start;
    const memEnd = ctx.memory.end || memStart;
    const memory = {
      start: { heapUsed: fmt(memStart.heapUsed), heapTotal: fmt(memStart.heapTotal), rss: fmt(memStart.rss), external: fmt(memStart.external), arrayBuffers: fmt(memStart.arrayBuffers) },
      end:   { heapUsed: fmt(memEnd.heapUsed), heapTotal: fmt(memEnd.heapTotal), rss: fmt(memEnd.rss), external: fmt(memEnd.external), arrayBuffers: fmt(memEnd.arrayBuffers) },
      delta: { heapUsed: fmt(memEnd.heapUsed - memStart.heapUsed), heapTotal: fmt(memEnd.heapTotal - memStart.heapTotal), rss: fmt(memEnd.rss - memStart.rss), external: fmt(memEnd.external - memStart.external), arrayBuffers: fmt((memEnd.arrayBuffers || 0) - (memStart.arrayBuffers || 0)) }
    };

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
      timings: ctx.timings || [],
      memory,
      request: ctx.request || null,
      route: ctx.route
    };
  }

  // ---- Summary / Output ----

  printSummary() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Use original console to avoid recursive capture into consoleLogs
    const log = this._originalConsole?.log || console.log;

    const totalMs = Number(process.hrtime.bigint() - ctx.requestStart) / 1e6;
    const totalQueries = ctx.queries.length;
    const totalQueryTime = ctx.queries.reduce((sum, q) => sum + q.durationMs, 0);
    const route = ctx.route;

    const routeStr = route.routeName || `${route.module || '?'}/${route.controller || '?'}/${route.action || '?'}`;
    const header = `\n====== PROFILER: ${route.method || '?'} ${route.path || '?'} ======`;

    log(header);
    log(`Route: ${routeStr} | Total: ${totalMs.toFixed(2)}ms`);
    log(`SQL queries: ${totalQueries} (${totalQueryTime.toFixed(2)}ms)`);

    if (totalQueries > 0) {
      log('');
      ctx.queries.forEach((q, i) => {
        const idx = `[${i + 1}]`.padStart(4);
        const ms = `${q.durationMs.toFixed(2)}ms`.padStart(9);
        log(`  ${idx} ${ms} | ${q.sql}`);
        if (q.params) log(`               Params: ${JSON.stringify(q.params)}`);
      });
    }

    if (ctx.cacheOps.length > 0) {
      const hits = ctx.cacheOps.filter(c => c.hit).length;
      log(`\nCache: ${hits}/${ctx.cacheOps.length} hits`);
      ctx.cacheOps.forEach(c => {
        log(`  ${c.hit ? 'HIT ' : 'MISS'} | ${c.key}`);
      });
    }

    if (ctx.timings && ctx.timings.length > 0) {
      log(`\nTimings: ${ctx.timings.length} recorded`);
      ctx.timings.forEach(t => {
        const indent = t.parent ? '    ' : '  ';
        const ms = `${t.durationMs.toFixed(2)}ms`.padStart(9);
        log(`${indent}${ms} | ${t.label}`);
      });
    }

    if (!ctx.memory.end) this.captureMemoryEnd();
    const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
    const mStart = ctx.memory.start;
    const mEnd = ctx.memory.end;
    log(`\nMemory: heap ${mb(mStart.heapUsed)}→${mb(mEnd.heapUsed)} MB (Δ${mb(mEnd.heapUsed - mStart.heapUsed)}) | rss ${mb(mStart.rss)}→${mb(mEnd.rss)} MB`);

    log('='.repeat(header.length - 1) + '\n');
  }
}

module.exports = Profiler;
