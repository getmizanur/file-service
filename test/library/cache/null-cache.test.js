const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const NullCache = require(path.join(projectRoot, 'library/cache/null-cache'));

describe('NullCache', () => {
  let cache;

  beforeEach(() => {
    cache = new NullCache();
  });

  describe('load()', () => {
    it('should return false for any id', () => {
      expect(cache.load('some-key')).toBe(false);
    });

    it('should return false when called with no arguments', () => {
      expect(cache.load()).toBe(false);
    });
  });

  describe('save()', () => {
    it('should return true', () => {
      expect(cache.save('data', 'id')).toBe(true);
    });

    it('should return true with all parameters', () => {
      expect(cache.save('data', 'id', ['tag1'], 3600)).toBe(true);
    });

    it('should return true with no arguments', () => {
      expect(cache.save()).toBe(true);
    });
  });

  describe('remove()', () => {
    it('should return true for any id', () => {
      expect(cache.remove('some-key')).toBe(true);
    });
  });

  describe('clean()', () => {
    it('should return true with default arguments', () => {
      expect(cache.clean()).toBe(true);
    });

    it('should return true with explicit mode and tags', () => {
      expect(cache.clean('matchingTag', ['tag1'])).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('should return stats object with correct properties', () => {
      const stats = cache.getStats();
      expect(stats).toEqual({
        backend: 'NullCache',
        enabled: false,
        total_entries: 0,
        memory_usage: 0
      });
    });
  });

  describe('getBackend()', () => {
    it('should return "NullCache"', () => {
      expect(cache.getBackend()).toBe('NullCache');
    });
  });

  describe('close()', () => {
    it('should be callable without error', () => {
      expect(() => cache.close()).not.toThrow();
    });

    it('should return undefined', () => {
      expect(cache.close()).toBeUndefined();
    });
  });
});
