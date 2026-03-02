// library/util/var-util.js
/**
 * Variable Utility Class
 * Provides PHP-inspired type checking and variable validation utilities
 * for JavaScript/Node.js applications
 */
class VarUtil {

  // ==================== Type Checking ====================

  /**
   * Check if value is null
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isNull(val) {
    return val === null;
  }

  /**
   * Check if value is undefined
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isUndefined(val) {
    return val === undefined;
  }

  /**
   * Check if value is a plain object (not array, null, or other object types)
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isObject(val) {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
  }

  /**
   * Check if value is boolean
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isBool(val) {
    return typeof val === 'boolean';
  }

  /**
   * Check if value is a string
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isString(val) {
    return typeof val === 'string';
  }

  /**
   * Check if value is an integer (whole number)
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isInt(val) {
    return Number.isInteger(val);
  }

  /**
   * Check if value is a float/decimal number
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isFloat(val) {
    return typeof val === 'number' && isFinite(val) && !Number.isInteger(val);
  }

  /**
   * Check if value is a number (int or float)
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isNumeric(val) {
    if(typeof val === 'number') {
      return isFinite(val);
    }
    if(typeof val === 'string') {
      return !isNaN(parseFloat(val)) && isFinite(val);
    }
    return false;
  }

  /**
   * Check if value is an array
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isArray(val) {
    return Array.isArray(val);
  }

  /**
   * Check if value is a function
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isFunction(val) {
    return typeof val === 'function';
  }

  /**
   * Check if value is a valid Date object
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isDate(val) {
    return val instanceof Date && !isNaN(val.getTime());
  }

  /**
   * Check if value is a RegExp
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isRegExp(val) {
    return val instanceof RegExp;
  }

  /**
   * Check if value is a valid JSON string
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isJSON(val) {
    if(typeof val !== 'string') {
      return false;
    }
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ==================== PHP-Inspired Functions ====================

  /**
   * Check if variable(s) are set (not null or undefined)
   * Similar to PHP's isset()
   * @param {...*} args - Variables to check
   * @returns {boolean}
   */
  static isset(...args) {
    if(args.length === 0) {
      throw new Error('isset() expects at least 1 parameter, 0 given');
    }

    for(let i = 0; i < args.length; i++) {
      if(args[i] === null || args[i] === undefined) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if variable is empty
   * Similar to PHP's empty()
   * Empty values: undefined, null, false, 0, '0', '', [], {}
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static empty(val) {
    // Check primitive empty values
    if(val === undefined || val === null || val === false || val === 0 || val === '0' || val === '') {
      return true;
    }

    // Check empty array
    if(Array.isArray(val)) {
      return val.length === 0;
    }

    // Check empty object
    if(typeof val === 'object' && val !== null) {
      return Object.keys(val).length === 0;
    }

    return false;
  }

  /**
   * Get the type of a variable (more detailed than typeof)
   * @param {*} val - Value to check
   * @returns {string} - Type name: 'null', 'undefined', 'boolean', 'number', 'string',
   *                     'array', 'object', 'function', 'date', 'regexp', etc.
   */
  static getType(val) {
    if(val === null) return 'null';
    if(val === undefined) return 'undefined';
    if(Array.isArray(val)) return 'array';
    if(val instanceof Date) return 'date';
    if(val instanceof RegExp) return 'regexp';
    if(val instanceof Error) return 'error';

    const type = typeof val;
    if(type === 'object') {
      // Get constructor name for custom objects
      return val.constructor ? val.constructor.name.toLowerCase() : 'object';
    }
    return type;
  }

  // ==================== Utility Functions ====================

  /**
   * Check if object/array has a property/key
   * @param {Object|Array} obj - Object or array to check
   * @param {string|number} key - Property/index to look for
   * @returns {boolean}
   */
  static hasKey(obj, key) {
    if(!this.isObject(obj) && !this.isArray(obj)) {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /**
   * Count elements in array or object
   * Similar to PHP's count()
   * @param {Array|Object} val - Value to count
   * @returns {number}
   */
  static count(val) {
    if(this.isArray(val)) {
      return val.length;
    }
    if(this.isObject(val)) {
      return Object.keys(val).length;
    }
    if(this.isString(val)) {
      return val.length;
    }
    return 0;
  }

  /**
   * Check if value is scalar (primitive type)
   * Scalar types: string, number, boolean
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isScalar(val) {
    const type = typeof val;
    return type === 'string' || type === 'number' || type === 'boolean';
  }

  /**
   * Check if value is callable (function)
   * Similar to PHP's is_callable()
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isCallable(val) {
    return typeof val === 'function';
  }

  /**
   * Convert value to integer
   * Similar to PHP's intval()
   * @param {*} val - Value to convert
   * @param {number} base - Base for conversion (default: 10)
   * @returns {number}
   */
  static intval(val, base = 10) {
    const parsed = parseInt(val, base);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Convert value to float
   * Similar to PHP's floatval()
   * @param {*} val - Value to convert
   * @returns {number}
   */
  static floatval(val) {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0.0 : parsed;
  }

  /**
   * Convert value to boolean
   * Similar to PHP's boolval()
   * @param {*} val - Value to convert
   * @returns {boolean}
   */
  static boolval(val) {
    return Boolean(val);
  }

  /**
   * Convert value to string
   * Similar to PHP's strval()
   * @param {*} val - Value to convert
   * @returns {string}
   */
  static strval(val) {
    if(val === null) return '';
    if(val === undefined) return '';
    if(typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  }

  /**
   * Deep clone an object or array
   * @param {*} val - Value to clone
   * @returns {*} - Cloned value
   */
  static clone(val) {
    if(val === null || typeof val !== 'object') {
      return val;
    }

    if(val instanceof Date) {
      return new Date(val.getTime());
    }

    if(val instanceof RegExp) {
      return new RegExp(val.source, val.flags);
    }

    if(Array.isArray(val)) {
      return val.map(item => this.clone(item));
    }

    const cloned = {};
    for(const key in val) {
      if(Object.prototype.hasOwnProperty.call(val, key)) {
        cloned[key] = this.clone(val[key]);
      }
    }
    return cloned;
  }

  /**
   * Check if two values are equal (deep comparison for objects/arrays)
   * @param {*} val1 - First value
   * @param {*} val2 - Second value
   * @returns {boolean}
   */
  static isEqual(val1, val2) {
    // Strict equality check
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
      if(!keys2.includes(key) || !this.isEqual(val1[key], val2[key])) {
        return false;
      }
    }

    return true;
  }

}

module.exports = VarUtil;