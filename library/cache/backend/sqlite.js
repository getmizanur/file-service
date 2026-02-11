const fs = require('fs');
const path = require('path');

/**
 * SQLite backend for cache system
 * Stores cache data in SQLite database
 * 
 * Note: This is a mock implementation using JSON files to simulate SQLite
 * In production, you would use 'sqlite3' or 'better-sqlite3' packages
 */
class Sqlite {
  constructor(options = {}) {
    this.options = {
      cache_db_complete_path: options.cache_db_complete_path || '/tmp/cache.db',
      automatic_vacuum_factor: options.automatic_vacuum_factor || 10,
      table_name: options.table_name || 'cache',
      key_prefix: options.key_prefix || '',
      ...options
    };

    // Mock database using JSON file (in production, use real SQLite)
    this.dbPath = this.options.cache_db_complete_path.replace('.db', '.json');
    this.connected = false;

    // Initialize database
    this.initDatabase();
  }

  /**
   * Initialize SQLite database (mock version using JSON)
   * In production, use real SQLite:
   * const Database = require('better-sqlite3');
   * this.db = new Database(this.options.cache_db_complete_path);
   */
  initDatabase() {
    try {
      console.warn('Using MOCK SQLite backend - install sqlite3/better-sqlite3 for production');

      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
          recursive: true
        });
      }

      // Load or create mock database
      if(fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        this.mockDb = JSON.parse(data);
      } else {
        this.mockDb = {
          cache: {}, // Table: cache
          metadata: {
            created: Date.now(),
            version: '1.0'
          }
        };
        this.saveMockDb();
      }

      this.connected = true;

      // In production, create real SQLite table:
      /*
      this.db.exec(`
          CREATE TABLE IF NOT EXISTS ${this.options.table_name} (
              id TEXT PRIMARY KEY,
              content TEXT,
              created INTEGER,
              expires INTEGER,
              tags TEXT
          )
      `);
      
      // Create indexes for better performance
      this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_expires ON ${this.options.table_name} (expires);
          CREATE INDEX IF NOT EXISTS idx_created ON ${this.options.table_name} (created);
      `);
      */

    } catch (error) {
      console.error('SQLite initialization error:', error);
      this.connected = false;
    }
  }

  /**
   * Save mock database to file
   */
  saveMockDb() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.mockDb, null, 2));
    } catch (error) {
      console.error('Mock database save error:', error);
    }
  }

  /**
   * Execute vacuum if needed (cleanup expired entries)
   */
  maybeVacuum() {
    // Simple vacuum logic - remove expired entries periodically
    if(Math.random() < (1 / this.options.automatic_vacuum_factor)) {
      this.vacuum();
    }
  }

  /**
   * Vacuum database (remove expired entries)
   */
  vacuum() {
    try {
      const now = Date.now();
      let removed = 0;

      for(const [key, entry] of Object.entries(this.mockDb.cache)) {
        if(entry.expires && now > entry.expires) {
          delete this.mockDb.cache[key];
          removed++;
        }
      }

      if(removed > 0) {
        this.saveMockDb();
        console.log(`SQLite vacuum: removed ${removed} expired entries`);
      }

      /* In production with real SQLite:
      this.db.exec('VACUUM');
      const stmt = this.db.prepare(`DELETE FROM ${this.options.table_name} WHERE expires > 0 AND expires < ?`);
      const result = stmt.run(Date.now());
      */

    } catch (error) {
      console.error('SQLite vacuum error:', error);
    }
  }

  /**
   * Generate SQLite key with prefix
   * @param {string} id - Cache identifier
   * @returns {string} - Prefixed key
   */
  getKey(id) {
    const prefix = this.options.key_prefix || '';
    return prefix + id;
  }

  /**
   * Load data from SQLite
   * @param {string} id - Cache identifier
   * @returns {object|false} - Cache data or false if not found
   */
  load(id) {
    try {
      if(!this.connected) {
        return false;
      }

      this.maybeVacuum();

      // Mock implementation
      const key = this.getKey(id);
      const entry = this.mockDb.cache[key];

      if(!entry) {
        return false;
      }

      // Check expiration
      if(entry.expires && Date.now() > entry.expires) {
        delete this.mockDb.cache[key];
        this.saveMockDb();
        return false;
      }

      return {
        content: entry.content,
        created: entry.created,
        expires: entry.expires
      };

      /* In production with real SQLite:
      const stmt = this.db.prepare(`
          SELECT content, created, expires 
          FROM ${this.options.table_name} 
          WHERE id = ?
      `);
      
      const row = stmt.get(id);
      
      if (!row) {
          return false;
      }
      
      // Check expiration
      if (row.expires && Date.now() > row.expires) {
          this.remove(id);
          return false;
      }
      
      return {
          content: row.content,
          created: row.created,
          expires: row.expires
      };
      */

    } catch (error) {
      console.error('SQLite load error:', error);
      return false;
    }
  }

  /**
   * Save data to SQLite
   * @param {object} data - Cache data to save
   * @param {string} id - Cache identifier
   * @returns {boolean} - Success status
   */
  save(data, id) {
    try {
      if(!this.connected) {
        return false;
      }

      // Mock implementation
      const key = this.getKey(id);
      this.mockDb.cache[key] = {
        content: data.content,
        created: data.created || Date.now(),
        expires: data.expires || 0,
        tags: '' // Tags not implemented in mock
      };

      this.saveMockDb();
      this.maybeVacuum();

      return true;

      /* In production with real SQLite:
      const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO ${this.options.table_name} 
          (id, content, created, expires, tags) 
          VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
          id, 
          data.content, 
          data.created || Date.now(), 
          data.expires || 0,
          '' // Tags would be JSON.stringify(tags)
      );
      
      return result.changes > 0;
      */

    } catch (error) {
      console.error('SQLite save error:', error);
      return false;
    }
  }

  /**
   * Remove data from SQLite
   * @param {string} id - Cache identifier
   * @returns {boolean} - Success status
   */
  remove(id) {
    try {
      if(!this.connected) {
        return false;
      }

      // Mock implementation
      const key = this.getKey(id);
      const existed = this.mockDb.cache[key] !== undefined;
      delete this.mockDb.cache[key];

      if(existed) {
        this.saveMockDb();
      }

      return existed;

      /* In production with real SQLite:
      const stmt = this.db.prepare(`DELETE FROM ${this.options.table_name} WHERE id = ?`);
      const result = stmt.run(id);
      return result.changes > 0;
      */

    } catch (error) {
      console.error('SQLite remove error:', error);
      return false;
    }
  }

  /**
   * Clean SQLite cache
   * @param {string} mode - Cleaning mode: 'all', 'old', 'matchingTag', 'notMatchingTag'
   * @param {array} tags - Tags for tag-based cleaning
   * @returns {boolean} - Success status
   */
  clean(mode = 'all', tags = []) {
    try {
      if(!this.connected) {
        return false;
      }

      if(mode === 'all') {
        // Clear all cache
        this.mockDb.cache = {};
        this.saveMockDb();
        return true;

        /* In production:
        const stmt = this.db.prepare(`DELETE FROM ${this.options.table_name}`);
        stmt.run();
        return true;
        */

      } else if(mode === 'old') {
        // Remove expired entries
        const now = Date.now();
        let removed = 0;

        for(const [id, entry] of Object.entries(this.mockDb.cache)) {
          if(entry.expires && now > entry.expires) {
            delete this.mockDb.cache[id];
            removed++;
          }
        }

        if(removed > 0) {
          this.saveMockDb();
        }

        return true;

        /* In production:
        const stmt = this.db.prepare(`
            DELETE FROM ${this.options.table_name} 
            WHERE expires > 0 AND expires < ?
        `);
        stmt.run(Date.now());
        return true;
        */

      } else if(mode === 'matchingTag' || mode === 'notMatchingTag') {
        // Tag-based cleaning not implemented in mock
        console.warn('Tag-based cleaning not implemented in SQLite mock');
        return false;

        /* In production, implement tag-based cleaning:
        const operator = mode === 'matchingTag' ? 'IN' : 'NOT IN';
        const placeholders = tags.map(() => '?').join(',');
        const stmt = this.db.prepare(`
            DELETE FROM ${this.options.table_name} 
            WHERE tags ${operator} (${placeholders})
        `);
        stmt.run(...tags);
        return true;
        */
      }

      return false;
    } catch (error) {
      console.error('SQLite clean error:', error);
      return false;
    }
  }

  /**
   * Get SQLite cache statistics
   * @returns {object} - Statistics
   */
  getStats() {
    try {
      if(!this.connected) {
        return {
          backend: 'SQLite',
          connected: false,
          error: 'Not connected'
        };
      }

      // Mock implementation
      const totalEntries = Object.keys(this.mockDb.cache).length;
      let expiredEntries = 0;
      let totalSize = 0;
      const now = Date.now();

      for(const entry of Object.values(this.mockDb.cache)) {
        if(entry.expires && now > entry.expires) {
          expiredEntries++;
        }
        totalSize += JSON.stringify(entry).length;
      }

      return {
        backend: 'SQLite (Mock)',
        connected: true,
        database_path: this.dbPath,
        table_name: this.options.table_name,
        total_entries: totalEntries,
        expired_entries: expiredEntries,
        estimated_size: totalSize
      };

      /* In production with real SQLite:
      const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.options.table_name}`);
      const expiredStmt = this.db.prepare(`
          SELECT COUNT(*) as count 
          FROM ${this.options.table_name} 
          WHERE expires > 0 AND expires < ?
      `);
      
      const total = totalStmt.get().count;
      const expired = expiredStmt.get(Date.now()).count;
      
      return {
          backend: 'SQLite',
          connected: true,
          database_path: this.options.cache_db_complete_path,
          table_name: this.options.table_name,
          total_entries: total,
          expired_entries: expired
      };
      */

    } catch (error) {
      return {
        backend: 'SQLite',
        error: error.message
      };
    }
  }

  /**
   * Close SQLite connection
   */
  close() {
    try {
      if(this.connected) {
        // In production: this.db.close();
        this.connected = false;
      }
    } catch (error) {
      console.error('SQLite close error:', error);
    }
  }
}

module.exports = Sqlite;