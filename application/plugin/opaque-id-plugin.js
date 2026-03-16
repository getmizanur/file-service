// application/plugin/opaque-id-plugin.js
const BasePlugin = require(globalThis.applicationPath('/library/mvc/controller/base-plugin'));
const crypto = require('node:crypto');

/**
 * OpaqueId Plugin
 * Generates unique opaque IDs (e.g., c874nw4g2zzo, w7mz3d1e4kvu)
 *
 * Usage in controller:
 *   const opaqueId = this.plugin('opaqueId').generate();
 *   const opaqueId = this.plugin('opaqueId').generate(12); // Custom length
 *   const opaqueId = this.plugin('opaqueId').generate(16, { prefix: 'article_' });
 */
class OpaqueIdPlugin extends BasePlugin {

  constructor(options = {}) {
    super(options);

    // Default configuration
    this.config = {
      defaultLength: 12, // Default ID length
      charset: 'abcdefghijklmnopqrstuvwxyz0123456789', // Character set (lowercase alphanumeric)
      useTimestamp: true, // Include timestamp component for uniqueness
      ...options
    };
  }

  /**
   * Generate a BBC-style opaque ID
   *
   * @param {number} length - Length of the generated ID (default: 12)
   * @param {Object} options - Generation options
   * @param {string} options.prefix - Optional prefix to prepend to the ID
   * @param {string} options.suffix - Optional suffix to append to the ID
   * @param {boolean} options.includeTimestamp - Whether to include timestamp component (default: true)
   * @returns {string} Generated BBC-style ID
   *
   * @example
   * // Generate default 12-character ID
   * const id = plugin.generate();
   * // Returns: 'c874nw4g2zzo'
   *
   * @example
   * // Generate 16-character ID with prefix
   * const id = plugin.generate(16, { prefix: 'post_' });
   * // Returns: 'post_w7mz3d1e4kvux9t2'
   *
   * @example
   * // Generate purely random ID (no timestamp component)
   * const id = plugin.generate(12, { includeTimestamp: false });
   * // Returns: 'abcd1234efgh'
   */
  generate(length = null, options = {}) {
    const idLength = length || this.config.defaultLength;
    const {
      prefix = '',
        suffix = '',
        includeTimestamp = this.config.useTimestamp
    } = options;

    let id = '';

    if(includeTimestamp) {
      // Generate ID with timestamp component for better uniqueness
      id = this._generateWithTimestamp(idLength);
    } else {
      // Generate purely random ID
      id = this._generateRandom(idLength);
    }

    // Apply prefix and suffix if provided
    return `${prefix}${id}${suffix}`;
  }

  /**
   * Generate multiple unique IDs at once
   *
   * @param {number} count - Number of IDs to generate
   * @param {number} length - Length of each ID (default: 12)
   * @param {Object} options - Generation options (same as generate method)
   * @returns {string[]} Array of generated IDs
   *
   * @example
   * const ids = plugin.generateBatch(5);
   * // Returns: ['c874nw4g2zzo', 'w7mz3d1e4kvu', 'x3qp9m5k7rty', 'b2hj8n6l4vwz', 'p1sd5f3g9hkl']
   */
  generateBatch(count, length = null, options = {}) {
    const ids = [];
    const idSet = new Set(); // Ensure uniqueness within batch

    while(ids.length < count) {
      const id = this.generate(length, options);

      // Ensure ID is unique within this batch
      if(!idSet.has(id)) {
        ids.push(id);
        idSet.add(id);
      }
    }

    return ids;
  }

  /**
   * Validate if a string matches BBC-style ID format
   *
   * @param {string} id - ID to validate
   * @param {Object} options - Validation options
   * @param {number} options.minLength - Minimum length (default: 8)
   * @param {number} options.maxLength - Maximum length (default: 32)
   * @param {boolean} options.allowPrefix - Allow prefixes (default: true)
   * @returns {boolean} True if valid BBC-style ID
   *
   * @example
   * plugin.validate('c874nw4g2zzo'); // Returns: true
   * plugin.validate('abc'); // Returns: false (too short)
   * plugin.validate('ABC123'); // Returns: false (uppercase not allowed)
   */
  validate(id, options = {}) {
    const {
      minLength = 8,
        maxLength = 32,
        allowPrefix = true
    } = options;

    if(!id || typeof id !== 'string') {
      return false;
    }

    // If prefix is allowed, extract the ID part after underscore
    let idToValidate = id;
    if(allowPrefix && id.includes('_')) {
      const parts = id.split('_');
      idToValidate = parts.at(-1); // Take last part as ID
    }

    // Check length
    if(idToValidate.length < minLength || idToValidate.length > maxLength) {
      return false;
    }

    // Check charset (only lowercase alphanumeric)
    const validPattern = /^[a-z0-9]+$/;
    return validPattern.test(idToValidate);
  }

