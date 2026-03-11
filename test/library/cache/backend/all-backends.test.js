const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const fs = require('node:fs');
const File = require(path.join(projectRoot, 'library/cache/backend/file'));
const Memcache = require(path.join(projectRoot, 'library/cache/backend/memcache'));
const Sqlite = require(path.join(projectRoot, 'library/cache/backend/sqlite'));

// ============================================================
// File Backend
// ============================================================
describe('File cache backend', () => {

  beforeEach(() => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
    jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
    jest.spyOn(fs, 'renameSync').mockReturnValue(undefined);
    jest.spyOn(fs, 'unlinkSync').mockReturnValue(undefined);
    jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
    jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false, size: 100 });
    jest.spyOn(fs, 'rmdirSync').mockReturnValue(undefined);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{}');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- constructor ----
  describe('constructor', () => {
    it('should use default options', () => {
      const backend = new File();
      expect(backend.options.cache_dir).toBe('/tmp/cache');
      expect(backend.options.file_locking).toBe(true);
      expect(backend.options.read_control).toBe(true);
      expect(backend.options.file_name_prefix).toBe('app_cache');
    });

    it('should accept custom options', () => {
      const backend = new File({
        cache_dir: '/custom/path',
        file_name_prefix: 'my_prefix',
        file_locking: false,
        read_control: false
      });
      expect(backend.options.cache_dir).toBe('/custom/path');
      expect(backend.options.file_name_prefix).toBe('my_prefix');
      expect(backend.options.file_locking).toBe(false);
      expect(backend.options.read_control).toBe(false);
    });

    it('should create cache directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      const backend = new File({ cache_dir: '/new/dir' });
      expect(fs.mkdirSync).toHaveBeenCalledWith('/new/dir', expect.objectContaining({ recursive: true }));
      expect(backend).toBeDefined();
    });

    it('should throw if directory creation fails', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => { throw new Error('EPERM'); });
      expect(() => new File({ cache_dir: '/bad/dir' })).toThrow('Cannot create cache directory');
    });
  });

  // ---- sanitizeId / hashId ----
  describe('sanitizeId', () => {
    it('should replace non-alphanumeric characters with underscore', () => {
      const backend = new File();
      expect(backend.sanitizeId('foo/bar:baz')).toBe('foo_bar_baz');
      expect(backend.sanitizeId('simple')).toBe('simple');
    });
  });

  describe('hashId', () => {
    it('should return a hex sha1 hash', () => {
      const backend = new File();
      const hash = backend.hashId('test');
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
    });
  });

  // ---- getFilePath ----
  describe('getFilePath', () => {
    it('should return path in cache_dir with prefix and sanitized id', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      const fp = backend.getFilePath('my-key');
      expect(fp).toBe('/tmp/cache/app_cache---my-key');
    });

    it('should create hashed subdirectories when hashed_directory_level > 0', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockReturnValue(undefined);
      const backend = new File({ cache_dir: '/tmp/cache', hashed_directory_level: 2 });
      const fp = backend.getFilePath('test');
      // sha1 of 'test' starts with 'a9', so subdirs should be 'a/9'
      expect(fp).toContain('/a/9/');
    });
  });

  // ---- save ----
  describe('save', () => {
    it('should save data with read_control (control line + payload)', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      const result = backend.save({ content: 'hello' }, 'key1');
      expect(result).toBe(true);
      // file_locking is true by default, so it writes to temp then renames
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.renameSync).toHaveBeenCalled();
    });

    it('should save without read_control', () => {
      const backend = new File({ cache_dir: '/tmp/cache', read_control: false });
      const result = backend.save({ content: 'hello' }, 'key1');
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should save without file_locking (direct write)', () => {
      fs.renameSync.mockRestore();
      jest.spyOn(fs, 'renameSync').mockReturnValue(undefined);
      const backend = new File({ cache_dir: '/tmp/cache', file_locking: false });
      const result = backend.save({ content: 'hello' }, 'key1');
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
      // renameSync should not have been called for this save (it may have been called in constructor)
      // Check the last call pattern: file_locking=false means no rename in save
      const renameCalls = fs.renameSync.mock.calls;
      // None of the rename calls should be for a .tmp file in /tmp/cache
      const saveTmpCalls = renameCalls.filter(c => String(c[0]).includes('.tmp'));
      expect(saveTmpCalls).toHaveLength(0);
    });

    it('should return false on write error', () => {
      fs.writeFileSync.mockImplementation(() => { throw new Error('disk full'); });
      const backend = new File({ cache_dir: '/tmp/cache', file_locking: false });
      const result = backend.save({ content: 'hello' }, 'key1');
      expect(result).toBe(false);
    });
  });

  // ---- load ----
  describe('load', () => {
    it('should return false if file does not exist', () => {
      fs.existsSync.mockImplementation((p) => {
        if (p === '/tmp/cache') return true;
        return false;
      });
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(backend.load('missing')).toBe(false);
    });

    it('should load data with read_control and verify checksum', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      const payload = JSON.stringify({ content: 'hello' });
      const control = backend.generateControlDataFromPayload(payload);
      const fileContent = control + '\n' + payload;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = backend.load('key1');
      expect(result).toEqual({ content: 'hello' });
    });

    it('should return false on checksum mismatch', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      const fileContent = 'bad_control\n' + JSON.stringify({ content: 'hello' });

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = backend.load('key1');
      expect(result).toBe(false);
    });

    it('should return false if file has less than 2 lines (read_control)', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('single_line');

      expect(backend.load('key1')).toBe(false);
    });

    it('should load data without read_control', () => {
      const backend = new File({ cache_dir: '/tmp/cache', read_control: false });
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({ content: 'hello' }));

      expect(backend.load('key1')).toEqual({ content: 'hello' });
    });

    it('should return false for expired data', () => {
      const backend = new File({ cache_dir: '/tmp/cache', read_control: false });
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({ content: 'old', expires: Date.now() - 10000 }));

      expect(backend.load('key1')).toBe(false);
    });

    it('should return data if not yet expired', () => {
      const backend = new File({ cache_dir: '/tmp/cache', read_control: false });
      const data = { content: 'fresh', expires: Date.now() + 60000 };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(data));

      const result = backend.load('key1');
      expect(result.content).toBe('fresh');
    });

    it('should return false on JSON parse error', () => {
      const backend = new File({ cache_dir: '/tmp/cache', read_control: false });
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('not-json');

      expect(backend.load('key1')).toBe(false);
    });
  });

  // ---- remove ----
  describe('remove', () => {
    it('should remove file if it exists', () => {
      fs.existsSync.mockReturnValue(true);
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(backend.remove('key1')).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should return true even if file does not exist', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      fs.existsSync.mockImplementation((p) => {
        if (p === '/tmp/cache') return true;
        return false;
      });
      expect(backend.remove('key1')).toBe(true);
    });

    it('should return false on unlink error', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => { throw new Error('EPERM'); });
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(backend.remove('key1')).toBe(false);
    });
  });

  // ---- clean ----
  describe('clean', () => {
    it('should clean all files in mode "all"', () => {
      fs.readdirSync.mockReturnValue(['app_cache---key1']);
      fs.statSync.mockReturnValue({ isDirectory: () => false, size: 50 });
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(backend.clean('all')).toBe(true);
    });

    it('should clean expired files in mode "old"', () => {
      fs.readdirSync.mockReturnValue(['app_cache---key1']);
      fs.statSync.mockReturnValue({ isDirectory: () => false, size: 50 });
      fs.readFileSync.mockReturnValue(JSON.stringify({ content: 'old', expires: Date.now() - 10000 }));
      const backend = new File({ cache_dir: '/tmp/cache', read_control: false });
      expect(backend.clean('old')).toBe(true);
    });

    it('should return false for unsupported mode', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(backend.clean('matchingTag')).toBe(false);
    });
  });

  // ---- _isExpired ----
  describe('_isExpired', () => {
    let backend;
    beforeEach(() => {
      backend = new File();
    });

    it('should return false for non-object data', () => {
      expect(backend._isExpired(null)).toBe(false);
      expect(backend._isExpired('string')).toBe(false);
    });

    it('should return false if no expires field', () => {
      expect(backend._isExpired({ content: 'hello' })).toBe(false);
    });

    it('should return true for numeric expires in the past', () => {
      expect(backend._isExpired({ expires: Date.now() - 1000 })).toBe(true);
    });

    it('should return false for numeric expires in the future', () => {
      expect(backend._isExpired({ expires: Date.now() + 60000 })).toBe(false);
    });

    it('should handle ISO string dates', () => {
      expect(backend._isExpired({ expires: '2000-01-01T00:00:00Z' })).toBe(true);
      expect(backend._isExpired({ expires: '2099-01-01T00:00:00Z' })).toBe(false);
    });

    it('should check expires_at as well', () => {
      expect(backend._isExpired({ expires_at: Date.now() - 1000 })).toBe(true);
    });
  });

  // ---- generateControlData ----
  describe('generateControlData', () => {
    it('should produce stable checksum from data', () => {
      const backend = new File();
      const data = { content: 'hello' };
      const c1 = backend.generateControlData(data);
      const c2 = backend.generateControlData(data);
      expect(c1).toBe(c2);
      expect(c1).toMatch(/^control_sha256_/);
    });
  });

  // ---- getStats ----
  describe('getStats', () => {
    it('should return statistics with backend name', () => {
      fs.readdirSync.mockReturnValue([]);
      const backend = new File({ cache_dir: '/tmp/cache' });
      const stats = backend.getStats();
      expect(stats.backend).toBe('File');
      expect(stats.cache_dir).toBe('/tmp/cache');
      expect(stats.total_files).toBe(0);
    });

    it('should count files and sizes', () => {
      fs.readdirSync.mockReturnValue(['app_cache---k1', 'app_cache---k2']);
      fs.statSync.mockReturnValue({ isDirectory: () => false, size: 200 });
      fs.readFileSync.mockReturnValue(JSON.stringify({ content: 'x' }));
      const backend = new File({ cache_dir: '/tmp/cache', read_control: false });
      const stats = backend.getStats();
      expect(stats.total_files).toBe(2);
      expect(stats.total_size).toBe(400);
    });
  });

  // ---- debug logging ----
  describe('_log', () => {
    it('should call console.debug when debug is enabled', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const backend = new File({ cache_dir: '/tmp/cache', debug: true });
      backend._log('test message');
      expect(spy).toHaveBeenCalledWith('[Cache:File]', 'test message');
      spy.mockRestore();
    });
  });

  // ---- load with read_control and expired data ----
  describe('load with read_control - expired data removal', () => {
    it('should remove expired data loaded with read_control', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      const expiredData = { content: 'old', expires: Date.now() - 10000 };
      const payload = JSON.stringify(expiredData);
      const control = backend.generateControlDataFromPayload(payload);
      const fileContent = control + '\n' + payload;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = backend.load('expired_key');
      expect(result).toBe(false);
    });
  });

  // ---- clean error paths ----
  describe('clean error paths', () => {
    it('cleanAll should return false on error', () => {
      fs.readdirSync.mockImplementation(() => { throw new Error('EACCES'); });
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(backend.cleanAll()).toBe(false);
    });

    it('cleanExpired should return false on error', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      // Now make fs calls throw after construction
      fs.existsSync.mockImplementation(() => { throw new Error('EACCES'); });
      expect(backend.cleanExpired()).toBe(false);
    });

    it('clean with unsupported tag mode should return false (line 240)', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(backend.clean('notMatchingTag', ['tag1'])).toBe(false);
    });

    it('clean should catch error from cleanAll and return false', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      // Make cleanAll throw (not return false)
      backend.cleanAll = () => { throw new Error('cleanAll blew up'); };
      expect(backend.clean('all')).toBe(false);
    });
  });

  // ---- removeDirectoryContents with subdirectories ----
  describe('removeDirectoryContents with directories', () => {
    it('should recurse into subdirectories', () => {
      let callCount = 0;
      fs.readdirSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return ['subdir', 'app_cache---key1'];
        return [];
      });
      fs.statSync.mockImplementation((p) => ({
        isDirectory: () => p.endsWith('subdir'),
        size: 50
      }));
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(() => backend.removeDirectoryContents('/tmp/cache')).not.toThrow();
      expect(fs.rmdirSync).toHaveBeenCalled();
    });
  });

  // ---- cleanExpiredInDirectory with subdirectories ----
  describe('cleanExpiredInDirectory with directories', () => {
    it('should recurse into subdirectories', () => {
      let callCount = 0;
      fs.readdirSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return ['subdir'];
        return [];
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true, size: 0 });
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(() => backend.cleanExpiredInDirectory('/tmp/cache')).not.toThrow();
    });
  });

  // ---- _cleanFileIfExpired with unreadable file ----
  describe('_cleanFileIfExpired', () => {
    it('should clean unreadable files', () => {
      fs.readFileSync.mockImplementation(() => { throw new Error('unreadable'); });
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(() => backend._cleanFileIfExpired('/tmp/cache/app_cache---broken')).not.toThrow();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not throw when both readFileSync and unlinkSync fail', () => {
      fs.readFileSync.mockImplementation(() => { throw new Error('unreadable'); });
      fs.unlinkSync.mockImplementation(() => { throw new Error('EPERM'); });
      const backend = new File({ cache_dir: '/tmp/cache' });
      expect(() => backend._cleanFileIfExpired('/tmp/cache/app_cache---broken')).not.toThrow();
    });
  });

  // ---- getStats error ----
  describe('getStats error path', () => {
    it('should return error object on failure', () => {
      fs.readdirSync.mockImplementation(() => { throw new Error('stat fail'); });
      const backend = new File({ cache_dir: '/tmp/cache' });
      const stats = backend.getStats();
      expect(stats.error).toBeDefined();
    });
  });

  // ---- collectStats with directories and expired files ----
  describe('collectStats with directories', () => {
    it('should recurse into subdirectories and count expired files', () => {
      let callCount = 0;
      fs.readdirSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return ['subdir', 'app_cache---k1'];
        return [];
      });
      fs.statSync.mockImplementation((p) => ({
        isDirectory: () => p.endsWith('subdir'),
        size: 100
      }));
      fs.readFileSync.mockReturnValue(JSON.stringify({ content: 'x', expires: Date.now() - 10000 }));
      const backend = new File({ cache_dir: '/tmp/cache', read_control: false });
      const stats = {
        backend: 'File', cache_dir: '/tmp/cache',
        total_files: 0, total_size: 0, expired_files: 0
      };
      backend.collectStats('/tmp/cache', stats);
      expect(stats.total_files).toBe(1);
      expect(stats.expired_files).toBe(1);
    });

    it('should count unreadable files as expired', () => {
      fs.readdirSync.mockReturnValue(['app_cache---broken']);
      fs.statSync.mockReturnValue({ isDirectory: () => false, size: 50 });
      fs.readFileSync.mockImplementation(() => { throw new Error('unreadable'); });
      const backend = new File({ cache_dir: '/tmp/cache' });
      const stats = {
        backend: 'File', cache_dir: '/tmp/cache',
        total_files: 0, total_size: 0, expired_files: 0
      };
      backend.collectStats('/tmp/cache', stats);
      expect(stats.expired_files).toBe(1);
    });
  });

  // ---- loadFile ----
  describe('loadFile', () => {
    it('should parse file with read_control', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      const payload = JSON.stringify({ content: 'test' });
      const control = backend.generateControlDataFromPayload(payload);
      fs.readFileSync.mockReturnValue(control + '\n' + payload);
      const result = backend.loadFile('/tmp/cache/app_cache---k1');
      expect(result).toEqual({ content: 'test' });
    });

    it('should return null on single-line file with read_control', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      fs.readFileSync.mockReturnValue('one-line');
      expect(backend.loadFile('/tmp/cache/app_cache---k1')).toBe(null);
    });

    it('should return null on corrupted file', () => {
      const backend = new File({ cache_dir: '/tmp/cache' });
      fs.readFileSync.mockImplementation(() => { throw new Error('read error'); });
      expect(backend.loadFile('/tmp/cache/app_cache---k1')).toBe(null);
    });
  });
});

