// library/util/class-util.js
/**
 * Class Utility Class
 * Provides PHP-inspired class/object reflection and introspection utilities
 * for JavaScript/Node.js applications
 */
class ClassUtil {

  // ==================== Class Hierarchy ====================

  /**
   * Get the immediate parent class of a given class
   * Similar to PHP's get_parent_class()
   * @param {Function|Object} target - Class or instance to check
   * @returns {Function|null} - Parent class or null if none exists
   */
  static getParentClass(target) {
    // Handle both class and instance
    const targetClass = typeof target === 'function' ? target : target.constructor;

    if(!(targetClass instanceof Function)) {
      return null;
    }

    const parentClass = Object.getPrototypeOf(targetClass);

    // Return parent only if it's a valid class (not Object itself)
    if(parentClass && parentClass !== Object && parentClass.name) {
      return parentClass;
    }

    return null;
  }

  /**
   * Get the class name of an object or class
   * Similar to PHP's get_class()
   * @param {Function|Object} target - Class or instance
   * @returns {string} - Class name
   */
  static getClassName(target) {
    if(typeof target === 'function') {
      return target.name || 'Anonymous';
    }
    if(target && typeof target === 'object') {
      return target.constructor ? target.constructor.name : 'Object';
    }
    return 'Unknown';
  }

  /**
   * Check if a class/instance is a subclass of another class
   * Similar to PHP's is_subclass_of()
   * @param {Function|Object} target - Class or instance to check
   * @param {Function|string} parent - Parent class or class name
   * @returns {boolean}
   */
  static isSubclassOf(target, parent) {
    const targetClass = typeof target === 'function' ? target : target.constructor;
    const parentName = typeof parent === 'string' ? parent : parent.name;

    if(!(targetClass instanceof Function)) {
      return false;
    }

    let currentClass = Object.getPrototypeOf(targetClass);

    while(currentClass && currentClass !== Object) {
      if(typeof parent === 'function' && currentClass === parent) {
        return true;
      }
      if(typeof parent === 'string' && currentClass.name === parentName) {
        return true;
      }
      currentClass = Object.getPrototypeOf(currentClass);
    }

    return false;
  }

  /**
   * Check if an object is an instance of a class
   * Similar to PHP's instanceof operator
   * @param {Object} obj - Object to check
   * @param {Function|string} className - Class or class name
   * @returns {boolean}
   */
  static isInstanceOf(obj, className) {
    if(!obj || typeof obj !== 'object') {
      return false;
    }

    if(typeof className === 'function') {
      return obj instanceof className;
    }

    if(typeof className === 'string') {
      return obj.constructor && obj.constructor.name === className;
    }

    return false;
  }

  // ==================== Method Introspection ====================

  /**
   * Get all methods of a class/instance (including inherited)
   * Similar to PHP's get_class_methods()
   * @param {Function|Object} target - Class or instance
   * @returns {Array<string>} - Array of method names
   */
  static getClassMethods(target) {
    const obj = typeof target === 'function' ? target.prototype : target;
    const props = [];

    let current = obj;
    do {
      const methods = Object.getOwnPropertyNames(current)
        .concat(Object.getOwnPropertySymbols(current).map(s => s.toString()))
        .filter((p, i, arr) =>
          typeof current[p] === 'function' && // Only methods
          p !== 'constructor' && // Not the constructor
          (i === 0 || p !== arr[i - 1]) && // Not duplicate in prototype
          props.indexOf(p) === -1 // Not overridden in child
        );
      props.push(...methods);
    } while(
      (current = Object.getPrototypeOf(current)) &&
      Object.getPrototypeOf(current)
    );

    return props;
  }

  /**
   * Get only the methods defined in the class itself (not inherited)
   * @param {Function|Object} target - Class or instance
   * @returns {Array<string>} - Array of method names
   */
  static getOwnMethods(target) {
    const obj = typeof target === 'function' ? target.prototype : target;

    return Object.getOwnPropertyNames(obj)
      .concat(Object.getOwnPropertySymbols(obj).map(s => s.toString()))
      .filter(p =>
        typeof obj[p] === 'function' &&
        p !== 'constructor'
      );
  }

  /**
   * Check if a method exists on a class/instance
   * Similar to PHP's method_exists()
   * @param {Function|Object} target - Class or instance
   * @param {string} methodName - Method name to check
   * @returns {boolean}
   */
  static methodExists(target, methodName) {
    const obj = typeof target === 'function' ? target.prototype : target;
    return typeof obj[methodName] === 'function';
  }

