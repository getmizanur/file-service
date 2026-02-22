/**
 * NullCache - disabled cache adapter implementing the same API as Cache.
 * Used when caching is disabled via configuration.
 */
class NullCache {
  load(_id) { return false; }

  // Keep flexible signature: (data, id, tags = [], specificLifetime = null)
  save(_data, _id, _tags = [], _specificLifetime = null) { return true; }

  remove(_id) { return true; }

  clean(_mode = 'all', _tags = []) { return true; }

  getStats() {
    return {
      backend: 'NullCache',
      enabled: false,
      total_entries: 0,
      memory_usage: 0
    };
  }

  getBackend() {
    return 'NullCache';
  }

  close() {
    // no-op
  }
}

module.exports = NullCache;