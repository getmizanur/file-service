// library/db/hydrator/class-methods-hydrator.js
const StringUtil = require('../../util/string-util');

/**
 * ClassMethodsHydrator (ZF2-inspired)
 *
 * Hydrates an object by calling setter methods if they exist, otherwise assigns
 * to a property. Column names are converted from snake_case to camelCase.
 *
 * Example:
 *  row: { user_id: 1, tenant_id: 't1' }
 *  -> setUserId(1), setTenantId('t1') OR obj.userId = 1, obj.tenantId = 't1'
 */
class ClassMethodsHydrator {
  /**
   * @param {Object} options
   * @param {boolean} options.underscoreSeparatedKeys - convert snake_case to camelCase
   */
  constructor(options = {}) {
    this.underscoreSeparatedKeys = options.underscoreSeparatedKeys !== false;
  }

  hydrate(data, object) {
    if (!data || typeof data !== 'object') return object;

    for (const [key, value] of Object.entries(data)) {
      const prop = this._toPropertyName(key);
      const setter = 'set' + prop.charAt(0).toUpperCase() + prop.slice(1);

      if (typeof object[setter] === 'function') {
        object[setter](value);
      } else {
        object[prop] = value;
      }
    }

    return object;
  }

  extract(object) {
    const out = {};
    for (const key of Object.keys(object)) {
      out[key] = object[key];
    }
    return out;
  }

  _toPropertyName(key) {
    if (!this.underscoreSeparatedKeys) return key;

    // Prefer existing util if it supports snake->camel, else do simple conversion
    if (StringUtil && typeof StringUtil.toCamelCase === 'function') {
      // StringUtil.toCamelCase handles dashes/underscores in this codebase
      return StringUtil.toCamelCase(String(key));
    }

    return String(key).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }
}

module.exports = ClassMethodsHydrator;
