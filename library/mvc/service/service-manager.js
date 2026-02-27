// library/mvc/service/service-manager.js
const VarUtil = require('../../util/var-util');

class ServiceManager {

  constructor(config = {}, options = {}) {
    this.config = config || {};

    // parent container (for request-scoped containers)
    this.parent = options.parent || null;

    // Services that should be singleton per request-scope rather than shared with parent.
    this.scopedSingletonServices = Array.isArray(options.scopedSingletonServices)
      ? options.scopedSingletonServices
      : [];

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
      Cache: "/library/mvc/service/factory/cache-factory",
      EventManager: "/library/mvc/service/factory/event-manager-factory",
      MvcEvent: "/library/mvc/service/factory/mvc-event-factory"
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
   * Inject service manager if supported.
   * @param {object} instance
   * @param {ServiceManager} [creationContext] - optional SM to inject (ZF2 v3 "creation context")
   */
  injectServiceManager(instance, creationContext) {
    if (!instance) return instance;

    if (typeof instance.setServiceManager === 'function') {
      instance.setServiceManager(creationContext || this);
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
   * Main entry point.
   * @param {string} name
   * @param {ServiceManager} [creationContext] - the originating request-scoped SM (ZF2 v3 peering)
   */
  get(name, creationContext) {
    if (name === 'Config' || name === 'config') {
      return this.config;
    }

    if (this.invokables == null || this.factories == null || this.abstractFactories == null || this.aliases == null) {
      this.loadConfiguration();
    }

    const resolvedName = this.resolveName(name);
    const cacheable = !this.nonCacheableServices.includes(resolvedName);

    // In a request-scoped container, share cacheable services with parent by default,
    // except for services explicitly marked as scoped singletons.
    // Pass `this` (request-scoped SM) as creationContext so that services created by
    // the parent still get the request-scoped SM injected (ZF2 v3 peering pattern).
    if (this.parent && cacheable && !this.scopedSingletonServices.includes(resolvedName)) {
      return this.parent.get(resolvedName, creationContext || this);
    }

    // cached?
    if (cacheable && this.services[resolvedName]) {
      return this.services[resolvedName];
    }

    // Framework factories
    if (Object.prototype.hasOwnProperty.call(this.frameworkFactories, resolvedName)) {
      return this.createFromFactory(resolvedName, true, cacheable, creationContext);
    }

    // App factories
    if (Object.prototype.hasOwnProperty.call(this.factories, resolvedName)) {
      return this.createFromFactory(resolvedName, false, cacheable, creationContext);
    }

    // Invokables
    if (Object.prototype.hasOwnProperty.call(this.invokables, resolvedName)) {
      return this.createFromInvokable(resolvedName, cacheable, creationContext);
    }

    // Abstract factories (ZF2-style)
    const abstractInstance = this.createFromAbstractFactories(resolvedName, cacheable, creationContext);
    if (abstractInstance) {
      return abstractInstance;
    }

    if (this.parent) {
      return this.parent.get(resolvedName, creationContext);
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
   * Create service from factory.
   * @param {string} name
   * @param {boolean} isFramework
   * @param {boolean} cacheable
   * @param {ServiceManager} [creationContext] - request-scoped SM to pass to factory
   */
  createFromFactory(name, isFramework = false, cacheable = true, creationContext) {
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

    // Pass the creation context (request-scoped SM) to the factory so it can
    // access per-request services like MvcEvent. Falls back to `this`.
    const instance = factory.createService(creationContext || this);

    if (!instance) {
      throw new Error(`Factory '${factoryPath}' returned '${instance}' for service '${name}'`);
    }

    this.injectServiceManager(instance, creationContext);

    if (cacheable) {
      this.services[name] = instance;
    }

    return instance;
  }

  /**
   * Create service from invokable
   */
  createFromInvokable(name, cacheable = true, creationContext) {
    const path = global.applicationPath(this.invokables[name]);
    const ServiceClass = require(path);

    if (typeof ServiceClass !== 'function') {
      throw new Error(`Invokable '${name}' at '${path}' is not a constructor`);
    }

    const instance = new ServiceClass();

    if (!instance) {
      throw new Error(`Invokable '${name}' at '${path}' returned '${instance}'`);
    }

    this.injectServiceManager(instance, creationContext);

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

  createFromAbstractFactories(requestedName, cacheable = true, creationContext) {
    if (!Array.isArray(this.abstractFactories) || this.abstractFactories.length === 0) {
      return null;
    }

    const smForFactory = creationContext || this;

    for (const afPathRaw of this.abstractFactories) {
      if (!afPathRaw) continue;

      const af = this._getAbstractFactoryInstance(afPathRaw);
      if (!af) continue;

      let canCreate = false;
      try {
        canCreate = !!af.canCreate(smForFactory, requestedName);
      } catch (e) {
        continue; // ignore faulty abstract factory
      }

      if (!canCreate) continue;

      let instance;

      try {
        if (typeof af.createService === 'function') {
          instance = (af.createService.length >= 2)
            ? af.createService(smForFactory, requestedName)
            : af.createService(smForFactory);
        } else if (typeof af.create === 'function') {
          instance = af.create(smForFactory, requestedName);
        } else {
          throw new Error(`No createService/create method`);
        }
      } catch (e) {
        throw new Error(`Abstract factory '${afPathRaw}' failed to create '${requestedName}': ${e.message}`);
      }

      if (!instance) {
        throw new Error(`Abstract factory '${afPathRaw}' returned '${instance}' for '${requestedName}'`);
      }

      this.injectServiceManager(instance, creationContext);

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

  /**
   * Create a child ServiceManager that represents a single request scope.
   * - Cacheable services are shared with parent by default (delegated).
   * - Services listed in scopedSingletonServices are cached within the child.
   */
  createRequestScope(options = {}) {
    return new ServiceManager(this.config, {
      parent: this,
      scopedSingletonServices: options.scopedSingletonServices || ['MvcEvent']
    });
  }

  clearAllServices() {
    this.services = {};
  }

  getConfig() {
    return this.config;
  }
}

module.exports = ServiceManager;