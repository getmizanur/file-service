/**
 * PluginManager - Manages controller plugin registration and instantiation
 * Provides centralized plugin management with framework and application
 * plugin support
 * Framework plugins (flashMessenger, redirect, url, params, layout, session)
 * are built-in and always available
 * Application plugins can be registered via configuration and extend
 * controller functionality
 * Implements lazy-loading pattern for plugin instantiation
 * Inspired by Zend Framework's plugin manager pattern
 */
class PluginManager {

  /**
   * Constructor
   * Initializes plugin manager with framework and application plugins
   * Framework plugins are hardcoded and always available
   * Application plugins are loaded from configuration
   * @param {Object} options - Configuration options
   * @param {BaseController} options.controller - Controller instance
   * @param {Object} options.config - Application configuration
   */
  constructor(options = {}) {
    this.controller = options.controller || null;
    this.config = options.config || null;

    this.plugins = {};

    // Framework plugins that should not be modified by developers
    this.frameworkPlugins = {
      "invokables": {
        "flashMessenger": {
          "class": "/library/mvc/controller/plugin/flash-messenger",
          "options": {}
        },
        "layout": {
          "class": "/library/mvc/controller/plugin/layout",
          "options": {}
        },
        "params": {
          "class": "/library/mvc/controller/plugin/params",
          "options": {}
        },
        "redirect": {
          "class": "/library/mvc/controller/plugin/redirect",
          "options": {}
        },
        "url": {
          "class": "/library/mvc/controller/plugin/url",
          "options": {}
        },
        "session": {
          "class": "/library/mvc/controller/plugin/session",
          "options": {}
        }
      },
      "factories": {}
    };

    // Load application plugins from configuration
    this.invokableClasses = this.getAllPlugins();
  }

  /**
   * Set application configuration
   * Updates configuration and reloads plugin definitions
   * Allows runtime configuration changes
   * @param {Object} config - Application configuration object
   * @returns {PluginManager} This manager for method chaining
   */
  setConfig(config) {
    this.config = config;
    // Reload plugins when config is set
    this.invokableClasses = this.getAllPlugins();
    return this;
  }

  /**
   * Get all plugins (framework + application) merged together
   * Framework plugins take precedence over application plugins with
   * same name
   * Merges framework and application plugin configurations
   * Validates and warns about naming conflicts
   * @returns {Object} Combined plugin configuration object with all
   *                   available plugins
   */
  getAllPlugins() {
    // Start with framework plugins
    let allPlugins = {
      ...this.frameworkPlugins.invokables
    };

    // Add application plugins from config
    const applicationPlugins =
      this.loadApplicationPluginsFromConfig();

    // Warn about conflicts and merge
    this.validateApplicationPlugins(applicationPlugins);
    Object.assign(allPlugins, applicationPlugins);

    return allPlugins;
  }

  /**
   * Load application controller plugins from configuration only
   * Reads controller_plugins.invokables from application config
   * Supports both string format (class path) and object format
   * (class + description)
   * Normalizes configuration to internal format
   * @returns {Object} Application plugin configuration object
   *                   (empty object if no config or error)
   */
  loadApplicationPluginsFromConfig() {
    try {
      if(!this.config) {
        return {};
      }

      const controllerPlugins =
        this.config?.controller_plugins?.invokables || {};

      // Convert config format to internal format
      const plugins = {};
      Object.entries(controllerPlugins).forEach(
        ([pluginName, pluginConfig]) => {
          // Handle both old string format and new object
          // format
          const pluginClass =
            typeof pluginConfig === 'string' ?
            pluginConfig : pluginConfig.class;
          const pluginDescription =
            typeof pluginConfig === 'object' ?
            pluginConfig.description :
            'Custom application plugin';

          plugins[pluginName] = {
            class: pluginClass,
            description: pluginDescription
          };
        });

      return plugins;
    } catch (error) {
      console.warn(
        'Could not load application controller plugins ' +
        'from config:', error.message);
      return {};
    }
  }

