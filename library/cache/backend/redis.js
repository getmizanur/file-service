// library/cache/backend/redis.js
const { createClient } = require('redis');

/**
 * Redis backend for cache system
 * All methods are async — requires the Cache class to await them.
 */
class Redis {
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 6379,
      password: options.password || null,
      database: options.database || 0,
      key_prefix: options.key_prefix || 'cache:',
      debug: !!options.debug,
      ...options
    };

    this.client = null;
    this._connecting = null;
    this.isAsync = true;
  }

  _log(...args) {
    if (this.options.debug) {
      console.debug('[Cache:Redis]', ...args);
    }
  }

  /**
   * Get or create Redis connection (lazy, shared)
   */
  async _getClient() {
    if (this.client && this.client.isOpen) return this.client;

    if (this._connecting) return this._connecting;

    this._connecting = (async () => {
      const url = this.options.password
        ? `redis://:${this.options.password}@${this.options.host}:${this.options.port}`
        : `redis://${this.options.host}:${this.options.port}`;

      this.client = createClient({
        url,
        database: this.options.database
      });

      this.client.on('error', (err) => this._log('Connection error:', err.message));

      await this.client.connect();
      this._connecting = null;
      return this.client;
    })();

    return this._connecting;
  }

  _key(id) {
    return `${this.options.key_prefix}${id}`;
  }

  /**
   * Load data from Redis
   * @param {string} id
   * @returns {Promise<object|false>}
   */
  async load(id) {
    try {
      const client = await this._getClient();
      const raw = await client.get(this._key(id));
      if (raw === null) return false;

      const data = JSON.parse(raw);

      if (this._isExpired(data)) {
        await this.remove(id);
        return false;
      }

      return data;
    } catch (error) {
      this._log('Load error:', error.message);
      return false;
    }
  }

  /**
   * Save data to Redis
   * @param {object} data - { content, created, expires }
   * @param {string} id
   * @param {array} tags - unused
   * @param {number} ttl - seconds
   * @returns {Promise<boolean>}
   */
  async save(data, id, tags = [], ttl = 0) {
    try {
      const client = await this._getClient();
      const payload = JSON.stringify(data);

      if (ttl > 0) {
        await client.setEx(this._key(id), ttl, payload);
      } else {
        await client.set(this._key(id), payload);
      }

      return true;
    } catch (error) {
      this._log('Save error:', error.message);
      return false;
    }
  }

  /**
   * Remove cache entry
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    try {
      const client = await this._getClient();
      await client.del(this._key(id));
      return true;
    } catch (error) {
      this._log('Remove error:', error.message);
      return false;
    }
  }

  /**
   * Clean cache
   * @param {string} mode - 'all' or 'old'
   * @returns {Promise<boolean>}
   */
  async clean(mode = 'all') {
    try {
      if (mode !== 'all') return false;

      const client = await this._getClient();
      const pattern = `${this.options.key_prefix}*`;

      let cursor = 0;
      do {
        const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        if (result.keys.length > 0) {
          await client.del(result.keys);
        }
      } while (cursor !== 0);

      return true;
    } catch (error) {
      this._log('Clean error:', error.message);
      return false;
    }
  }

  _isExpired(data) {
    if (!data || typeof data !== 'object') return false;
    const raw = data.expires ?? data.expires_at ?? 0;
    if (!raw) return false;

    if (typeof raw === 'number') {
      return raw > 0 && Date.now() > raw;
    }
    if (typeof raw === 'string') {
      const parsed = Date.parse(raw);
      return !Number.isNaN(parsed) && Date.now() > parsed;
    }
    return false;
  }
}

module.exports = Redis;
