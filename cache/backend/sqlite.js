// library/cache/backend/sqlite.js
const fs = require('fs');
const path = require('path');

/**
 * SQLite backend for cache system (MOCK)
 * Stores cache data in a JSON file to simulate SQLite.
 *
 * In production, replace with sqlite3/better-sqlite3 and keep the same API.
 */
class Sqlite {
  constructor(options = {}) {
    this.options = {
      cache_db_complete_path: options.cache_db_complete_path || '/tmp/cache.db',
      automatic_vacuum_factor: options.automatic_vacuum_factor || 10,
      table_name: options.table_name || 'cache',
      key_prefix: options.key_prefix || '',
      debug: !!options.debug,
      ...options
    };

    // Mock database path (JSON)
    this.dbPath = this.options.cache_db_complete_path.replace(/\.db$/i, '') + '.json';
    this.connected = false;

    this.initDatabase();
  }

  _log(...args) {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.debug('[Cache:SqliteMock]', ...args);
    }
  }

  /**
   * Initialize mock database
   */
  initDatabase() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        this.mockDb = JSON.parse(data);
      } else {
        this.mockDb = {
          [this.options.table_name]: {}, // table
          metadata: {
            created: Date.now(),
            version: '1.0'
          }
        };
        this._saveMockDbAtomic();
      }

      // Ensure table exists
      if (!this.mockDb[this.options.table_name] || typeof this.mockDb[this.options.table_name] !== 'object') {
        this.mockDb[this.options.table_name] = {};
      }

      this.connected = true;

      // Keep the warning but only in debug mode
      this._log('Using MOCK SQLite backend. Install sqlite3/better-sqlite3 for production.');
    } catch (error) {
      this.connected = false;
      this._log('SQLite initialization error:', error.message);
    }
  }

  /**
   * Atomic write to prevent DB corruption
   */
  _saveMockDbAtomic() {
    const tmpPath = `${this.dbPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.mockDb, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.dbPath);
  }

  saveMockDb() {
    try {
      this._saveMockDbAtomic();
    } catch (error) {
      this._log('Mock database save error:', error.message);
    }
  }

  /**
   * Execute vacuum probabilistically (cleanup expired entries)
   */
  maybeVacuum() {
    const factor = Number(this.options.automatic_vacuum_factor) || 0;
    if (factor <= 0) return;

    if (Math.random() < (1 / factor)) {
      this.vacuum();
    }
  }

  /**
   * Vacuum database (remove expired entries)
   */
  vacuum() {
    if (!this.connected) return;

    try {
      const table = this.mockDb[this.options.table_name];
      const now = Date.now();

      let removed = 0;
      for (const [key, entry] of Object.entries(table)) {
        if (this._isExpiredEntry(entry, now)) {
          delete table[key];
          removed++;
        }
      }

      if (removed > 0) {
        this.saveMockDb();
        this._log(`vacuum: removed ${removed} expired entries`);
      }
    } catch (error) {
      this._log('vacuum error:', error.message);
    }
  }

  /**
   * Generate key with prefix
   */
  getKey(id) {
    const prefix = this.options.key_prefix || '';
    return prefix + String(id);
  }

  /**
   * Expiry check supports:
   * - entry.expires (ms epoch) or entry.expires_at
   * - string ISO date in expires/expires_at
   */
  _isExpiredEntry(entry, now = Date.now()) {
    if (!entry || typeof entry !== 'object') return false;

    const raw = entry.expires ?? entry.expires_at ?? 0;
    if (!raw) return false;

    if (typeof raw === 'number') {
      return raw > 0 && now > raw;
    }

    if (typeof raw === 'string') {
      const parsed = Date.parse(raw);
      return !Number.isNaN(parsed) && now > parsed;
    }

    return false;
  }

  /**
   * Load data from mock SQLite
   * @returns {object|false}
   */
  load(id) {
    try {
      if (!this.connected) return false;

      this.maybeVacuum();

      const table = this.mockDb[this.options.table_name];
      const key = this.getKey(id);
      const entry = table[key];

      if (!entry) return false;

      // Expiration check
      if (this._isExpiredEntry(entry)) {
        delete table[key];
        this.saveMockDb();
        return false;
      }

      // Return a consistent object (keep legacy fields, but preserve full entry too)
      return {
        ...entry
      };
    } catch (error) {
      this._log('load error:', error.message);
      return false;
    }
  }

  /**
   * Save data to mock SQLite
   * @param {object} data
   * @param {string} id
   * @returns {boolean}
   */
  save(data, id) {
    try {
      if (!this.connected) return false;

      const table = this.mockDb[this.options.table_name];
      const key = this.getKey(id);

      // Preserve arbitrary payload, but enforce created/expires defaults
      const created = (data && typeof data.created === 'number') ? data.created : Date.now();
      const expires = (data && (data.expires ?? data.expires_at)) ? (data.expires ?? data.expires_at) : 0;

      table[key] = {
        ...data,
        created,
        expires
      };

      this.saveMockDb();
      this.maybeVacuum();

      return true;
    } catch (error) {
      this._log('save error:', error.message);
      return false;
    }
  }

  /**
   * Remove entry
   * @returns {boolean}
   */
  remove(id) {
    try {
      if (!this.connected) return false;

      const table = this.mockDb[this.options.table_name];
      const key = this.getKey(id);

      const existed = Object.prototype.hasOwnProperty.call(table, key);
      if (existed) {
        delete table[key];
        this.saveMockDb();
      }

      return existed;
    } catch (error) {
      this._log('remove error:', error.message);
      return false;
    }
  }

  /**
   * Clean cache
   * mode: 'all' | 'old' | 'matchingTag' | 'notMatchingTag'
   */
  clean(mode = 'all', tags = []) {
    try {
      if (!this.connected) return false;

      const table = this.mockDb[this.options.table_name];

      if (mode === 'all') {
        this.mockDb[this.options.table_name] = {};
        this.saveMockDb();
        return true;
      }

      if (mode === 'old') {
        // remove expired
        const now = Date.now();
        let removed = 0;
        for (const [key, entry] of Object.entries(table)) {
          if (this._isExpiredEntry(entry, now)) {
            delete table[key];
            removed++;
          }
        }
        if (removed > 0) this.saveMockDb();
        return true;
      }

      // Tag-based cleaning not implemented for mock (keep behavior)
      if (mode === 'matchingTag' || mode === 'notMatchingTag') {
        this._log('Tag-based cleaning not implemented in SQLite mock', tags);
        return false;
      }

      return false;
    } catch (error) {
      this._log('clean error:', error.message);
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    try {
      if (!this.connected) {
        return {
          backend: 'SQLite (Mock)',
          connected: false,
          error: 'Not connected'
        };
      }

      const table = this.mockDb[this.options.table_name];
      const now = Date.now();

      const keys = Object.keys(table);
      let expired = 0;
      let estimatedSize = 0;

      for (const entry of Object.values(table)) {
        if (this._isExpiredEntry(entry, now)) expired++;
        try {
          estimatedSize += Buffer.byteLength(JSON.stringify(entry), 'utf8');
        } catch (_) {}
      }

      return {
        backend: 'SQLite (Mock)',
        connected: true,
        database_path: this.dbPath,
        table_name: this.options.table_name,
        total_entries: keys.length,
        expired_entries: expired,
        estimated_size_bytes: estimatedSize
      };
    } catch (error) {
      return {
        backend: 'SQLite (Mock)',
        error: error.message
      };
    }
  }

  /**
   * Close "connection"
   */
  close() {
    this.connected = false;
  }
}

module.exports = Sqlite;