// ============================================================
// Memcache Backend (mock mode)
// ============================================================
describe('Memcache cache backend', () => {

  // ---- constructor ----
  describe('constructor', () => {
    it('should default to mock mode with localhost server', () => {
      const mc = new Memcache();
      expect(mc.connected).toBe(true);
      expect(mc.options.use_mock).toBe(true);
      expect(mc.options.servers[0].host).toBe('localhost');
      expect(mc.options.servers[0].port).toBe(11211);
    });

    it('should accept single server option', () => {
      const mc = new Memcache({ server: { host: '10.0.0.1', port: 11212 } });
      expect(mc.options.servers[0].host).toBe('10.0.0.1');
      expect(mc.options.servers[0].port).toBe(11212);
    });

    it('should accept servers array', () => {
      const mc = new Memcache({ servers: [{ host: 'a', port: 1 }, { host: 'b', port: 2 }] });
      expect(mc.options.servers).toHaveLength(2);
    });

    it('should set custom key_prefix and lifetime', () => {
      const mc = new Memcache({ key_prefix: 'test_', lifetime: 600 });
      expect(mc.options.key_prefix).toBe('test_');
      expect(mc.options.lifetime).toBe(600);
    });
  });

  // ---- getKey / _getPrefixedKey ----
  describe('getKey', () => {
    it('should prefix the id', () => {
      const mc = new Memcache({ key_prefix: 'pre_' });
      expect(mc.getKey('mykey')).toBe('pre_mykey');
    });
  });

  describe('_getPrefixedKey', () => {
    it('should add prefix when not already prefixed', () => {
      const mc = new Memcache({ key_prefix: 'app_cache_' });
      expect(mc._getPrefixedKey('mykey')).toBe('app_cache_mykey');
    });

    it('should not double-prefix', () => {
      const mc = new Memcache({ key_prefix: 'app_cache_' });
      expect(mc._getPrefixedKey('app_cache_mykey')).toBe('app_cache_mykey');
    });
  });

  // ---- save / load ----
  describe('save and load', () => {
    it('should save and load data', () => {
      const mc = new Memcache();
      const saved = mc.save({ content: 'hello' }, 'key1');
      expect(saved).toBe(true);

      const loaded = mc.load('key1');
      expect(loaded).toEqual({ content: 'hello' });
    });

    it('should return false for missing key', () => {
      const mc = new Memcache();
      expect(mc.load('nonexistent')).toBe(false);
    });

    it('should respect specific lifetime', () => {
      const mc = new Memcache();
      mc.save({ content: 'x' }, 'key1', [], 1); // 1 second TTL
      expect(mc.load('key1')).toEqual({ content: 'x' });
    });

    it('should return false when not connected (save)', () => {
      const mc = new Memcache();
      mc.connected = false;
      expect(mc.save({ x: 1 }, 'k')).toBe(false);
    });

    it('should return false when not connected (load)', () => {
      const mc = new Memcache();
      mc.connected = false;
      expect(mc.load('k')).toBe(false);
    });
  });

  // ---- remove ----
  describe('remove', () => {
    it('should remove existing key and return true', () => {
      const mc = new Memcache();
      mc.save({ content: 'hello' }, 'key1');
      expect(mc.remove('key1')).toBe(true);
      expect(mc.load('key1')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      const mc = new Memcache();
      expect(mc.remove('nonexistent')).toBe(false);
    });

    it('should return false when not connected', () => {
      const mc = new Memcache();
      mc.connected = false;
      expect(mc.remove('k')).toBe(false);
    });
  });

  // ---- clean ----
  describe('clean', () => {
    it('should clear all entries with mode "all"', () => {
      const mc = new Memcache();
      mc.save({ content: 'a' }, 'k1');
      mc.save({ content: 'b' }, 'k2');
      expect(mc.clean('all')).toBe(true);
      expect(mc.load('k1')).toBe(false);
      expect(mc.load('k2')).toBe(false);
    });

    it('should clean expired entries with mode "old"', () => {
      const mc = new Memcache();
      mc.save({ content: 'a' }, 'k1');
      // manually expire an entry
      const key = mc.getKey('k1');
      mc.mockStorage.get(key).expiresAt = Date.now() - 1000;
      expect(mc.clean('old')).toBe(true);
      expect(mc.load('k1')).toBe(false);
    });

    it('should return false when not connected', () => {
      const mc = new Memcache();
      mc.connected = false;
      expect(mc.clean('all')).toBe(false);
    });
  });

  // ---- getStats ----
  describe('getStats', () => {
    it('should return mock stats', () => {
      const mc = new Memcache();
      mc.save({ content: 'hello' }, 'k1');
      const stats = mc.getStats();
      expect(stats.backend).toBe('Mock Memcache');
      expect(stats.total_entries).toBe(1);
      expect(stats.memory_usage).toBeGreaterThan(0);
    });

    it('should return zero stats when not connected', () => {
      const mc = new Memcache();
      mc.connected = false;
      const stats = mc.getStats();
      expect(stats.backend).toBe('Memcache');
      expect(stats.total_entries).toBe(0);
    });
  });

  // ---- close ----
  describe('close', () => {
    it('should set connected to false', () => {
      const mc = new Memcache();
      mc.close();
      expect(mc.connected).toBe(false);
    });
  });

  // ---- _calculateHitRatio ----
  describe('_calculateHitRatio', () => {
    it('should calculate ratio from stats', () => {
      const mc = new Memcache();
      expect(mc._calculateHitRatio({ get_hits: '80', get_misses: '20' })).toBe(80);
    });

    it('should return 0 when no total', () => {
      const mc = new Memcache();
      expect(mc._calculateHitRatio({})).toBe(0);
    });
  });

  // ---- mock client callbacks ----
  describe('createMockClient', () => {
    it('should provide working get callback for missing key', (done) => {
      const mc = new Memcache();
      mc.client.get('missing', (err, val) => {
        expect(err).toBe(null);
        expect(val).toBeUndefined();
        done();
      });
    });

    it('should provide working set/get callback', (done) => {
      const mc = new Memcache();
      mc.client.set('testkey', 'testval', 60, (err, ok) => {
        expect(ok).toBe(true);
        mc.client.get('testkey', (err2, val) => {
          expect(val).toBe('testval');
          done();
        });
      });
    });

    it('should provide working del callback', (done) => {
      const mc = new Memcache();
      mc.client.set('k', 'v', 0, () => {
        mc.client.del('k', (err, existed) => {
          expect(existed).toBe(true);
          done();
        });
      });
    });

    it('should provide working flush callback', (done) => {
      const mc = new Memcache();
      mc.client.set('k', 'v', 0, () => {
        mc.client.flush((err, ok) => {
          expect(ok).toBe(true);
          expect(mc.mockStorage.size).toBe(0);
          done();
        });
      });
    });

    it('should provide working stats callback', (done) => {
      const mc = new Memcache();
      mc.client.stats((err, stats) => {
        expect(stats.backend).toBe('Mock Memcache');
        done();
      });
    });
  });

  // ---- connect / createRealClient ----
  describe('connect', () => {
    it('should set connected to false when client is null', () => {
      const mc = new Memcache();
      mc.client = null;
      mc.connect();
      expect(mc.connected).toBe(false);
    });
  });

  describe('createRealClient', () => {
    it('should return null', () => {
      const mc = new Memcache();
      expect(mc.createRealClient()).toBe(null);
    });
  });
});

// ============================================================
// Redis Backend
// ============================================================
describe('Redis cache backend', () => {
  let Redis;
  let mockClient;

  beforeEach(() => {
    jest.resetModules();

    mockClient = {
      isOpen: true,
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      setEx: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      scan: jest.fn()
    };

    jest.mock('redis', () => ({
      createClient: jest.fn(() => mockClient)
    }));

    Redis = require(path.join(projectRoot, 'library/cache/backend/redis'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- constructor ----
  describe('constructor', () => {
    it('should set default options', () => {
      const r = new Redis();
      expect(r.options.host).toBe('localhost');
      expect(r.options.port).toBe(6379);
      expect(r.options.key_prefix).toBe('cache:');
      expect(r.isAsync).toBe(true);
    });

    it('should accept custom options', () => {
      const r = new Redis({ host: '10.0.0.1', port: 6380, password: 'secret', database: 2 });
      expect(r.options.host).toBe('10.0.0.1');
      expect(r.options.port).toBe(6380);
      expect(r.options.password).toBe('secret');
      expect(r.options.database).toBe(2);
    });
  });

  // ---- _key ----
  describe('_key', () => {
    it('should prefix the id', () => {
      const r = new Redis({ key_prefix: 'test:' });
      expect(r._key('abc')).toBe('test:abc');
    });
  });

  // ---- load ----
  describe('load', () => {
    it('should return parsed data from redis', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ content: 'hello' }));
      const r = new Redis();
      const result = await r.load('k1');
      expect(result).toEqual({ content: 'hello' });
    });

    it('should return false if key not found', async () => {
      mockClient.get.mockResolvedValue(null);
      const r = new Redis();
      expect(await r.load('k1')).toBe(false);
    });

    it('should return false for expired data', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ content: 'old', expires: Date.now() - 10000 }));
      const r = new Redis();
      expect(await r.load('k1')).toBe(false);
    });

    it('should return false on error', async () => {
      mockClient.connect.mockRejectedValue(new Error('connection refused'));
      const r = new Redis();
      r._connecting = null;
      r.client = null;
      expect(await r.load('k1')).toBe(false);
    });
  });

  // ---- save ----
  describe('save', () => {
    it('should save with setEx when ttl > 0', async () => {
      const r = new Redis();
      const result = await r.save({ content: 'hello' }, 'k1', [], 60);
      expect(result).toBe(true);
      expect(mockClient.setEx).toHaveBeenCalledWith('cache:k1', 60, expect.any(String));
    });

    it('should save with set when ttl is 0', async () => {
      const r = new Redis();
      const result = await r.save({ content: 'hello' }, 'k1', [], 0);
      expect(result).toBe(true);
      expect(mockClient.set).toHaveBeenCalledWith('cache:k1', expect.any(String));
    });

    it('should return false on error', async () => {
      mockClient.set.mockRejectedValue(new Error('write error'));
      const r = new Redis();
      expect(await r.save({ x: 1 }, 'k1')).toBe(false);
    });
  });

  // ---- remove ----
  describe('remove', () => {
    it('should delete the key and return true', async () => {
      const r = new Redis();
      expect(await r.remove('k1')).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith('cache:k1');
    });

    it('should return false on error', async () => {
      mockClient.del.mockRejectedValue(new Error('err'));
      const r = new Redis();
      expect(await r.remove('k1')).toBe(false);
    });
  });

  // ---- clean ----
  describe('clean', () => {
    it('should scan and delete all keys in mode "all"', async () => {
      mockClient.scan.mockResolvedValue({ cursor: 0, keys: ['cache:k1', 'cache:k2'] });
      mockClient.del.mockResolvedValue(2);
      const r = new Redis();
      expect(await r.clean('all')).toBe(true);
    });

    it('should return false for mode other than "all"', async () => {
      const r = new Redis();
      expect(await r.clean('old')).toBe(false);
    });

    it('should return false on error', async () => {
      mockClient.scan.mockRejectedValue(new Error('err'));
      const r = new Redis();
      expect(await r.clean('all')).toBe(false);
    });
  });

  // ---- _isExpired ----
  describe('_isExpired', () => {
    it('should return false for non-object', () => {
      const r = new Redis();
      expect(r._isExpired(null)).toBe(false);
    });

    it('should return true for expired numeric timestamp', () => {
      const r = new Redis();
      expect(r._isExpired({ expires: Date.now() - 1000 })).toBe(true);
    });

    it('should return false for future timestamp', () => {
      const r = new Redis();
      expect(r._isExpired({ expires: Date.now() + 60000 })).toBe(false);
    });

    it('should handle string ISO dates', () => {
      const r = new Redis();
      expect(r._isExpired({ expires: '2000-01-01T00:00:00Z' })).toBe(true);
      expect(r._isExpired({ expires: '2099-01-01T00:00:00Z' })).toBe(false);
    });

    it('should check expires_at field', () => {
      const r = new Redis();
      expect(r._isExpired({ expires_at: Date.now() - 1000 })).toBe(true);
    });

    it('should return false when expires is not number or string (line 170)', () => {
      const r = new Redis();
      expect(r._isExpired({ expires: { obj: true } })).toBe(false);
      expect(r._isExpired({ expires: true })).toBe(false);
      expect(r._isExpired({ expires: [1, 2] })).toBe(false);
    });

    it('should return false when expires is an unparseable string', () => {
      const r = new Redis();
      expect(r._isExpired({ expires: 'not-a-date' })).toBe(false);
    });
  });

  describe('_log (line 27)', () => {
    it('should call console.debug when debug is true', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const r = new Redis({ debug: true });
      r._log('test message');
      expect(spy).toHaveBeenCalledWith('[Cache:Redis]', 'test message');
      spy.mockRestore();
    });

    it('should not call console.debug when debug is false', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const r = new Redis({ debug: false });
      r._log('test message');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ---- _getClient ----
  describe('_getClient', () => {
    it('should reuse existing open client', async () => {
      const r = new Redis();
      r.client = mockClient;
      const client = await r._getClient();
      expect(client).toBe(mockClient);
      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    it('should build URL with password when provided', async () => {
      const { createClient } = require('redis');
      const r = new Redis({ password: 'secret', host: 'myhost', port: 6380 });
      r.client = null;
      r._connecting = null;
      mockClient.isOpen = false;
      await r._getClient();
      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'redis://:secret@myhost:6380' })
      );
    });

    it('should reuse pending connection promise', async () => {
      const r = new Redis();
      r.client = null;
      mockClient.isOpen = false;
      const p1 = r._getClient();
      const p2 = r._getClient();
      const [c1, c2] = await Promise.all([p1, p2]);
      expect(c1).toBe(c2);
    });
  });
});

