// library/core/application.js
const VarUtil = require('../util/var-util');
const express = require('express');

class Application {

  /**
   * @param {object} config
   * @param {ServiceManager|null} serviceManager
   * @param {object} options
   *  - expressApp: provide an existing express app (tests / embedding)
   *  - configProvider: function that returns config (lazy load)
   *  - bootstrapClassPath: override bootstrap class location
   */
  constructor(config = {}, serviceManager = null, options = {}) {
    this.app = options.expressApp || express();

    this.config = config || {};
    this.serviceManager = serviceManager || null;

    // Dependency injection hooks (remove hard-coded require)
    this.configProvider = (typeof options.configProvider === 'function')
      ? options.configProvider
      : null;

    this.bootstrapClassPath = options.bootstrapClassPath || '/application/bootstrap';

    this._bootstrap = null;

    this.routeMatch = null;
    this.request = null;
    this.response = null;
  }

  /**
   * Lazily create Bootstrap and execute init resources.
   *
   * @param {string|string[]|null} resource
   *  - null: run all init* methods (legacy behaviour)
   *  - string: run a specific init method (e.g. "initRoutes")
   *  - array: run multiple init methods
   */
  bootstrap(resource = null) {
    if (this._bootstrap == null) {
      const Bootstrap = require(global.applicationPath(this.bootstrapClassPath));
      this._bootstrap = new Bootstrap(this.app, this.serviceManager);
    }

    // Which init resources to run?
    const allResources = this._bootstrap
      .getClassResources(this._bootstrap)
      .filter((item) => item.match(/^init/g));

    let resourcesToRun = allResources;

    if (Array.isArray(resource)) {
      resourcesToRun = resource;
    } else if (typeof resource === 'string' && resource.length > 0) {
      resourcesToRun = [resource];
    }

    // Run them in order; ignore unknown names quietly
    for (const resourceName of resourcesToRun) {
      if (!allResources.includes(resourceName)) continue;
      this._bootstrap._executeResources(resourceName);
    }

    return this;
  }

  /**
   * Get config with a clean fallback chain:
   * 1) existing this.config if non-empty
   * 2) serviceManager.get('Config') if available
   * 3) options.configProvider() if provided
   * 4) legacy hard-coded require (last resort)
   */
  getConfig() {
    if (!VarUtil.empty(this.config)) {
      return this.config;
    }

    // Prefer SM Config service (cleanest)
    try {
      if (this.serviceManager && typeof this.serviceManager.get === 'function') {
        const cfg = this.serviceManager.get('Config');
        if (cfg && typeof cfg === 'object') {
          this.config = cfg;
          return this.config;
        }
      }
    } catch (e) {
      console.debug('Application.getConfig: ServiceManager config lookup failed:', e.message);
    }

    // Next: injected provider
    if (this.configProvider) {
      try {
        const cfg = this.configProvider();
        if (cfg && typeof cfg === 'object') {
          this.config = cfg;
          return this.config;
        }
      } catch (e) {
        console.debug('Application.getConfig: configProvider failed:', e.message);
      }
    }

    // Legacy fallback (kept for backward compatibility)
    this.config = require('../../application/config/application.config');
    return this.config;
  }

  setConfig(config = {}) {
    this.config = config || {};
    return this;
  }

  getServiceManager() {
    return this.serviceManager;
  }

  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    return this;
  }

  getBootstrap() {
    return this._bootstrap;
  }

  /**
   * Return the underlying express app (useful for tests/integration)
   */
  getExpressApp() {
    return this.app;
  }

  /**
   * Run application.
   * Ensures bootstrap exists first.
   */
  run() {
    if (!this._bootstrap) {
      this.bootstrap();
    }
    this.getBootstrap().run();
  }

  // ----------------------------
  // Route / Request / Response context
  // ----------------------------

  getRouteMatch() {
    return this.routeMatch;
  }

  setRouteMatch(routeMatch) {
    this.routeMatch = routeMatch;
    return this;
  }

  getRequest() {
    return this.request;
  }

  setRequest(request) {
    this.request = request;
    return this;
  }

  getResponse() {
    return this.response;
  }

  setResponse(response) {
    this.response = response;
    return this;
  }
}

module.exports = Application;