const VarUtil = require('../../util/var-util');

class ServiceManager {

  constructor(config = {}) {
    this.config = config || {};

    // cached (shared) services
    this.services = {};

    // loaded from config.service_manager
    this.invokables = null;
    this.factories = null;
    this.abstractFactories = null;
    this.aliases = null;

    // framework-registered factories (always available)
    this.frameworkFactories = {
      ViewManager: "/library/mvc/service/factory/view-manager-factory",
      ViewHelperManager: "/library/mvc/service/factory/view-helper-manager-factory",
      PluginManager: "/library/mvc/service/factory/plugin-manager-factory",
      Application: "/library/mvc/service/factory/application-factory",
      CacheManager: "/library/mvc/service/factory/cache-manager-factory",
      Cache: "/library/mvc/service/factory/cache-factory"
    };

    // services that should NOT be cached (per-call / per-request patterns)
    this.nonCacheableServices = [
      "AuthenticationService",
      "ViewHelperManager",
      "PluginManager"
    ];

    // cached abstract factory instances (avoid re-instantiation on every has()/create call)
    this._abstractFactoryInstances = new Map();
  }

  /**
   * Inject service manager if supported
   */
  injectServiceManager(instance) {
    if (!instance) return instance;

    if (typeof instance.setServiceManager === 'function') {
      instance.setServiceManager(this);
    }

    return instance;
  }

  /**
   * Resolve aliases (ZF2-style)
   */
  resolveName(name) {
    if (!name) return name;

    if (this.aliases == null) {
      this.loadConfiguration();
    }

    let current = name;
    const visited = new Set();

    while (this.aliases && Object.prototype.hasOwnProperty.call(this.aliases, current)) {
      if (visited.has(current)) {
        throw new Error(`Circular service alias detected at '${current}'`);
      }
      visited.add(current);
      current = this.aliases[current];
    }

    return current;
  }

  /**
   * Main entry point
   */
  get(name) {
    if (name === 'Config' || name === 'config') {
      return this.config;
    }

    if (this.invokables == null || this.factories == null || this.abstractFactories == null || this.aliases == null) {
      this.loadConfiguration();
    }

    const resolvedName = this.resolveName(name);
    const cacheable = !this.nonCacheableServices.includes(resolvedName);

    // cached?
    if (cacheable && this.services[resolvedName]) {
      return this.services[resolvedName];
    }

    // Framework factories
    if (Object.prototype.hasOwnProperty.call(this.frameworkFactories, resolvedName)) {
      return this.createFromFactory(resolvedName, true, cacheable);
    }

    // App factories
    if (Object.prototype.hasOwnProperty.call(this.factories, resolvedName)) {
      return this.createFromFactory(resolvedName, false, cacheable);
    }

    // Invokables
    if (Object.prototype.hasOwnProperty.call(this.invokables, resolvedName)) {
      return this.createFromInvokable(resolvedName, cacheable);
    }

    // Abstract factories (ZF2-style)
    const abstractInstance = this.createFromAbstractFactories(resolvedName, cacheable);
    if (abstractInstance) {
      return abstractInstance;
    }

    throw new Error(`Service '${resolvedName}' not found`);
  }

  loadConfiguration() {
    const serviceManagerObj = (this.config && this.config.service_manager) ? this.config.service_manager : {};

    this.invokables = serviceManagerObj.invokables || {};
    this.factories = serviceManagerObj.factories || {};

    // ZF2-ish: aliases map
    this.aliases = serviceManagerObj.aliases || {};

    // abstract factories list (array of module paths)
    this.abstractFactories = serviceManagerObj.abstract_factories || [];
  }

  /**
   * Create service from factory
   */
  createFromFactory(name, isFramework = false, cacheable = true) {
    const factoryPath = isFramework
      ? global.applicationPath(this.frameworkFactories[name])
      : global.applicationPath(this.factories[name]);

    const FactoryClass = require(factoryPath);

    if (typeof FactoryClass !== 'function') {
      throw new Error(
        `Factory '${name}' at '${factoryPath}' is not a constructor (got ${typeof FactoryClass}).`
      );
    }

    const factory = new FactoryClass();

    if (!factory || typeof factory.createService !== 'function') {
      throw new Error(`Factory '${factoryPath}' must implement createService(serviceManager)`);
    }

    const instance = factory.createService(this);

    if (!instance) {
      throw new Error(`Factory '${factoryPath}' returned '${instance}' for service '${name}'`);
    }

    this.injectServiceManager(instance);

    if (cacheable) {
      this.services[name] = instance;
    }

    return instance;
  }

