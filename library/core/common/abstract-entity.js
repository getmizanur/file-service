const VarUtil = require('../../util/var-util');
const JsonUtil = require('../../util/json-util');

/**
 * AbstractEntity
 * Base class for all entity objects providing data exchange, validation, and storage functionality
 *
 * This class provides a common interface for domain entities with the following features:
 * - Data exchange between objects and arrays
 * - Property getter/setter with dot notation support
 * - Input validation through InputFilter integration
 * - Deep cloning and copying of entity data
 * - Storage management for internal data
 *
 * All entity classes should extend this abstract class and implement required methods.
 *
 * Example usage:
 *
 * class User extends AbstractEntity {
 *     constructor(data = null) {
 *         super();
 *         this.storage = {
 *             id: null,
 *             name: null,
 *             email: null,
 *             role: 'user',
 *             created_at: null
 *         };
 *         if (data) {
 *             this.exchangeObject(data);
 *         }
 *     }
 * }
 *
 * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
 * user.set('role', 'admin');
 * const data = user.getObjectCopy();
 */
class AbstractEntity {



  constructor() {
    const ctor = this.constructor;

    // Enforce static schema contract
    if (!ctor.schema || typeof ctor.schema !== 'object') {
      throw new Error(
        `${ctor.name} must define a static schema object`
      );
    }


    /**
     * Internal data storage
     * Subclasses should initialize this in their constructor
     * @type {Object}
     */
    this.storage = { ...ctor.schema };

    /**
     * InputFilter instance for validation
     * @type {InputFilter|null}
     */
    this.inputFilter = null;
  }

  // abstract-entity.js
  static columns() {
    // convention: subclasses must define a static `schema` object
    // (same shape as instance storage)
    if (this.schema && typeof this.schema === 'object') {
      return Object.keys(this.schema);
    }

    // fallback: instantiate and read storage keys
    // (works with your current "this.storage = {...}" constructors)
    const instance = new this();
    if (instance && instance.getStorage) {
      return Object.keys(instance.getStorage());
    }
    return [];
  }

  // ==================== Data Exchange Methods ====================

  /**
   * Exchange data from an object into this entity
   * This method populates the entity's storage from an object or array
   *
   * @param {Object|Array} data - Data to exchange (object or associative array)
   * @returns {AbstractEntity} - Returns this for method chaining
   * @throws {Error} - If not implemented by subclass
   *
   * @example
   * const user = new User();
   * user.exchangeObject({ id: 1, name: 'John', email: 'john@example.com' });
   *
   * @example
   * // With nested data
   * const post = new Post();
   * post.exchangeObject({
   *     id: 1,
   *     title: 'Hello World',
   *     author: { id: 5, name: 'John' }
   * });
   */
  exchangeObject(data) {
    if (!data) return;
    Object.keys(data).forEach(key => {
      if (key in this.storage) {
        this.storage[key] = data[key];
      }
    });
  }

  /**
   * Populate entity from object data (alias for exchangeObject)
   * Provides compatibility with PHP-style fromObject method
   *
   * @param {Object} data - Data object to populate from
   * @returns {AbstractEntity} - Returns this for method chaining
   *
   * @example
   * const user = new User();
   * user.fromObject({ id: 1, name: 'John' });
   */
  fromObject(data) {
    return this.exchangeObject(data);
  }


  toObject() {
    return { ...this.storage };
  }

  /**
   * Get a copy of the entity as a plain object
   * Returns a deep clone of the entity's data suitable for serialization
   *
   * @returns {Object} - Plain object copy of entity data
   * @throws {Error} - If not implemented by subclass
   *
   * @example
   * const user = new User({ id: 1, name: 'John' });
   * const data = user.getObjectCopy();
   * // Returns: { id: 1, name: 'John', email: null, ... }
   */
  getObjectCopy() {
    return this.toObject();
  }

  // ==================== Storage Access Methods ====================

  /**
   * Get the internal storage object
   * Returns reference to the entity's internal data storage
   *
   * @returns {Object} - Internal storage object
   *
   * @example
   * const user = new User({ id: 1, name: 'John' });
   * const storage = user.getStorage();
   * console.log(storage.name); // 'John'
   */
  getStorage() {
    return this.storage;
  }

  /**
   * Set the internal storage object
   * Replaces the entire internal storage with new data
   *
   * @param {Object} data - New storage data
   * @returns {AbstractEntity} - Returns this for method chaining
   *
   * @example
   * const user = new User();
   * user.setStorage({ id: 1, name: 'John', email: 'john@example.com' });
   */
  setStorage(data) {
    if (!VarUtil.isObject(data)) {
      throw new Error('Storage data must be a non-null object');
    }
    this.storage = data;
    return this;
  }

  // ==================== Property Access Methods ====================