  /**
   * Generate ID with timestamp component for better uniqueness
   * Uses first part as timestamp-based, second part as random
   *
   * @param {number} length - Desired ID length
   * @returns {string} Generated ID
   * @private
   */
  _generateWithTimestamp(length) {
    // Split length: 60% timestamp-based, 40% random
    const timestampPartLength = Math.ceil(length * 0.6);
    const randomPartLength = length - timestampPartLength;

    // Generate timestamp-based part using current time + random
    const timestamp = Date.now().toString(36); // Base36 encoding of timestamp
    const randomSalt = crypto.randomBytes(4).toString('hex');
    const combined = (timestamp + randomSalt).toLowerCase();

    // Hash to get consistent length and ensure lowercase alphanumeric only
    const timestampHash = crypto
      .createHash('shake256', {
        outputLength: Math.ceil(timestampPartLength / 2)
      })
      .update(combined)
      .digest('hex')
      .substring(0, timestampPartLength);

    // Generate random part
    const randomPart = this._generateRandom(randomPartLength);

    // Combine and ensure lowercase alphanumeric
    return this._filterToCharset(timestampHash + randomPart, length);
  }

  /**
   * Generate purely random ID
   *
   * @param {number} length - Desired ID length
   * @returns {string} Generated random ID
   * @private
   */
  _generateRandom(length) {
    // Generate more bytes than needed to account for filtering
    const bytesNeeded = Math.ceil(length * 1.5);
    const randomBytes = crypto.randomBytes(bytesNeeded).toString('hex');

    return this._filterToCharset(randomBytes, length);
  }

  /**
   * Filter string to only include charset characters and limit to desired length
   *
   * @param {string} input - Input string to filter
   * @param {number} length - Desired output length
   * @returns {string} Filtered string
   * @private
   */
  _filterToCharset(input, length) {
    const charset = this.config.charset;
    let result = '';

    for(let i = 0; i < input.length && result.length < length; i++) {
      const char = input[i].toLowerCase();
      if(charset.includes(char)) {
        result += char;
      }
    }

    // If we don't have enough characters, generate more random ones
    while(result.length < length) {
      const randomIndex = crypto.randomInt(0, charset.length);
      result += charset[randomIndex];
    }

    return result.substring(0, length);
  }

  /**
   * Convert an integer to a BBC-style ID
   * Useful for converting database IDs to opaque IDs
   *
   * @param {number} num - Number to convert
   * @param {number} minLength - Minimum length of output (pads with random if needed)
   * @returns {string} BBC-style ID
   *
   * @example
   * plugin.fromNumber(12345); // Returns: '39f5k2m'
   * plugin.fromNumber(12345, 12); // Returns: '39f5k2mxw7tz' (padded to 12 chars)
   */
  fromNumber(num, minLength = 8) {
    if(typeof num !== 'number' || num < 0) {
      throw new Error('fromNumber requires a non-negative number');
    }

    // Convert number to base36 (0-9, a-z)
    let id = num.toString(36).toLowerCase();

    // Pad with random characters if needed
    if(id.length < minLength) {
      const paddingLength = minLength - id.length;
      const padding = this._generateRandom(paddingLength);
      id = id + padding;
    }

    return id;
  }

  /**
   * Generate a short ID (8 characters) - convenience method
   *
   * @param {Object} options - Generation options
   * @returns {string} Short BBC-style ID (8 chars)
   */
  short(options = {}) {
    return this.generate(8, options);
  }

  /**
   * Generate a medium ID (12 characters) - convenience method
   *
   * @param {Object} options - Generation options
   * @returns {string} Medium BBC-style ID (12 chars)
   */
  medium(options = {}) {
    return this.generate(12, options);
  }

  /**
   * Generate a long ID (16 characters) - convenience method
   *
   * @param {Object} options - Generation options
   * @returns {string} Long BBC-style ID (16 chars)
   */
  long(options = {}) {
    return this.generate(16, options);
  }
}

module.exports = OpaqueIdPlugin;