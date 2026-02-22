const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * File backend for cache system
 * Stores cache data as files in the filesystem
 */
class File {
  constructor(options = {}) {
    this.options = {
      cache_dir: options.cache_dir || '/tmp/cache',
      file_locking: options.file_locking !== false, // Default true
      read_control: options.read_control !== false, // Default true
      file_name_prefix: options.file_name_prefix || 'app_cache',
      cache_file_umask: options.cache_file_umask ?? 0o644,
      hashed_directory_level: options.hashed_directory_level || 0,
      hashed_directory_umask: options.hashed_directory_umask ?? 0o755,
      debug: !!options.debug,
      ...options
    };

    // Ensure cache directory exists
    this.ensureCacheDirectory();
  }

  _log(...args) {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.debug('[Cache:File]', ...args);
    }
  }

  /**
   * Ensure cache directory exists
   */
  ensureCacheDirectory() {
    try {
      if (!fs.existsSync(this.options.cache_dir)) {
        fs.mkdirSync(this.options.cache_dir, {
          recursive: true,
          mode: this.options.hashed_directory_umask
        });
      }
    } catch (error) {
      throw new Error(`Cannot create cache directory: ${error.message}`);
    }
  }

  /**
   * Generate file path for cache ID
   * @param {string} id - Cache identifier
   * @returns {string} - Full file path
   */
  getFilePath(id) {
    const filename = `${this.options.file_name_prefix}---${this.sanitizeId(id)}`;

    if (this.options.hashed_directory_level > 0) {
      // Create hashed subdirectories for better performance
      const hash = this.hashId(id);
      let subPath = '';

      for (let i = 0; i < this.options.hashed_directory_level; i++) {
        const char = hash.charAt(i) || '0';
        subPath = path.join(subPath, char);
      }

      const dirPath = path.join(this.options.cache_dir, subPath);

      // Ensure subdirectory exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
          recursive: true,
          mode: this.options.hashed_directory_umask
        });
      }

      return path.join(dirPath, filename);
    }

    return path.join(this.options.cache_dir, filename);
  }

  /**
   * Sanitize cache ID for filename
   * @param {string} id - Cache identifier
   * @returns {string} - Sanitized ID
   */
  sanitizeId(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Hash cache ID for directory structure (stable, low collision)
   * @param {string} id - Cache identifier
   * @returns {string} - Hashed ID (hex)
   */
  hashId(id) {
    return crypto.createHash('sha1').update(String(id)).digest('hex');
  }

  /**
   * Load data from cache file
   * @param {string} id - Cache identifier
   * @returns {object|false} - Cache data or false if not found/invalid/expired
   */
  load(id) {
    try {
      const filePath = this.getFilePath(id);

      if (!fs.existsSync(filePath)) {
        return false;
      }

      const fileData = fs.readFileSync(filePath, 'utf8');

      if (this.options.read_control) {
        const lines = fileData.split('\n');
        if (lines.length < 2) {
          return false;
        }

        const controlLine = lines[0];
        const payload = lines.slice(1).join('\n');

        // Verify control line matches payload checksum
        const expected = this.generateControlDataFromPayload(payload);
        if (controlLine !== expected) {
          this._log('Control data mismatch. Removing cache file:', filePath);
          this.remove(id);
          return false;
        }

        const data = JSON.parse(payload);

        // Expiry check (optional)
        if (this._isExpired(data)) {
          this.remove(id);
          return false;
        }

        return data;
      }

      const data = JSON.parse(fileData);

      if (this._isExpired(data)) {
        this.remove(id);
        return false;
      }

      return data;
    } catch (error) {
      this._log('File cache load error:', error.message);
      return false;
    }
  }

  /**
   * Save data to cache file
   * @param {object} data - Cache data to save
   * @param {string} id - Cache identifier
   * @returns {boolean} - Success status
   */
  save(data, id) {
    try {
      const filePath = this.getFilePath(id);

      // Always serialize once to keep checksum stable
      const payload = JSON.stringify(data);

      let fileContent;
      if (this.options.read_control) {
        const controlData = this.generateControlDataFromPayload(payload);
        fileContent = controlData + '\n' + payload;
      } else {
        fileContent = payload;
      }

      // Write atomically
      if (this.options.file_locking) {
        const tmpName = `${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random()
          .toString(16)
          .slice(2)}.tmp`;
        const tempPath = path.join(path.dirname(filePath), tmpName);

        fs.writeFileSync(tempPath, fileContent, { mode: this.options.cache_file_umask });
        fs.renameSync(tempPath, filePath);
      } else {
        fs.writeFileSync(filePath, fileContent, { mode: this.options.cache_file_umask });
      }

      return true;
    } catch (error) {
      this._log('File cache save error:', error.message);
      return false;
    }
  }

  /**
   * Remove cache file
   * @param {string} id - Cache identifier
   * @returns {boolean} - Success status
   */
  remove(id) {
    try {
      const filePath = this.getFilePath(id);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return true;
    } catch (error) {
      this._log('File cache remove error:', error.message);
      return false;
    }
  }

  /**
   * Clean cache files
   * @param {string} mode - Cleaning mode: 'all', 'old'
   * @param {array} tags - Tags (not implemented in file backend)
   * @returns {boolean} - Success status
   */
  clean(mode = 'all', tags = []) {
    try {
      if (mode === 'all') {
        return this.cleanAll();
      }
      if (mode === 'old') {
        return this.cleanExpired();
      }

      // Tag-based cleaning not implemented for file backend
      this._log('Tag-based cleaning not supported in File backend', tags);
      return false;
    } catch (error) {
      this._log('File cache clean error:', error.message);
      return false;
    }
  }

  /**
   * Clean all cache files
   * @returns {boolean} - Success status
   */
  cleanAll() {
    try {
      this.removeDirectoryContents(this.options.cache_dir);
      return true;
    } catch (error) {
      this._log('Clean all error:', error.message);
      return false;
    }
  }

  /**
   * Clean expired cache files
   * @returns {boolean} - Success status
   */
  cleanExpired() {
    try {
      this.cleanExpiredInDirectory(this.options.cache_dir);
      return true;
    } catch (error) {
      this._log('Clean expired error:', error.message);
      return false;
    }
  }

  /**
   * Recursively remove directory contents
   * @param {string} dirPath - Directory path
   */
  removeDirectoryContents(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.removeDirectoryContents(filePath);
        // Remove empty directory after cleaning it
        try { fs.rmdirSync(filePath); } catch (_) {}
      } else if (file.startsWith(this.options.file_name_prefix)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
  }

  /**
   * Recursively clean expired files in directory
   * @param {string} dirPath - Directory path
   */
  cleanExpiredInDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.cleanExpiredInDirectory(filePath);
        continue;
      }

      if (!file.startsWith(this.options.file_name_prefix)) continue;

      try {
        const data = this.loadFile(filePath);
        if (!data) {
          // unreadable file -> remove
          try { fs.unlinkSync(filePath); } catch (_) {}
          continue;
        }

        if (this._isExpired(data)) {
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      } catch (_) {
        // If we can't read the file, remove it
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
  }

  /**
   * Load file directly (helper for cleaning)
   * @param {string} filePath - File path
   * @returns {object|null} - Parsed data or null
   */
  loadFile(filePath) {
    try {
      const fileData = fs.readFileSync(filePath, 'utf8');

      if (this.options.read_control) {
        const lines = fileData.split('\n');
        if (lines.length < 2) return null;
        return JSON.parse(lines.slice(1).join('\n'));
      }
      return JSON.parse(fileData);
    } catch (_) {
      return null;
    }
  }

  /**
   * Expiry check:
   * supports:
   * - data.expires (ms epoch OR ISO string)
   * - data.expires_at (ms epoch OR ISO string)
   */
  _isExpired(data) {
    if (!data || typeof data !== 'object') return false;

    const raw = data.expires ?? data.expires_at ?? null;
    if (!raw) return false;

    let expiresMs = null;

    if (typeof raw === 'number') {
      expiresMs = raw;
    } else if (typeof raw === 'string') {
      const parsed = Date.parse(raw);
      if (!Number.isNaN(parsed)) expiresMs = parsed;
    }

    if (!expiresMs) return false;
    return Date.now() > expiresMs;
  }

  /**
   * Generate control data for read control, derived from payload.
   * Stable between save/load.
   * @param {string} payload
   * @returns {string}
   */
  generateControlDataFromPayload(payload) {
    const sum = crypto.createHash('sha256').update(payload).digest('hex');
    // prefix helps distinguish future format versions
    return `control_sha256_${sum}`;
  }

  /**
   * Backward compatible method name (kept for callers).
   * Uses stable payload checksum now.
   */
  generateControlData(data) {
    const payload = JSON.stringify(data);
    return this.generateControlDataFromPayload(payload);
  }

  /**
   * Get cache statistics
   * @returns {object} - Statistics
   */
  getStats() {
    try {
      const stats = {
        backend: 'File',
        cache_dir: this.options.cache_dir,
        total_files: 0,
        total_size: 0,
        expired_files: 0
      };

      this.collectStats(this.options.cache_dir, stats);
      return stats;
    } catch (error) {
      return { backend: 'File', error: error.message };
    }
  }

  /**
   * Collect statistics recursively
   * @param {string} dirPath - Directory path
   * @param {object} stats - Statistics object
   */
  collectStats(dirPath, stats) {
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.collectStats(filePath, stats);
        continue;
      }

      if (!file.startsWith(this.options.file_name_prefix)) continue;

      stats.total_files++;
      stats.total_size += stat.size;

      // Check if expired
      try {
        const data = this.loadFile(filePath);
        if (!data || this._isExpired(data)) {
          stats.expired_files++;
        }
      } catch (_) {
        stats.expired_files++;
      }
    }
  }
}

module.exports = File;