  /**
   * Get a property value by key
   * Supports dot notation for nested properties
   *
   * @param {string} key - Property key (supports dot notation: 'user.profile.name')
   * @param {*} defaultValue - Default value if property doesn't exist
   * @returns {*} - Property value or default
   *
   * @example
   * const user = new User({ id: 1, name: 'John' });
   * const name = user.get('name'); // 'John'
   * const age = user.get('age', 0); // 0 (default)
   *
   * @example
   * // With nested properties
   * const post = new Post({ author: { name: 'John' } });
   * const authorName = post.get('author.name'); // 'John'
   */
  get(key, defaultValue = undefined) {
    if (!VarUtil.isString(key) || VarUtil.empty(key)) {
      return defaultValue;
    }

    // Handle dot notation for nested properties
    if (key.includes('.')) {
      return this._getNestedProperty(key, defaultValue);
    }

    // Direct property access
    if (VarUtil.hasKey(this.storage, key)) {
      return this.storage[key];
    }

    return defaultValue;
  }

  /**
   * Set a property value by key
   * Supports dot notation for nested properties
   *
   * @param {string} key - Property key (supports dot notation)
   * @param {*} value - Value to set
   * @returns {AbstractEntity} - Returns this for method chaining
   *
   * @example
   * const user = new User();
   * user.set('id', 1)
   *     .set('name', 'John')
   *     .set('email', 'john@example.com');
   *
   * @example
   * // With nested properties
   * const post = new Post();
   * post.set('author.name', 'John');
   * // Creates: { author: { name: 'John' } }
   */
  set(key, value) {
    if (!VarUtil.isString(key) || VarUtil.empty(key)) {
      throw new Error('Property key must be a non-empty string');
    }

    // Handle dot notation for nested properties
    if (key.includes('.')) {
      this._setNestedProperty(key, value);
    } else {
      this.storage[key] = value;
    }

    return this;
  }

  /**
   * Get nested property using dot notation
   * @param {string} path - Dot notation path
   * @param {*} defaultValue - Default value
   * @returns {*} - Property value or default
   * @private
   */
  _getNestedProperty(path, defaultValue) {
    return JsonUtil.get(this.storage, path, defaultValue);
  }

  /**
   * Set nested property using dot notation
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   * @private
   */
  _setNestedProperty(path, value) {
    JsonUtil.set(this.storage, path, value);
  }

  // ==================== Validation Methods ====================

  /**
   * Set the InputFilter for this entity
   * InputFilter provides validation and filtering capabilities
   *
   * @param {InputFilter} inputFilter - InputFilter instance
   * @returns {AbstractEntity} - Returns this for method chaining
   *
   * @example
   * const user = new User();
   * const filter = new InputFilter();
   * // Configure filter...
   * user.setInputFilter(filter);
   */
  setInputFilter(inputFilter) {
    this.inputFilter = inputFilter;
    return this;
  }

  /**
   * Get the InputFilter for this entity
   *
   * @returns {InputFilter|null} - InputFilter instance or null
   *
   * @example
   * const user = new User();
   * const filter = user.getInputFilter();
   * if (filter) {
   *     filter.setData(userData);
   * }
   */
  getInputFilter() {
    return this.inputFilter;
  }

  /**
   * Validate the entity data using its InputFilter
   *
   * @returns {boolean} - True if valid, false otherwise
   *
   * @example
   * const user = new User({ name: 'John', email: 'invalid-email' });
   * if (!user.isValid()) {
   *     const errors = user.getInputFilter().getMessages();
   *     console.log(errors);
   * }
   */
  isValid() {
    if (!this.inputFilter) {
      throw new Error(`${this.constructor.name}::isValid() requires an InputFilter to be set`);
    }

    // Set entity data to input filter
    this.inputFilter.setData(this.storage);

    // Validate
    return this.inputFilter.isValid();
  }

  // ==================== Utility Methods ====================

  /**
   * Check if a property exists in the entity
   *
   * @param {string} key - Property key (supports dot notation)
   * @returns {boolean} - True if property exists
   *
   * @example
   * const user = new User({ id: 1, name: 'John' });
   * user.has('name'); // true
   * user.has('age'); // false
   * user.has('profile.avatar'); // true/false for nested
   */
  has(key) {
    if (!VarUtil.isString(key) || VarUtil.empty(key)) {
      return false;
    }

    // Use JsonUtil.has for both simple and nested keys
    return JsonUtil.has(this.storage, key);
  }

  /**
   * Remove a property from the entity
   * Supports dot notation for nested properties
   *
   * @param {string} key - Property key to remove (supports dot notation)
   * @returns {boolean} - True if removed, false if not found
   *
   * @example
   * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
   * user.unset('email');
   * user.has('email'); // false
   *
   * @example
   * // Remove nested property
   * const post = new Post({ author: { name: 'John', email: 'john@example.com' } });
   * post.unset('author.email');
   * post.has('author.email'); // false
   * post.has('author.name'); // true
   */
  unset(key) {
    if (!VarUtil.isString(key) || VarUtil.empty(key)) {
      return false;
    }

    // Use JsonUtil.unset for both simple and nested keys
    return JsonUtil.unset(this.storage, key);
  }

