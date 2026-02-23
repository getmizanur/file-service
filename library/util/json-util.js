// library/util/json-util.js
/**
 * JSON Utility Class
 * Provides PHP-inspired JSON manipulation and validation utilities
 * for JavaScript/Node.js applications
 */
class JsonUtil {

  // ==================== JSON Encoding/Decoding ====================

  /**
   * Encode value to JSON string
   * Similar to PHP's json_encode()
   * @param {*} value - Value to encode
   * @param {Object} options - Encoding options
   * @param {boolean} options.pretty - Pretty print output (default: false)
   * @param {number} options.space - Number of spaces for indentation (default: 2)
   * @param {boolean} options.escapeUnicode - Escape unicode characters (default: false)
   * @returns {string|null} - JSON string or null on error
   */
  static encode(value, options = {}) {
    try {
      const {
        pretty = false, space = 2, escapeUnicode = false
      } = options;

      let json = pretty ?
        JSON.stringify(value, null, space) :
        JSON.stringify(value);

      // Escape unicode if requested
      if(escapeUnicode && json) {
        json = json.replace(/[\u007F-\uFFFF]/g, (char) => {
          return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
        });
      }

      return json;
    } catch (error) {
      console.error('JSON encode error:', error.message);
      return null;
    }
  }

  /**
   * Decode JSON string to value
   * Similar to PHP's json_decode()
   * @param {string} json - JSON string to decode
   * @param {boolean} assoc - Return as plain object instead of class instances (default: true)
   * @returns {*|null} - Decoded value or null on error
   */
  static decode(json, assoc = true) {
    try {
      if(typeof json !== 'string') {
        return null;
      }
      return JSON.parse(json);
    } catch (error) {
      console.error('JSON decode error:', error.message);
      return null;
    }
  }

  /**
   * Get last JSON error message
   * Similar to PHP's json_last_error_msg()
   * @returns {string} - Error message or 'No error'
   */
  static lastErrorMsg() {
    // JavaScript doesn't persist JSON errors, so this is a placeholder
    return 'No error';
  }

  // ==================== JSON Validation ====================