  /**
   * Validate application plugins and warn about conflicts with
   * framework plugins
   * Checks if any application plugins have same name as framework
   * plugins
   * Logs warning to console if conflicts detected (application
   * plugins override)
   * @param {Object} applicationPlugins - Application plugin
   *                                      configuration
   * @returns {void}
   */
  validateApplicationPlugins(applicationPlugins) {
    const conflicts = Object.keys(applicationPlugins).filter(name =>
      this.frameworkPlugins.invokables.hasOwnProperty(name)
    );

    if(conflicts.length > 0) {
      console.warn(
        `Warning: Application plugins override framework ` +
        `plugins: ${conflicts.join(', ')}`);
    }
  }

  /**
   * Set controller instance
   * Injects the controller that plugins will operate on
   * All plugins instantiated by this manager will receive this
   * controller
   * @param {BaseController} controller - Controller instance
   * @returns {PluginManager} This manager for method chaining
   */
  setController(controller) {
    //if(!(controller instanceof BaseController)) {
    //    throw new Error(
    //        'The class is not a BaseController instance.');
    //}

    this.controller = controller;

    return this;
  }

  /**
   * Get controller instance
   * Returns the controller that plugins operate on
   * @returns {BaseController|null} Controller instance or null if
   *                                 not set
   */
  getController() {
    return this.controller;
  }

  /**
   * Get plugin instance by name
   * Implements lazy-loading pattern - plugins are only instantiated
   * when first requested
   * Cached instances are returned on subsequent calls
   * Supports both absolute paths (with /) and relative paths
   * Automatically injects controller into plugin instance
   * @param {string} name - Plugin name (e.g., 'redirect', 'url',
   *                        'flashMessenger')
   * @param {Object} options - Plugin-specific options passed to
   *                           constructor
   * @returns {BasePlugin|null} Plugin instance or null if not found
   *                            or error
   */
  get(name, options = {}) {
    if(!this.invokableClasses.hasOwnProperty(name)) {
      console.warn(
        `Controller plugin '${name}' not found in ` +
        `configuration`);
      return null;
    }

    if(this.plugins[name] == undefined) {
      try {
        const pluginConfig = this.invokableClasses[name];
        const pluginPath =
          typeof pluginConfig === 'string' ?
          pluginConfig : pluginConfig.class;

        // Use global.applicationPath for absolute paths,
        // otherwise relative require
        const requirePath = pluginPath.startsWith('/') ?
          global.applicationPath(pluginPath) :
          pluginPath;

        const Instance = require(requirePath);
        let plugin = new Instance(options);
        plugin.setController(this.getController());

        this.plugins[name] = plugin;
      } catch (error) {
        console.error(
          `Error loading controller plugin '${name}':`,
          error.message);
        return null;
      }
    }

    return this.plugins[name];
  }

  /**
   * Get list of available plugins
   * Returns array of all registered plugin names (framework +
   * application)
   * Useful for debugging and documentation
   * @returns {Array<string>} Array of plugin names
   */
  getAvailablePlugins() {
    return Object.keys(this.invokableClasses);
  }

  /**
   * Check if plugin is available
   * Checks if a plugin with given name is registered
   * Does not instantiate the plugin
   * @param {string} name - Plugin name
   * @returns {boolean} True if plugin is registered, false otherwise
   */
  hasPlugin(name) {
    return this.invokableClasses.hasOwnProperty(name);
  }

  /**
   * Get plugin configuration info
   * Returns metadata about a plugin without instantiating it
   * Useful for debugging and documentation
   * @param {string} name - Plugin name
   * @returns {Object|null} Plugin configuration object with name,
   *                        class path, and description, or null if
   *                        not found
   */
  getPluginInfo(name) {
    const pluginConfig = this.invokableClasses[name];
    if(!pluginConfig) {
      return null;
    }

    return {
      name: name,
      class: typeof pluginConfig === 'string' ?
        pluginConfig : pluginConfig.class,
      description: typeof pluginConfig === 'object' ?
        pluginConfig.description : 'No description available'
    };
  }

}

module.exports = PluginManager;