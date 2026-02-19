const VarUtil = require('../../util/var-util');

class ServiceManager {

  constructor(config = {}) {
    this.config = config || {};
    this.services = {};
    this.controller = null;

    this.invokables = null;
    this.factories = null;
    this.abstractFactories = null;

    this.frameworkFactories = {
      "ViewManager": "/library/mvc/service/factory/view-manager-factory",
      "ViewHelperManager": "/library/mvc/service/factory/view-helper-manager-factory",
      "PluginManager": "/library/mvc/service/factory/plugin-manager-factory",
      "Application": "/library/mvc/service/factory/application-factory",
      "CacheManager": "/library/mvc/service/factory/cache-manager-factory",
      "Cache": "/library/mvc/service/factory/cache-factory"
    };

    this.nonCacheableServices = [
      "AuthenticationService",
      "ViewHelperManager",
      "PluginManager"
    ];
  }

  setController(controller) {
    this.controller = controller;
    return this;
  }

  getController() {
    return this.controller;
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
   * Main entry point
   */
  get(name) {

    if (name === 'Config' || name === 'config') {
      return this.config;
    }

    if (this.invokables == null || this.factories == null || this.abstractFactories == null) {
      this.loadConfiguration();
    }

    const cacheable = !this.nonCacheableServices.includes(name);

    // Return cached service if shared/cacheable
    if (cacheable && this.services[name]) {
      return this.services[name];
    }

    // Framework factories
    if (this.frameworkFactories.hasOwnProperty(name)) {
      return this.createFromFactory(name, true, cacheable);
    }

    // App factories
    if (this.factories.hasOwnProperty(name)) {
      return this.createFromFactory(name, false, cacheable);
    }

    // Invokables
    if (this.invokables.hasOwnProperty(name)) {
      return this.createFromInvokable(name, cacheable);
    }

    // ✅ Abstract factories (ZF2-style)
    const abstractInstance = this.createFromAbstractFactories(name, cacheable);
    if (abstractInstance) {
      return abstractInstance;
    }

    throw new Error(`Service '${name}' not found`);
  }

  loadConfiguration() {
    const serviceManagerObj = this.config.service_manager || {};

    this.invokables = serviceManagerObj.invokables || {};
    this.factories = serviceManagerObj.factories || {};

    // ✅ New: abstract factories list
    // Expected: array of module paths (strings)
    // e.g. [ '/library/db/adapter/adapter-abstract-service-factory' ]
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
    const factory = new FactoryClass();

    if (typeof factory.createService !== 'function') {
      throw new Error(
        `Factory '${factoryPath}' must implement createService(serviceManager)`
      );
    }

    const instance = factory.createService(this);

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

    const instance = new ServiceClass();

    this.injectServiceManager(instance);

    if (cacheable) {
      this.services[name] = instance;
    }

    return instance;
  }

  /**
   * ✅ Create service using abstract factories
   *
   * Supports ZF2-like signatures:
   * - canCreate(sm, requestedName) + createService(sm, requestedName)
   *
   * Also supports legacy/fallback signatures:
   * - canCreate(sm, requestedName) + createService(sm)
   * - canCreate(sm, requestedName) + create(sm, requestedName)
   */
  createFromAbstractFactories(requestedName, cacheable = true) {
    if (!Array.isArray(this.abstractFactories) || this.abstractFactories.length === 0) {
      return null;
    }

    for (const afPathRaw of this.abstractFactories) {
      if (!afPathRaw) continue;

      const afPath = global.applicationPath(afPathRaw);
      const AFClass = require(afPath);
      const af = new AFClass();

      // must be able to say if it can create
      if (typeof af.canCreate !== 'function') {
        continue;
      }

      let canCreate = false;
      try {
        canCreate = !!af.canCreate(this, requestedName);
      } catch (e) {
        // ignore faulty abstract factory
        continue;
      }

      if (!canCreate) continue;

      let instance;

      // preferred: createService(sm, requestedName)
      if (typeof af.createService === 'function') {
        try {
          if (af.createService.length >= 2) {
            instance = af.createService(this, requestedName);
          } else {
            // fallback: createService(sm)
            instance = af.createService(this);
          }
        } catch (e) {
          throw new Error(`Abstract factory '${afPathRaw}' failed to create '${requestedName}': ${e.message}`);
        }
      } else if (typeof af.create === 'function') {
        // alternate: create(sm, requestedName)
        try {
          instance = af.create(this, requestedName);
        } catch (e) {
          throw new Error(`Abstract factory '${afPathRaw}' failed to create '${requestedName}': ${e.message}`);
        }
      } else {
        throw new Error(
          `Abstract factory '${afPathRaw}' canCreate('${requestedName}') but has no createService/create method`
        );
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

    if (this.invokables == null || this.factories == null || this.abstractFactories == null) {
      this.loadConfiguration();
    }

    // Cached?
    if (this.services[name]) return true;

    // Direct registrations?
    if (this.frameworkFactories.hasOwnProperty(name)) return true;
    if (this.factories.hasOwnProperty(name)) return true;
    if (this.invokables.hasOwnProperty(name)) return true;

    // ✅ Abstract factories: ask if any can create
    if (Array.isArray(this.abstractFactories)) {
      for (const afPathRaw of this.abstractFactories) {
        if (!afPathRaw) continue;
        try {
          const AFClass = require(global.applicationPath(afPathRaw));
          const af = new AFClass();
          if (typeof af.canCreate === 'function' && af.canCreate(this, name)) {
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
    delete this.services[name];
  }

  clearAllServices() {
    this.services = {};
  }

  getConfig() {
    return this.config;
  }
}

module.exports = ServiceManager;