  /**
   * Check if string is valid JSON
   * @param {string} str - String to validate
   * @returns {boolean}
   */
  static isValid(str) {
    if(typeof str !== 'string') {
      return false;
    }
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Validate and decode JSON with error details
   * @param {string} json - JSON string to validate
   * @returns {Object} - { valid: boolean, data: *, error: string|null }
   */
  static validate(json) {
    if(typeof json !== 'string') {
      return {
        valid: false,
        data: null,
        error: 'Input must be a string'
      };
    }

    try {
      const data = JSON.parse(json);
      return {
        valid: true,
        data: data,
        error: null
      };
    } catch (error) {
      return {
        valid: false,
        data: null,
        error: error.message
      };
    }
  }

  // ==================== Object/Array Manipulation ====================

  /**
   * Deep merge objects (recursive merge)
   * Example: merge({ a: 1, b: { x: 10 } }, { b: { y: 20 }, c: 3 })
   *          => { a: 1, b: { x: 10, y: 20 }, c: 3 }
   * @param {Object} target - Target object
   * @param {...Object} sources - Source objects to merge
   * @returns {Object} - Merged object
   */
  static merge(target, ...sources) {
    if(!target || typeof target !== 'object') {
      target = {};
    }

    for(const source of sources) {
      if(!source || typeof source !== 'object') {
        continue;
      }

      for(const key in source) {
        if(!Object.prototype.hasOwnProperty.call(source, key)) {
          continue;
        }

        const sourceValue = source[key];
        const targetValue = target[key];

        // Handle arrays specially - replace instead of merge
        if(Array.isArray(sourceValue)) {
          target[key] = [...sourceValue];
        }
        // Deep merge objects
        else if(sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          if(!targetValue || typeof targetValue !== 'object' || Array.isArray(targetValue)) {
            target[key] = {};
          }
          target[key] = this.merge(target[key], sourceValue);
        }
        // Copy primitives
        else {
          target[key] = sourceValue;
        }
      }
    }

    return target;
  }

  /**
   * Deep clone an object/array
   * @param {*} value - Value to clone
   * @returns {*} - Cloned value
   */
  static clone(value) {
    if(value === null || typeof value !== 'object') {
      return value;
    }

    // Handle Date objects
    if(value instanceof Date) {
      return new Date(value.getTime());
    }

    // Handle RegExp objects
    if(value instanceof RegExp) {
      return new RegExp(value.source, value.flags);
    }

    // Handle Arrays
    if(Array.isArray(value)) {
      return value.map(item => this.clone(item));
    }

    // Handle plain objects
    const cloned = {};
    for(const key in value) {
      if(Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = this.clone(value[key]);
      }
    }

    return cloned;
  }

  /**
   * Get value from nested object using dot notation path
   * Example: get({ a: { b: { c: 42 } } }, 'a.b.c') => 42
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path (e.g., 'user.address.city')
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} - Found value or default
   */
  static get(obj, path, defaultValue = undefined) {
    if(!obj || typeof obj !== 'object') {
      return defaultValue;
    }

    const keys = path.split('.');
    let current = obj;

    for(const key of keys) {
      if(current === null || typeof current !== 'object' || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Set value in nested object using dot notation path
   * Example: set({}, 'a.b.c', 42) => { a: { b: { c: 42 } } }
   * @param {Object} obj - Object to modify
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   * @returns {Object} - Modified object
   */
  static set(obj, path, value) {
    if(!obj || typeof obj !== 'object') {
      obj = {};
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for(const key of keys) {
      if(!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
    return obj;
  }

  /**
   * Check if path exists in object
   * @param {Object} obj - Object to check
   * @param {string} path - Dot notation path
   * @returns {boolean}
   */
  static has(obj, path) {
    if(!obj || typeof obj !== 'object') {
      return false;
    }

    const keys = path.split('.');
    let current = obj;

    for(const key of keys) {
      if(current === null || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return true;
  }

  /**
   * Delete value at path in object
   * @param {Object} obj - Object to modify
   * @param {string} path - Dot notation path
   * @returns {boolean} - True if deleted, false otherwise
   */
  static unset(obj, path) {
    if(!obj || typeof obj !== 'object') {
      return false;
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for(const key of keys) {
      if(current === null || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    if(lastKey in current) {
      delete current[lastKey];
      return true;
    }

    return false;
  }

  // ==================== Array/Object Utilities ====================

  /**
   * Flatten nested object to single level with dot notation keys
   * Example: flatten({ a: { b: { c: 1 } } }) => { 'a.b.c': 1 }
   * @param {Object} obj - Object to flatten
   * @param {string} prefix - Key prefix (used internally for recursion)
   * @returns {Object} - Flattened object
   */
  static flatten(obj, prefix = '') {
    const result = {};

    for(const key in obj) {
      if(!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if(value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flatten(value, fullKey));
      } else {
        result[fullKey] = value;
      }
    }

    return result;
  }

  /**
   * Unflatten object with dot notation keys to nested object
   * Example: unflatten({ 'a.b.c': 1 }) => { a: { b: { c: 1 } } }
   * @param {Object} obj - Flattened object
   * @returns {Object} - Nested object
   */
  static unflatten(obj) {
    const result = {};

    for(const key in obj) {
      if(!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      this.set(result, key, obj[key]);
    }

    return result;
  }

  /**
   * Get all keys from nested object as dot notation paths
   * Example: keys({ a: { b: 1, c: 2 } }) => ['a.b', 'a.c']
   * @param {Object} obj - Object to get keys from
   * @param {string} prefix - Key prefix (used internally)
   * @returns {Array} - Array of key paths
   */
  static keys(obj, prefix = '') {
    const result = [];

    for(const key in obj) {
      if(!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if(value && typeof value === 'object' && !Array.isArray(value)) {
        result.push(...this.keys(value, fullKey));
      } else {
        result.push(fullKey);
      }
    }

    return result;
  }

  /**
   * Filter object by callback function
   * Similar to array.filter() but for objects
   * @param {Object} obj - Object to filter
   * @param {Function} callback - Filter function (value, key, obj) => boolean
   * @returns {Object} - Filtered object
   */
  static filter(obj, callback) {
    const result = {};

    for(const key in obj) {
      if(!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      if(callback(obj[key], key, obj)) {
        result[key] = obj[key];
      }
    }

    return result;
  }

  /**
   * Map object values by callback function
   * Similar to array.map() but for objects
   * @param {Object} obj - Object to map
   * @param {Function} callback - Map function (value, key, obj) => newValue
   * @returns {Object} - Mapped object
   */
  static map(obj, callback) {
    const result = {};

    for(const key in obj) {
      if(!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      result[key] = callback(obj[key], key, obj);
    }

    return result;
  }

  // ==================== Comparison & Equality ====================

  /**
   * Deep equality comparison
   * @param {*} val1 - First value
   * @param {*} val2 - Second value
   * @returns {boolean}
   */
  static equals(val1, val2) {
    // Strict equality
    if(val1 === val2) return true;

    // Check for null/undefined
    if(val1 === null || val2 === null || val1 === undefined || val2 === undefined) {
      return false;
    }

    // Check for Date objects
    if(val1 instanceof Date && val2 instanceof Date) {
      return val1.getTime() === val2.getTime();
    }

    // Check for RegExp objects
    if(val1 instanceof RegExp && val2 instanceof RegExp) {
      return val1.toString() === val2.toString();
    }

    // Check if both are objects
    if(typeof val1 !== 'object' || typeof val2 !== 'object') {
      return false;
    }

    // Check for arrays
    if(Array.isArray(val1) !== Array.isArray(val2)) {
      return false;
    }

    const keys1 = Object.keys(val1);
    const keys2 = Object.keys(val2);

    if(keys1.length !== keys2.length) {
      return false;
    }

    for(const key of keys1) {
      if(!keys2.includes(key) || !this.equals(val1[key], val2[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get diff between two objects (returns changed/added keys)
   * @param {Object} obj1 - Original object
   * @param {Object} obj2 - Modified object
   * @returns {Object} - Object containing only changed/added keys
   */
  static diff(obj1, obj2) {
    const result = {};

    // Check for changed/added keys in obj2
    for(const key in obj2) {
      if(!Object.prototype.hasOwnProperty.call(obj2, key)) {
        continue;
      }

      if(!this.equals(obj1[key], obj2[key])) {
        result[key] = obj2[key];
      }
    }

    return result;
  }

  // ==================== Type Conversion ====================

  /**
   * Convert object to query string
   * Example: toQueryString({ a: 1, b: 2 }) => 'a=1&b=2'
   * @param {Object} obj - Object to convert
   * @param {string} prefix - Prefix for nested keys
   * @returns {string} - Query string
   */
  static toQueryString(obj, prefix = '') {
    const pairs = [];

    for(const key in obj) {
      if(!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      const fullKey = prefix ? `${prefix}[${key}]` : key;
      const value = obj[key];

      if(value === null || value === undefined) {
        continue;
      }

      if(typeof value === 'object' && !Array.isArray(value)) {
        pairs.push(this.toQueryString(value, fullKey));
      } else if(Array.isArray(value)) {
        value.forEach((item, index) => {
          pairs.push(`${fullKey}[${index}]=${encodeURIComponent(item)}`);
        });
      } else {
        pairs.push(`${fullKey}=${encodeURIComponent(value)}`);
      }
    }

    return pairs.join('&');
  }

  /**
   * Parse query string to object
   * Example: fromQueryString('a=1&b=2') => { a: '1', b: '2' }
   * @param {string} queryString - Query string to parse
   * @returns {Object} - Parsed object
   */
  static fromQueryString(queryString) {
    const result = {};

    if(!queryString || typeof queryString !== 'string') {
      return result;
    }

    // Remove leading '?' if present
    queryString = queryString.replace(/^\?/, '');

    const pairs = queryString.split('&');

    for(const pair of pairs) {
      const [key, value] = pair.split('=').map(decodeURIComponent);
      if(key) {
        result[key] = value || '';
      }
    }

    return result;
  }

  /**
   * Pretty print JSON
   * @param {*} value - Value to print
   * @param {number} space - Number of spaces for indentation
   * @returns {string} - Formatted JSON string
   */
  static prettyPrint(value, space = 2) {
    return this.encode(value, {
      pretty: true,
      space
    });
  }

}

module.exports = JsonUtil;