  /**
   * Check if a method is callable on an object
   * Similar to PHP's is_callable()
   * @param {Object} obj - Object to check
   * @param {string} methodName - Method name
   * @returns {boolean}
   */
  static isCallable(obj, methodName) {
    return obj && typeof obj[methodName] === 'function';
  }

  /**
   * Call a method dynamically
   * Similar to PHP's call_user_func()
   * @param {Object} obj - Object instance
   * @param {string} methodName - Method name
   * @param {...*} args - Arguments to pass
   * @returns {*} - Method return value
   */
  static callMethod(obj, methodName, ...args) {
    if(!this.isCallable(obj, methodName)) {
      throw new Error(`Method '${methodName}' is not callable`);
    }
    return obj[methodName](...args);
  }

  /**
   * Call a method dynamically with arguments array
   * Similar to PHP's call_user_func_array()
   * @param {Object} obj - Object instance
   * @param {string} methodName - Method name
   * @param {Array} args - Arguments array
   * @returns {*} - Method return value
   */
  static callMethodArray(obj, methodName, args = []) {
    if(!this.isCallable(obj, methodName)) {
      throw new Error(`Method '${methodName}' is not callable`);
    }
    return obj[methodName](...args);
  }

  // ==================== Property Introspection ====================

  /**
   * Get all properties of an object (including inherited)
   * Similar to PHP's get_object_vars()
   * @param {Object} obj - Object to inspect
   * @param {boolean} ownOnly - Get only own properties (default: false)
   * @returns {Array<string>} - Array of property names
   */
  static getObjectProperties(obj, ownOnly = false) {
    if(!obj || typeof obj !== 'object') {
      return [];
    }

    if(ownOnly) {
      return Object.getOwnPropertyNames(obj)
        .filter(p => typeof obj[p] !== 'function');
    }

    const props = [];
    let current = obj;

    do {
      const properties = Object.getOwnPropertyNames(current)
        .filter(p =>
          typeof current[p] !== 'function' &&
          p !== 'constructor' &&
          props.indexOf(p) === -1
        );
      props.push(...properties);
    } while((current = Object.getPrototypeOf(current)) && current !== Object.prototype);

    return props;
  }

  /**
   * Get all static properties of a class
   * @param {Function} targetClass - Class to inspect
   * @returns {Array<string>} - Array of static property names
   */
  static getStaticProperties(targetClass) {
    if(typeof targetClass !== 'function') {
      return [];
    }

    return Object.getOwnPropertyNames(targetClass)
      .filter(p =>
        p !== 'prototype' &&
        p !== 'length' &&
        p !== 'name' &&
        typeof targetClass[p] !== 'function'
      );
  }

  /**
   * Get all static methods of a class
   * @param {Function} targetClass - Class to inspect
   * @returns {Array<string>} - Array of static method names
   */
  static getStaticMethods(targetClass) {
    if(typeof targetClass !== 'function') {
      return [];
    }

    return Object.getOwnPropertyNames(targetClass)
      .filter(p =>
        p !== 'prototype' &&
        p !== 'length' &&
        p !== 'name' &&
        typeof targetClass[p] === 'function'
      );
  }

  /**
   * Check if a property exists on an object
   * Similar to PHP's property_exists()
   * @param {Object} obj - Object to check
   * @param {string} propertyName - Property name
   * @returns {boolean}
   */
  static propertyExists(obj, propertyName) {
    if(!obj || typeof obj !== 'object') {
      return false;
    }
    return propertyName in obj;
  }

  /**
   * Get property value dynamically
   * @param {Object} obj - Object instance
   * @param {string} propertyName - Property name
   * @param {*} defaultValue - Default value if property doesn't exist
   * @returns {*} - Property value or default
   */
  static getProperty(obj, propertyName, defaultValue = undefined) {
    if(!obj || typeof obj !== 'object') {
      return defaultValue;
    }
    return propertyName in obj ? obj[propertyName] : defaultValue;
  }

  /**
   * Set property value dynamically
   * @param {Object} obj - Object instance
   * @param {string} propertyName - Property name
   * @param {*} value - Value to set
   * @returns {boolean} - True if successful
   */
  static setProperty(obj, propertyName, value) {
    if(!obj || typeof obj !== 'object') {
      return false;
    }
    obj[propertyName] = value;
    return true;
  }

  // ==================== Class Information ====================