// ============================================================
// SQLite Backend (mock)
// ============================================================
describe('Sqlite cache backend', () => {

  beforeEach(() => {
    jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (typeof p === 'string' && p.endsWith('.json')) return false;
      return true;
    });
    jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
    jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
    jest.spyOn(fs, 'renameSync').mockReturnValue(undefined);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{}');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- constructor ----
  describe('constructor', () => {
    it('should set default options and create fresh db', () => {
      const s = new Sqlite();
      expect(s.connected).toBe(true);
      expect(s.options.table_name).toBe('cache');
      expect(s.mockDb).toBeDefined();
      expect(s.mockDb.cache).toEqual({});
    });

    it('should load existing db from json file', () => {
      const existingDb = {
        cache: { 'key1': { content: 'x', created: 1000, expires: 0 } },
        metadata: { created: 1000, version: '1.0' }
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(existingDb));

      const s = new Sqlite();
      expect(s.mockDb.cache.key1.content).toBe('x');
    });

    it('should accept custom options', () => {
      const s = new Sqlite({ table_name: 'sessions', key_prefix: 'sess_' });
      expect(s.options.table_name).toBe('sessions');
      expect(s.options.key_prefix).toBe('sess_');
    });
  });

  // ---- getKey ----
  describe('getKey', () => {
    it('should prefix the id', () => {
      const s = new Sqlite({ key_prefix: 'p_' });
      expect(s.getKey('myid')).toBe('p_myid');
    });

    it('should use empty prefix by default', () => {
      const s = new Sqlite();
      expect(s.getKey('myid')).toBe('myid');
    });
  });

  // ---- save / load ----
  describe('save and load', () => {
    it('should save and load data', () => {
      const s = new Sqlite();
      expect(s.save({ content: 'hello' }, 'k1')).toBe(true);
      const result = s.load('k1');
      expect(result.content).toBe('hello');
    });

    it('should return false for missing key', () => {
      const s = new Sqlite();
      expect(s.load('nonexistent')).toBe(false);
    });

    it('should return false for expired entry', () => {
      const s = new Sqlite();
      s.save({ content: 'old', expires: Date.now() - 10000 }, 'k1');
      expect(s.load('k1')).toBe(false);
    });

    it('should return false when not connected (save)', () => {
      const s = new Sqlite();
      s.connected = false;
      expect(s.save({ x: 1 }, 'k')).toBe(false);
    });

    it('should return false when not connected (load)', () => {
      const s = new Sqlite();
      s.connected = false;
      expect(s.load('k')).toBe(false);
    });
  });

  // ---- remove ----
  describe('remove', () => {
    it('should remove existing entry and return true', () => {
      const s = new Sqlite();
      s.save({ content: 'x' }, 'k1');
      expect(s.remove('k1')).toBe(true);
      expect(s.load('k1')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      const s = new Sqlite();
      expect(s.remove('nonexistent')).toBe(false);
    });

    it('should return false when not connected', () => {
      const s = new Sqlite();
      s.connected = false;
      expect(s.remove('k')).toBe(false);
    });
  });

  // ---- clean ----
  describe('clean', () => {
    it('should clear all entries with mode "all"', () => {
      const s = new Sqlite();
      s.save({ content: 'a' }, 'k1');
      s.save({ content: 'b' }, 'k2');
      expect(s.clean('all')).toBe(true);
      expect(s.load('k1')).toBe(false);
    });

    it('should clean expired entries with mode "old"', () => {
      const s = new Sqlite();
      // Directly insert expired entry
      s.mockDb.cache.k1 = { content: 'expired', expires: Date.now() - 10000, created: Date.now() };
      s.mockDb.cache.k2 = { content: 'fresh', expires: Date.now() + 60000, created: Date.now() };
      expect(s.clean('old')).toBe(true);
      expect(s.mockDb.cache.k1).toBeUndefined();
      expect(s.mockDb.cache.k2).toBeDefined();
    });

    it('should return false for tag-based modes', () => {
      const s = new Sqlite();
      expect(s.clean('matchingTag')).toBe(false);
      expect(s.clean('notMatchingTag')).toBe(false);
    });

    it('should return false for unknown mode', () => {
      const s = new Sqlite();
      expect(s.clean('unknown')).toBe(false);
    });

    it('should return false when not connected', () => {
      const s = new Sqlite();
      s.connected = false;
      expect(s.clean('all')).toBe(false);
    });
  });

  // ---- getStats ----
  describe('getStats', () => {
    it('should return connected stats', () => {
      const s = new Sqlite();
      s.save({ content: 'a' }, 'k1');
      const stats = s.getStats();
      expect(stats.backend).toBe('SQLite (Mock)');
      expect(stats.connected).toBe(true);
      expect(stats.total_entries).toBe(1);
    });

    it('should report not connected stats', () => {
      const s = new Sqlite();
      s.connected = false;
      const stats = s.getStats();
      expect(stats.connected).toBe(false);
    });
  });

  // ---- _isExpiredEntry ----
  describe('_isExpiredEntry', () => {
    let s;
    beforeEach(() => {
      s = new Sqlite();
    });

    it('should return false for non-object', () => {
      expect(s._isExpiredEntry(null)).toBe(false);
    });

    it('should return true for expired numeric', () => {
      expect(s._isExpiredEntry({ expires: Date.now() - 1000 })).toBe(true);
    });

    it('should return false for future expiry', () => {
      expect(s._isExpiredEntry({ expires: Date.now() + 60000 })).toBe(false);
    });

    it('should handle ISO string dates', () => {
      expect(s._isExpiredEntry({ expires: '2000-01-01T00:00:00Z' })).toBe(true);
    });

    it('should check expires_at field', () => {
      expect(s._isExpiredEntry({ expires_at: Date.now() - 1000 })).toBe(true);
    });
  });

  // ---- vacuum ----
  describe('vacuum', () => {
    it('should remove expired entries', () => {
      const s = new Sqlite();
      s.mockDb.cache.k1 = { content: 'x', expires: Date.now() - 10000, created: Date.now() };
      s.mockDb.cache.k2 = { content: 'y', expires: Date.now() + 60000, created: Date.now() };
      s.vacuum();
      expect(s.mockDb.cache.k1).toBeUndefined();
      expect(s.mockDb.cache.k2).toBeDefined();
    });

    it('should do nothing when not connected', () => {
      const s = new Sqlite();
      s.connected = false;
      s.mockDb.cache.k1 = { content: 'x', expires: Date.now() - 10000, created: Date.now() };
      s.vacuum();
      expect(s.mockDb.cache.k1).toBeDefined();
    });
  });

  // ---- maybeVacuum ----
  describe('maybeVacuum', () => {
    it('should not vacuum when factor is 0', () => {
      const s = new Sqlite({ automatic_vacuum_factor: 0 });
      jest.spyOn(s, 'vacuum');
      s.maybeVacuum();
      expect(s.vacuum).not.toHaveBeenCalled();
    });
  });

  // ---- close ----
  describe('close', () => {
    it('should set connected to false', () => {
      const s = new Sqlite();
      s.close();
      expect(s.connected).toBe(false);
    });
  });

  // ---- _log (debug mode) ----
  describe('_log with debug enabled', () => {
    it('should call console.debug when debug is true', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const s = new Sqlite({ debug: true });
      s._log('test message');
      expect(spy).toHaveBeenCalledWith('[Cache:SqliteMock]', 'test message');
      spy.mockRestore();
    });
  });

  // ---- initDatabase: directory creation ----
  describe('initDatabase directory creation', () => {
    it('should create directory when it does not exist', () => {
      fs.existsSync.mockImplementation((p) => {
        if (typeof p === 'string' && p.endsWith('.json')) return false;
        // directory does not exist
        return false;
      });
      const s = new Sqlite({ cache_db_complete_path: '/tmp/test/cache.db' });
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      expect(s.connected).toBe(true);
    });
  });

  // ---- initDatabase: corrupted table ----
  describe('initDatabase corrupted table', () => {
    it('should reinitialize table when it is not an object', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({ cache: 'not-an-object', metadata: {} }));
      const s = new Sqlite();
      expect(s.mockDb.cache).toEqual({});
      expect(s.connected).toBe(true);
    });

    it('should reinitialize table when it is null', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({ cache: null, metadata: {} }));
      const s = new Sqlite();
      expect(s.mockDb.cache).toEqual({});
    });
  });

  // ---- initDatabase: constructor error catch ----
  describe('initDatabase error catch', () => {
    it('should set connected=false when initDatabase throws', () => {
      fs.existsSync.mockImplementation(() => { throw new Error('fs fail'); });
      const s = new Sqlite();
      expect(s.connected).toBe(false);
    });
  });

  // ---- saveMockDb error path ----
  describe('saveMockDb error path', () => {
    it('should catch and log error when _saveMockDbAtomic throws', () => {
      const s = new Sqlite();
      jest.spyOn(s, '_saveMockDbAtomic').mockImplementation(() => { throw new Error('write fail'); });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      s.options.debug = true;
      s.saveMockDb();
      expect(spy).toHaveBeenCalledWith('[Cache:SqliteMock]', 'Mock database save error:', 'write fail');
      spy.mockRestore();
    });
  });

  // ---- maybeVacuum actually calling vacuum ----
  describe('maybeVacuum triggering vacuum', () => {
    it('should call vacuum when random is below threshold', () => {
      const s = new Sqlite({ automatic_vacuum_factor: 1 }); // always vacuum (1/1 = 100%)
      jest.spyOn(Math, 'random').mockReturnValue(0);
      jest.spyOn(s, 'vacuum').mockImplementation(() => {});
      s.maybeVacuum();
      expect(s.vacuum).toHaveBeenCalled();
      Math.random.mockRestore();
    });
  });

  // ---- vacuum error path ----
  describe('vacuum error path', () => {
    it('should catch error and log when entries iteration throws', () => {
      const s = new Sqlite({ debug: true });
      // Make table iteration throw
      Object.defineProperty(s.mockDb, 'cache', {
        get() { throw new Error('iteration fail'); },
        configurable: true
      });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      s.vacuum();
      expect(spy).toHaveBeenCalledWith('[Cache:SqliteMock]', 'vacuum error:', 'iteration fail');
      spy.mockRestore();
    });
  });

  // ---- _isExpiredEntry non-number non-string type ----
  describe('_isExpiredEntry non-standard types', () => {
    it('should return false for object expires value', () => {
      const s = new Sqlite();
      expect(s._isExpiredEntry({ expires: { some: 'obj' } })).toBe(false);
    });

    it('should return false for boolean expires value', () => {
      const s = new Sqlite();
      expect(s._isExpiredEntry({ expires: true })).toBe(false);
    });
  });

  // ---- load error catch ----
  describe('load error catch', () => {
    it('should return false when load throws internally', () => {
      const s = new Sqlite({ debug: true });
      // Make getKey throw to trigger catch block
      jest.spyOn(s, 'getKey').mockImplementation(() => { throw new Error('key fail'); });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      expect(s.load('test')).toBe(false);
      expect(spy).toHaveBeenCalledWith('[Cache:SqliteMock]', 'load error:', 'key fail');
      spy.mockRestore();
    });
  });

  // ---- save error catch ----
  describe('save error catch', () => {
    it('should return false when save throws internally', () => {
      const s = new Sqlite({ debug: true });
      jest.spyOn(s, 'getKey').mockImplementation(() => { throw new Error('save key fail'); });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      expect(s.save({ content: 'x' }, 'test')).toBe(false);
      expect(spy).toHaveBeenCalledWith('[Cache:SqliteMock]', 'save error:', 'save key fail');
      spy.mockRestore();
    });
  });

  // ---- remove error catch ----
  describe('remove error catch', () => {
    it('should return false when remove throws internally', () => {
      const s = new Sqlite({ debug: true });
      jest.spyOn(s, 'getKey').mockImplementation(() => { throw new Error('rm key fail'); });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      expect(s.remove('test')).toBe(false);
      expect(spy).toHaveBeenCalledWith('[Cache:SqliteMock]', 'remove error:', 'rm key fail');
      spy.mockRestore();
    });
  });

  // ---- clean error catch ----
  describe('clean error catch', () => {
    it('should return false when clean throws internally', () => {
      const s = new Sqlite({ debug: true });
      // Make table access throw
      Object.defineProperty(s.mockDb, 'cache', {
        get() { throw new Error('clean fail'); },
        configurable: true
      });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      expect(s.clean('all')).toBe(false);
      expect(spy).toHaveBeenCalledWith('[Cache:SqliteMock]', 'clean error:', 'clean fail');
      spy.mockRestore();
    });
  });

  // ---- getStats error catch ----
  describe('getStats error catch', () => {
    it('should return error object when getStats throws', () => {
      const s = new Sqlite();
      Object.defineProperty(s.mockDb, 'cache', {
        get() { throw new Error('stats fail'); },
        configurable: true
      });
      const stats = s.getStats();
      expect(stats.backend).toBe('SQLite (Mock)');
      expect(stats.error).toBe('stats fail');
    });
  });

  // ---- getStats with expired entries ----
  describe('getStats with entries', () => {
    it('should count expired entries and estimate size', () => {
      const s = new Sqlite();
      s.mockDb.cache.k1 = { content: 'x', expires: Date.now() - 10000, created: Date.now() };
      s.mockDb.cache.k2 = { content: 'y', expires: Date.now() + 60000, created: Date.now() };
      const stats = s.getStats();
      expect(stats.total_entries).toBe(2);
      expect(stats.expired_entries).toBe(1);
      expect(stats.estimated_size_bytes).toBeGreaterThan(0);
    });
  });
});