  /**
   * Create service from invokable
   */
  createFromInvokable(name, cacheable = true) {
    const path = global.applicationPath(this.invokables[name]);
    const ServiceClass = require(path);

    if (typeof ServiceClass !== 'function') {
      throw new Error(`Invokable '${name}' at '${path}' is not a constructor`);
    }

    const instance = new ServiceClass();

    if (!instance) {
      throw new Error(`Invokable '${name}' at '${path}' returned '${instance}'`);
    }

    this.injectServiceManager(instance);

    if (cacheable) {
      this.services[name] = instance;
    }

    return instance;
  }

  /**
   * Create service using abstract factories
   *
   * Supports ZF2-like signatures:
   * - canCreate(sm, requestedName) + createService(sm, requestedName)
   *
   * Also supports fallback:
   * - canCreate(sm, requestedName) + createService(sm)
   * - canCreate(sm, requestedName) + create(sm, requestedName)
   */
  _getAbstractFactoryInstance(afPathRaw) {
    if (this._abstractFactoryInstances.has(afPathRaw)) {
      return this._abstractFactoryInstances.get(afPathRaw);
    }

    const afPath = global.applicationPath(afPathRaw);
    const AFClass = require(afPath);

    if (typeof AFClass !== 'function') {
      this._abstractFactoryInstances.set(afPathRaw, null);
      return null;
    }

    const af = new AFClass();
    if (!af || typeof af.canCreate !== 'function') {
      this._abstractFactoryInstances.set(afPathRaw, null);
      return null;
    }

    this._abstractFactoryInstances.set(afPathRaw, af);
    return af;
  }

  createFromAbstractFactories(requestedName, cacheable = true) {
    if (!Array.isArray(this.abstractFactories) || this.abstractFactories.length === 0) {
      return null;
    }

    for (const afPathRaw of this.abstractFactories) {
      if (!afPathRaw) continue;

      const af = this._getAbstractFactoryInstance(afPathRaw);
      if (!af) continue;

      let canCreate = false;
      try {
        canCreate = !!af.canCreate(this, requestedName);
      } catch (e) {
        continue; // ignore faulty abstract factory
      }

      if (!canCreate) continue;

      let instance;

      try {
        if (typeof af.createService === 'function') {
          instance = (af.createService.length >= 2)
            ? af.createService(this, requestedName)
            : af.createService(this);
        } else if (typeof af.create === 'function') {
          instance = af.create(this, requestedName);
        } else {
          throw new Error(`No createService/create method`);
        }
      } catch (e) {
        throw new Error(`Abstract factory '${afPathRaw}' failed to create '${requestedName}': ${e.message}`);
      }

      if (!instance) {
        throw new Error(`Abstract factory '${afPathRaw}' returned '${instance}' for '${requestedName}'`);
      }

      this.injectServiceManager(instance);

      if (cacheable) {
        this.services[requestedName] = instance;
      }

      return instance;
    }

    return null;
  }

  has(name) {
    if (name === 'config' || name === 'Config') {
      return true;
    }

    if (this.invokables == null || this.factories == null || this.abstractFactories == null || this.aliases == null) {
      this.loadConfiguration();
    }

    const resolvedName = this.resolveName(name);

    // Cached?
    if (this.services[resolvedName]) return true;

    // Direct registrations?
    if (Object.prototype.hasOwnProperty.call(this.frameworkFactories, resolvedName)) return true;
    if (Object.prototype.hasOwnProperty.call(this.factories, resolvedName)) return true;
    if (Object.prototype.hasOwnProperty.call(this.invokables, resolvedName)) return true;

    // Abstract factories: ask if any can create (uses cached instances)
    if (Array.isArray(this.abstractFactories)) {
      for (const afPathRaw of this.abstractFactories) {
        if (!afPathRaw) continue;
        try {
          const af = this._getAbstractFactoryInstance(afPathRaw);
          if (af && af.canCreate(this, resolvedName)) {
            return true;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return false;
  }

  clearService(name) {
    const resolvedName = this.resolveName(name);
    delete this.services[resolvedName];
  }

  clearAllServices() {
    this.services = {};
  }

  getConfig() {
    return this.config;
  }
}

module.exports = ServiceManager;