  /**
   * Get all information about a class
   * @param {Function|Object} target - Class or instance
   * @returns {Object} - Class information object
   */
  static getClassInfo(target) {
    const targetClass = typeof target === 'function' ? target : target.constructor;
    const isInstance = typeof target !== 'function';

    return {
      name: this.getClassName(target),
      isInstance: isInstance,
      parentClass: this.getParentClass(targetClass),
      methods: this.getClassMethods(target),
      ownMethods: this.getOwnMethods(target),
      staticMethods: this.getStaticMethods(targetClass),
      properties: isInstance ? this.getObjectProperties(target, true) : [],
      staticProperties: this.getStaticProperties(targetClass)
    };
  }

  /**
   * Check if a class/object has a specific trait/mixin
   * @param {Function|Object} target - Class or instance
   * @param {string} traitMethod - Method name that indicates trait presence
   * @returns {boolean}
   */
  static hasTrait(target, traitMethod) {
    return this.methodExists(target, traitMethod);
  }

  // ==================== Class Creation & Cloning ====================

  /**
   * Create a new instance of a class dynamically
   * Similar to PHP's new $className()
   * @param {Function} targetClass - Class to instantiate
   * @param {...*} args - Constructor arguments
   * @returns {Object} - New instance
   */
  static createInstance(targetClass, ...args) {
    if(typeof targetClass !== 'function') {
      throw new Error('Target must be a class/constructor function');
    }
    return new targetClass(...args);
  }

  /**
   * Clone an object (shallow copy)
   * Similar to PHP's clone
   * @param {Object} obj - Object to clone
   * @returns {Object} - Cloned object
   */
  static cloneObject(obj) {
    if(!obj || typeof obj !== 'object') {
      return obj;
    }

    if(Array.isArray(obj)) {
      return [...obj];
    }

    // Create new instance of same class
    const cloned = Object.create(Object.getPrototypeOf(obj));
    Object.assign(cloned, obj);
    return cloned;
  }

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} - Deep cloned object
   */
  static deepClone(obj) {
    if(obj === null || typeof obj !== 'object') {
      return obj;
    }

    if(obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if(obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags);
    }

    if(Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    // Create new instance of same class
    const cloned = Object.create(Object.getPrototypeOf(obj));

    for(const key in obj) {
      if(Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  // ==================== Utility Functions ====================

  /**
   * Check if a value is a class (constructor function)
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  static isClass(val) {
    return typeof val === 'function' &&
      val.prototype &&
      val.prototype.constructor === val;
  }

  /**
   * Get the constructor of an object
   * @param {Object} obj - Object to inspect
   * @returns {Function|null} - Constructor function or null
   */
  static getConstructor(obj) {
    if(!obj || typeof obj !== 'object') {
      return null;
    }
    return obj.constructor || null;
  }

  /**
   * Compare two objects by class
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {boolean} - True if both are instances of the same class
   */
  static isSameClass(obj1, obj2) {
    if(!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return false;
    }
    return obj1.constructor === obj2.constructor;
  }

  /**
   * Get all interfaces/mixins applied to a class
   * (JavaScript doesn't have formal interfaces, but this can check for method contracts)
   * @param {Function|Object} target - Class or instance
   * @param {Object} interface - Object with method names to check
   * @returns {boolean} - True if all interface methods exist
   */
  static implementsInterface(target, interfaceObj) {
    const methods = Object.keys(interfaceObj);
    return methods.every(method => this.methodExists(target, method));
  }

  /**
   * Mix methods from one or more sources into a target class
   * @param {Function} targetClass - Class to add methods to
   * @param {...Object} mixins - Objects with methods to mix in
   * @returns {Function} - Modified target class
   */
  static mixin(targetClass, ...mixins) {
    if(typeof targetClass !== 'function') {
      throw new Error('Target must be a class');
    }

    for(const mixin of mixins) {
      if(!mixin || typeof mixin !== 'object') {
        continue;
      }

      for(const key in mixin) {
        if(Object.prototype.hasOwnProperty.call(mixin, key)) {
          if(typeof mixin[key] === 'function') {
            targetClass.prototype[key] = mixin[key];
          }
        }
      }
    }

    return targetClass;
  }

  /**
   * Serialize an object to a simple representation
   * Similar to PHP's serialize() but returns JSON
   * @param {Object} obj - Object to serialize
   * @returns {string} - JSON representation
   */
  static serialize(obj) {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      throw new Error(`Failed to serialize object: ${error.message}`);
    }
  }

  /**
   * Unserialize a JSON string to an object
   * Similar to PHP's unserialize()
   * @param {string} str - JSON string
   * @returns {Object} - Parsed object
   */
  static unserialize(str) {
    try {
      return JSON.parse(str);
    } catch (error) {
      throw new Error(`Failed to unserialize string: ${error.message}`);
    }
  }

}

module.exports = ClassUtil;