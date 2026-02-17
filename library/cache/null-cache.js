/**
 * NullCache - disabled cache adapter implementing the same API as Cache.
 * Used when caching is disabled via configuration.
 */
class NullCache {
  load(_id) { return false; }
  save(_data, _id, _specificLifetime = null) { return true; }
  remove(_id) { return true; }
  clean(_mode = null, _tags = null) { return true; }
}
module.exports = NullCache;
