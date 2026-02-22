/**
 * PluginManager - Manages controller plugin registration and instantiation
 *
 * Clean architecture:
 * - Framework plugins are built-in and not overridable by application config
 *   unless explicitly allowed.
 * - Application plugins are loaded from config (controller_plugins.invokables).
 * - get(name) returns a cached singleton plugin instance.
 * - build(name, options) returns a new plugin instance (no caching).
 * - Controller is injected into plugin instances via setController().
 * - Optional lifecycle hooks: preDispatch/postDispatch.
 */
class PluginManager {

  /**
   * @param {Object} options
   * @param {BaseController} options.controller
   * @param {Object} options.config
   * @param {boolean} options.allowOverrideFrameworkPlugins (default: false)
   */
  constructor(options = {}) {
    this.controller = options.controller || null;
    this.config = options.config || null;

    // whether app config may override framework plugin names
    this.allowOverrideFrameworkPlugins = !!options.allowOverrideFrameworkPlugins;

    this.plugins = {}; // cached instances

    // Framework plugins (built-in)
    this.frameworkPlugins = {
      invokables: {
        flashMessenger: { class: "/library/mvc/controller/plugin/flash-messenger", options: {} },
        layout: { class: "/library/mvc/controller/plugin/layout", options: {} },
        params: { class: "/library/mvc/controller/plugin/params", options: {} },
        redirect: { class: "/library/mvc/controller/plugin/redirect", options: {} },
        url: { class: "/library/mvc/controller/plugin/url", options: {} },
        session: { class: "/library/mvc/controller/plugin/session", options: {} }
      },
      factories: {}
    };

    this.invokableClasses = this.getAllPlugins();
  }

  setConfig(config) {
    this.config = config;
    this.invokableClasses = this.getAllPlugins();

    // do not clear cache automatically; callers may choose
    return this;
  }

  /**
   * If you want to reload config and drop existing plugin singletons.
   */
  reset() {
    this.plugins = {};
    this.invokableClasses = this.getAllPlugins();
    return this;
  }

  /**
   * Merge framework + app plugins.
   * Default behavior: framework wins (not overridable).
   */
  getAllPlugins() {
    const framework = { ...this.frameworkPlugins.invokables };
    const app = this.loadApplicationPluginsFromConfig();

    const conflicts = Object.keys(app).filter(name =>
      Object.prototype.hasOwnProperty.call(framework, name)
    );

    if (conflicts.length > 0 && !this.allowOverrideFrameworkPlugins) {
      console.warn(
        `Warning: Application plugins attempted to override framework plugins ` +
        `(${conflicts.join(', ')}). Overrides are disabled; framework plugins will be used.`
      );
      // remove conflicting app plugins
      conflicts.forEach(name => { delete app[name]; });
    } else if (conflicts.length > 0 && this.allowOverrideFrameworkPlugins) {
      console.warn(
        `Warning: Application plugins override framework plugins: ${conflicts.join(', ')}`
      );
    }

    // framework first, then (possibly filtered) app
    return { ...framework, ...app };
  }

  /**
   * Reads controller_plugins.invokables from config.
   * Supports:
   * - string: "path/to/plugin"
   * - object: { class: "...", description: "...", options: {...} }
   */
  loadApplicationPluginsFromConfig() {
    try {
      if (!this.config) return {};

      const controllerPlugins = this.config?.controller_plugins?.invokables || {};

      const plugins = {};
      Object.entries(controllerPlugins).forEach(([pluginName, pluginConfig]) => {
        const pluginClass =
          (typeof pluginConfig === 'string')
            ? pluginConfig
            : pluginConfig?.class;

        if (!pluginClass) return;

        plugins[pluginName] = {
          class: pluginClass,
          description:
            (typeof pluginConfig === 'object' && pluginConfig?.description)
              ? pluginConfig.description
              : 'Custom application plugin',
          options:
            (typeof pluginConfig === 'object' && pluginConfig?.options)
              ? pluginConfig.options
              : {}
        };
      });

      return plugins;
    } catch (error) {
      console.warn(
        'Could not load application controller plugins from config:',
        error.message
      );
      return {};
    }
  }

  setController(controller) {
    this.controller = controller;

    // Update controller on cached plugins too
    Object.values(this.plugins).forEach((plugin) => {
      if (plugin && typeof plugin.setController === 'function') {
        plugin.setController(controller);
      }
    });

    return this;
  }

  getController() {
    return this.controller;
  }

  /**
   * Cached singleton retrieval (ZF-like get()).
   * If you need per-call options, use build(name, options).
   */
  get(name, options = {}) {
    if (!Object.prototype.hasOwnProperty.call(this.invokableClasses, name)) {
      console.warn(`Controller plugin '${name}' not found in configuration`);
      return null;
    }

    if (this.plugins[name] == null) {
      const plugin = this._createPluginInstance(name, options);
      if (!plugin) return null;
      this.plugins[name] = plugin;
    }

    return this.plugins[name];
  }

  /**
   * Build a new instance every time (no caching).
   * Useful when options differ per call.
   */
  build(name, options = {}) {
    if (!Object.prototype.hasOwnProperty.call(this.invokableClasses, name)) {
      console.warn(`Controller plugin '${name}' not found in configuration`);
      return null;
    }

    return this._createPluginInstance(name, options);
  }

  _createPluginInstance(name, options = {}) {
    try {
      const pluginConfig = this.invokableClasses[name];

      const pluginPath =
        (typeof pluginConfig === 'string')
          ? pluginConfig
          : pluginConfig.class;

      const defaultOptions =
        (typeof pluginConfig === 'object' && pluginConfig.options)
          ? pluginConfig.options
          : {};

      const mergedOptions = { ...defaultOptions, ...(options || {}) };

      const requirePath = pluginPath.startsWith('/')
        ? global.applicationPath(pluginPath)
        : pluginPath;

      const Instance = require(requirePath);
      const plugin = new Instance(mergedOptions);

      if (plugin && typeof plugin.setController === 'function') {
        plugin.setController(this.getController());
      }

      return plugin;
    } catch (error) {
      console.error(`Error loading controller plugin '${name}':`, error.message);
      return null;
    }
  }

  getAvailablePlugins() {
    return Object.keys(this.invokableClasses);
  }

  hasPlugin(name) {
    return Object.prototype.hasOwnProperty.call(this.invokableClasses, name);
  }

  getPluginInfo(name) {
    const pluginConfig = this.invokableClasses[name];
    if (!pluginConfig) return null;

    return {
      name,
      class: (typeof pluginConfig === 'string') ? pluginConfig : pluginConfig.class,
      description: (typeof pluginConfig === 'object' && pluginConfig.description)
        ? pluginConfig.description
        : 'No description available'
    };
  }

  /**
   * Lifecycle helper: call preDispatch on all cached plugins
   */
  preDispatchAll() {
    Object.values(this.plugins).forEach((plugin) => {
      if (plugin && typeof plugin.preDispatch === 'function') {
        try { plugin.preDispatch(); } catch (e) {
          console.debug('PluginManager.preDispatch: plugin error:', e.message);
        }
      }
    });
  }

  /**
   * Lifecycle helper: call postDispatch on all cached plugins
   */
  postDispatchAll() {
    Object.values(this.plugins).forEach((plugin) => {
      if (plugin && typeof plugin.postDispatch === 'function') {
        try { plugin.postDispatch(); } catch (e) {
          console.debug('PluginManager.postDispatch: plugin error:', e.message);
        }
      }
    });
  }
}

module.exports = PluginManager;