// application/service/domain/query-cache-domain-service.js
const AbstractService = require('../abstract-service');
const crypto = require('node:crypto');

class QueryCacheService extends AbstractService {
  _emailHashes = {};

  // ----------------------------------------------------------------
  // Key helpers
  // ----------------------------------------------------------------

  emailHash(email) {
    if (!this._emailHashes[email]) {
      this._emailHashes[email] = crypto.createHash('md5').update(email).digest('hex');
    }
    return this._emailHashes[email];
  }

  // ----------------------------------------------------------------
  // Core cache-through
  // ----------------------------------------------------------------

  /**
   * Load from cache or execute queryFn and store result.
   * @param {string} key - cache key
   * @param {Function} queryFn - async function returning data
   * @param {object} options
   * @param {number} options.ttl - seconds (default 120)
   * @param {string[]} options.registries - registry keys to track this entry in
   * @returns {*} cached or fresh data
   */
  async cacheThrough(key, queryFn, options = {}) {
    const cache = this.getCache();
    if (!cache) return queryFn();

    const cached = await cache.load(key);
    if (cached !== false) {
      this._recordCacheOp(key, true);
      return cached;
    }

    const data = await queryFn();

    const ttl = options.ttl || 120;
    await cache.save(data, key, ttl);
    this._recordCacheOp(key, false);

    if (options.registries && Array.isArray(options.registries)) {
      for (const registryKey of options.registries) {
        await this._addToRegistry(registryKey, key);
      }
    }

    return data;
  }

  // ----------------------------------------------------------------
  // Registry management
  // ----------------------------------------------------------------

  async _addToRegistry(registryKey, cacheKey) {
    const cache = this.getCache();
    if (!cache) return;

    let entries = await cache.load(registryKey);
    if (!entries || !Array.isArray(entries)) {
      entries = [];
    }

    if (!entries.includes(cacheKey)) {
      entries.push(cacheKey);
      await cache.save(entries, registryKey, 86400);
    }
  }

  /**
   * Flush all cache keys tracked by the given registries.
   * @param {string[]} registryKeys
   */
  async flush(registryKeys) {
    const cache = this.getCache();
    if (!cache) return;

    for (const registryKey of registryKeys) {
      const entries = await cache.load(registryKey);
      if (entries && Array.isArray(entries)) {
        for (const key of entries) {
          await cache.remove(key);
        }
      }
      await cache.remove(registryKey);
    }
  }

  // ----------------------------------------------------------------
  // Event-based invalidation
  // ----------------------------------------------------------------

  _recordCacheOp(key, hit) {
    try {
      const sm = this.getServiceManager();
      if (sm?.has('Profiler')) {
        const profiler = sm.get('Profiler');
        if (profiler.isEnabled()) {
          profiler.recordCacheOp(key, hit);
        }
      }
    } catch (_) {
      // Intentionally ignored - profiler recording should never break cache operations
    }
  }

  async onFileChanged(tenantId) {
    await this.flush([`registry:tenant:${tenantId}`]);
  }

  async onFolderChanged(tenantId, email) {
    const regs = [`registry:tenant:${tenantId}`];
    if (email) regs.push(`registry:user:${this.emailHash(email)}`);
    await this.flush(regs);
  }

  async onPermissionChanged(tenantId) {
    await this.flush([`registry:tenant:${tenantId}`]);
  }

  async onStarChanged(email) {
    await this.flush([`registry:user:${this.emailHash(email)}`]);
  }
}

module.exports = QueryCacheService;