  /**
   * Get all property keys from the entity
   *
   * @returns {Array<string>} - Array of property keys
   *
   * @example
   * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
   * const keys = user.keys();
   * // Returns: ['id', 'name', 'email']
   */
  keys() {
    return Object.keys(this.storage);
  }

  /**
   * Convert entity to JSON string
   *
   * @param {boolean} pretty - Pretty print with indentation
   * @returns {string} - JSON string
   *
   * @example
   * const user = new User({ id: 1, name: 'John' });
   * const json = user.toJSON();
   * // Returns: '{"id":1,"name":"John",...}'
   */
  toJSON(pretty = false) {
    return JsonUtil.encode(this.storage, {
      pretty,
      space: 2
    });
  }

  /**
   * Create entity from JSON string
   *
   * @param {string} json - JSON string
   * @returns {AbstractEntity} - Returns this for method chaining
   *
   * @example
   * const user = new User();
   * user.fromJSON('{"id":1,"name":"John"}');
   */
  fromJSON(json) {
    const data = JsonUtil.decode(json);
    if (data === null) {
      throw new Error('Invalid JSON string provided');
    }
    return this.exchangeObject(data);
  }

  /**
   * Clone this entity
   * Creates a deep copy of the entity
   *
   * @returns {AbstractEntity} - New cloned entity instance
   *
   * @example
   * const user1 = new User({ id: 1, name: 'John' });
   * const user2 = user1.clone();
   * user2.set('name', 'Jane');
   * // user1.get('name') is still 'John'
   */
  clone() {
    const cloned = new this.constructor();
    cloned.setStorage(VarUtil.clone(this.storage));
    if (this.inputFilter) {
      cloned.setInputFilter(this.inputFilter);
    }
    return cloned;
  }

  /**
   * Merge data into this entity
   * Deep merges provided data with existing entity storage
   *
   * @param {Object} data - Data to merge
   * @returns {AbstractEntity} - Returns this for method chaining
   *
   * @example
   * const user = new User({ id: 1, name: 'John', profile: { age: 30 } });
   * user.merge({ profile: { city: 'London' }, email: 'john@example.com' });
   * // Result: { id: 1, name: 'John', profile: { age: 30, city: 'London' }, email: '...' }
   */
  merge(data) {
    if (!VarUtil.isObject(data)) {
      throw new Error('Merge data must be a non-null object');
    }
    this.storage = JsonUtil.merge(this.storage, data);
    return this;
  }

  /**
   * Get difference between this entity and another object
   * Returns only the properties that are different
   *
   * @param {Object} other - Object to compare against
   * @returns {Object} - Object containing only changed properties
   *
   * @example
   * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
   * const changes = user.diff({ id: 1, name: 'Jane', email: 'john@example.com' });
   * // Returns: { name: 'Jane' }
   */
  diff(other) {
    if (!VarUtil.isObject(other)) {
      throw new Error('Diff comparison requires a non-null object');
    }
    return JsonUtil.diff(this.storage, other);
  }

  /**
   * Check if this entity equals another object/entity
   * Performs deep equality comparison
   *
   * @param {Object|AbstractEntity} other - Object or entity to compare
   * @returns {boolean} - True if equal, false otherwise
   *
   * @example
   * const user1 = new User({ id: 1, name: 'John' });
   * const user2 = new User({ id: 1, name: 'John' });
   * user1.equals(user2); // true
   * user1.equals({ id: 1, name: 'Jane' }); // false
   */
  equals(other) {
    const otherData = other instanceof AbstractEntity ? other.getStorage() : other;
    if (!VarUtil.isObject(otherData)) {
      return false;
    }
    return JsonUtil.equals(this.storage, otherData);
  }

  /**
   * Flatten entity to single level with dot notation keys
   *
   * @returns {Object} - Flattened object
   *
   * @example
   * const post = new Post({ id: 1, author: { name: 'John', email: 'john@example.com' } });
   * const flat = post.flatten();
   * // Returns: { id: 1, 'author.name': 'John', 'author.email': 'john@example.com' }
   */
  flatten() {
    return JsonUtil.flatten(this.storage);
  }

  /**
   * Populate entity from flattened object with dot notation keys
   *
   * @param {Object} flatData - Flattened object with dot notation keys
   * @returns {AbstractEntity} - Returns this for method chaining
   *
   * @example
   * const user = new User();
   * user.unflatten({ 'id': 1, 'profile.name': 'John', 'profile.email': 'john@example.com' });
   * // Result: { id: 1, profile: { name: 'John', email: 'john@example.com' } }
   */
  unflatten(flatData) {
    if (!VarUtil.isObject(flatData)) {
      throw new Error('Unflatten data must be a non-null object');
    }
    this.storage = JsonUtil.unflatten(flatData);
    return this;
  }

  /**
   * Check if this class implements AbstractEntity
   * @returns {boolean}
   */
  static implementsAbstractEntity() {
    return true;
  }

  /**
   * Get entity version for compatibility checking
   * @returns {string}
   */
  static getEntityVersion() {
    return '1.0.0';
  }
}

module.exports = AbstractEntity;