// application/bootstrap.js
const path = require('path');

const Bootstrapper = require(
  global.applicationPath('/library/core/bootstrapper'));
const ClassUtil = require(
  global.applicationPath('/library/util/class-util'));
const ServiceManager = require(
  global.applicationPath('/library/mvc/service/service-manager'));
const Logger = require(
  global.applicationPath('/library/util/logger-util'));
const helmet = require('helmet');
const cookieSession = require('cookie-session');
const express = require('express');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const genuuid = require('uuid');
const session = require('express-session');
const compression = require('compression');
// body-parser is now built into Express 4.16+
const cookieParser = require('cookie-parser');

// Load environment variables from .env file
dotenv.config({
  path: path.join(__dirname, '../.env')
});

/**
 * Bootstrap - Application initialization and configuration
 * Extends the core Bootstrapper class to set up the Express application
 * Handles initialization of: configuration, session management, view
 * engine, helpers, and routing
 * Initialization order is critical - methods must be called in the
 * correct sequence
 * Supports multiple session stores: file, Redis, MongoDB, MySQL, and
 * memory
 * Integrates Nunjucks templating engine with view helpers
 * Sets up 404 error handling and static file serving
 *
 * IMPORTANT: The order of init functions matters!
 * Please put them in order of how they should be called.
 *
 * @extends Bootstrapper
 */
class Bootstrap extends Bootstrapper {

  /**
   * Constructor
   * Initializes the Bootstrap instance with Express app and service
   * manager
   * @param {express.Application} app - Express application instance
   * @param {ServiceManager|null} serviceManager - Service manager for
   *                                               dependency injection
   */
  constructor(app, serviceManager = null) {
    super();
    this.app = app;
    this.serviceManager = serviceManager;
    this.logger = null;
  }

  /**
   * Initialize application configuration
   * Sets up Express middleware for compression and body parsing
   * Uses Express built-in JSON and URL-encoded parsers (Express 4.16+)
   * Enables gzip compression for all responses
   * @returns {void}
   */
  initAppConfig() {
    // Use Express's built-in body parsing middleware
    // (available since Express 4.16)
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({
      extended: true
    }));
    this.app.use(cookieParser());
  }

  /**
   * Initialize security headers
   * Configures Helmet.js middleware for security best practices
   * Sets up Content Security Policy, XSS protection, and other security headers
   * Adjusts settings based on environment (development vs production)
   * @returns {void}
   */
  initSecurity() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Configure Content Security Policy
    this.app.use(helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrcAttr: ["'self'", "'unsafe-inline'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for inline scripts in Nunjucks templates
          "'unsafe-eval'",   // May be needed for some admin features
          "https://www.youtube.com",
          "https://www.google-analytics.com",
          "https://analytics.ahrefs.com",
          "https://ajax.googleapis.com",
          "https://stackpath.bootstrapcdn.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for inline styles
          "https://fonts.googleapis.com",
          "https://ajax.googleapis.com",
          "https://stackpath.bootstrapcdn.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "http:" // Allow images from any HTTPS/HTTP source
        ],
        frameSrc: [
          "'self'",
          "https://www.youtube.com", // Allow YouTube embeds
          "https://rumble.com",      // Allow Rumble embeds
          "https://odysee.com"       // Allow Odysee embeds
        ],
        connectSrc: ["'self'", "https://stackpath.bootstrapcdn.com", "https://www.google-analytics.com", "https://analytics.ahrefs.com"],
        formAction: ["'self'", "https://getform.io"], // Allow form submissions to getform.io
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null
      }
    }));

    // Protect against clickjacking (prevents admin panel from being embedded in iframe)
    this.app.use(helmet.frameguard({ action: 'deny' }));

    // Prevent browsers from MIME-sniffing
    this.app.use(helmet.noSniff());

    // Hide X-Powered-By header (don't reveal Express)
    this.app.use(helmet.hidePoweredBy());

    // Set Referrer-Policy
    this.app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));

    // Set X-Permitted-Cross-Domain-Policies
    // Note: This is NOT Permissions-Policy. This header is for Adobe products (Flash/Acrobat)
    this.app.use(helmet.permittedCrossDomainPolicies());

    // Set Permissions-Policy (modern replacement for Feature-Policy)
    this.app.use((req, res, next) => {
      res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=()'
      );
      next();
    });

    // DNS Prefetch Control
    this.app.use(helmet.dnsPrefetchControl({ allow: false }));

    // Strict-Transport-Security (HSTS) - only in production
    if (isProduction) {
      this.app.use(helmet.hsts({
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }));
      console.log('Strict-Transport-Security enabled (HTTPS enforced)');
    }

    console.log(`Security headers initialized (${isProduction ? 'production' : 'development'} mode)`);
  }

  /**
   * Initialize logging
   * Sets up file-based logging with daily rotation
   * Creates access and error logs in logs/ directory
   * Logs are named with date suffix: access-YYYY-MM-DD.log, error-YYYY-MM-DD.log
   * Automatically rotates logs at midnight
   * NOTE: Only access logging middleware is registered here.
   * Error logging middleware is registered in initErrorHandler() after routing.
   * @returns {void}
   */
  initLogging() {
    // Initialize logger
    this.logger = new Logger();

    // Access logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();

      // Capture response finish event
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logEntry = `${req.method} ${req.originalUrl || req.url} ` +
          `${res.statusCode} ${duration}ms - ${req.ip || req.socket?.remoteAddress || 'unknown'}`;
        this.logger.logAccess(logEntry);
      });

      next();
    });

    console.log('Logging initialized with daily rotation (access logging active)');
  }

  /**
   * Initialize session middleware
   * Loads session configuration from application config
   * Supports multiple session stores: file, Redis, MongoDB, MySQL,
   * memory
   * Configures session cookie settings (maxAge, httpOnly, secure,
   * sameSite)
   * Can be disabled via configuration (enabled: false)
   * Sets up proxy trust for secure cookie handling
   * @returns {void}
   */
  initSession() {
    const session = require('express-session');

    // Get session configuration from application config
    let sessionConfig = {};
    try {
      const config = this.getContainer().get('application');
      sessionConfig = config.session || {};
    } catch (error) {
      // Configuration not loaded yet, use require directly
      const appConfig = require('./config/application.config');
      sessionConfig = appConfig.session || {};
    }

    // Skip session initialization if disabled
    if (sessionConfig.enabled === false) {
      console.log(
        'Session middleware disabled via configuration');
      return;
    }

    this.app.set('trust proxy', 1); // trust first proxy

    // Build express-session configuration from our config
    const expressSessionConfig = {
      secret: sessionConfig.secret ||
        'your-secret-key-change-in-production',
      name: sessionConfig.name || 'JSSESSIONID',
      resave: sessionConfig.resave || false,
      saveUninitialized: sessionConfig.saveUninitialized || false,
      rolling: sessionConfig.rolling || false,
      proxy: true,
      cookie: sessionConfig.cookie || {
        maxAge: 3600000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'lax',
        path: '/'
      }
    };

    // Add store based on configuration
    const store = this.createSessionStore(sessionConfig);
    if (store) {
      expressSessionConfig.store = store;
    }

    // Apply session middleware
    this.app.use(session(expressSessionConfig));

    console.log(
      `Express session middleware initialized with ` +
      `${sessionConfig.store || 'memory'} store`);
  }

  /**
   * Create session store based on configuration
   * Factory method that creates appropriate session store instance
   * Supports: file, Redis, MongoDB, MySQL, and memory stores
   * Falls back to memory store if configured store is unavailable
   * Handles connection errors and logs warnings
   * @param {Object} sessionConfig - Session configuration object
   * @param {string} sessionConfig.store - Store type (file, redis,
   *                                       mongodb, mysql, memory)
   * @param {Object} sessionConfig.store_options - Store-specific
   *                                               options
   * @returns {Object|null} Session store instance or null for memory
   *                        store
   */
  createSessionStore(sessionConfig) {
    const storeType = sessionConfig.store || 'file';
    const storeOptions = sessionConfig.store_options || {};

    switch (storeType.toLowerCase()) {
      case 'file':
        try {
          const session = require('express-session');
          const FileStore = require('session-file-store')(
            session);

          // Clean up store options - remove logFn if it's
          // not a function
          const cleanOptions = {
            ...storeOptions
          };
          if (!cleanOptions.logFn ||
            typeof cleanOptions.logFn !== 'function') {
            delete cleanOptions.logFn;
          }

          console.log(
            'Using file-based session store with options:',
            cleanOptions);
          return new FileStore(cleanOptions);
        } catch (error) {
          console.warn(
            'File store not available, falling back to ' +
            'memory store:', error.message);
          return null;
        }

      case 'redis':
        try {
          const {
            RedisStore
          } = require('connect-redis');
          const {
            createClient
          } = require('redis');

          // Create Redis client
          const redisClient = createClient({
            url: storeOptions.url ||
              `redis://${storeOptions.host || 'localhost'}` +
              `:${storeOptions.port || 6379}`,
            password: storeOptions.password || undefined,
            database: storeOptions.db || 0,
            socket: {
              connectTimeout: storeOptions.connectTimeout || 10000,
              reconnectStrategy: (retries) => {
                if (retries > 10) {
                  console.error(
                    'Redis connection failed after ' +
                    '10 retries');
                  return new Error(
                    'Redis connection failed');
                }
                return Math.min(retries * 100, 3000);
              }
            }
          });

          // Connect to Redis
          redisClient.connect().catch((err) => {
            console.error('Redis connection error:', err);
          });

          redisClient.on('connect', () => {
            console.log(
              'Redis client connected successfully');
          });

          redisClient.on('error', (err) => {
            console.error('Redis client error:', err);
          });

          // Create RedisStore instance
          const store = new RedisStore({
            client: redisClient,
            prefix: storeOptions.prefix || 'sess:',
            ttl: storeOptions.ttl || 3600,
          });

          console.log(
            'Using Redis session store with options:', {
            url: storeOptions.url ||
              `redis://${storeOptions.host ||
              'localhost'}:${storeOptions.port ||
              6379}`,
            prefix: storeOptions.prefix || 'sess:',
            ttl: storeOptions.ttl || 3600
          });

          return store;
        } catch (error) {
          console.warn(
            'Redis store not available, falling back to ' +
            'memory store:', error.message);
          console.warn('Error stack:', error.stack);
          return null;
        }

      case 'mongodb':
        try {
          const MongoStore = require('connect-mongo');
          console.log(
            'Using MongoDB session store with options:',
            storeOptions);
          return MongoStore.create(storeOptions);
        } catch (error) {
          console.warn(
            'MongoDB store not available, falling back to ' +
            'memory store:', error.message);
          return null;
        }

      case 'mysql':
        try {
          const session = require('express-session');
          const MySQLStore = require('express-mysql-session')(
            session);
          console.log(
            'Using MySQL session store with options:',
            storeOptions);
          return new MySQLStore(storeOptions);
        } catch (error) {
          console.warn(
            'MySQL store not available, falling back to ' +
            'memory store:', error.message);
          return null;
        }

      case 'memory':
      default:
        console.log(
          'Using memory session store ' +
          '(not recommended for production)');
        // Use default MemoryStore (built into express-session)
        return null;
    }
  }

  /**
   * Initialize application configuration registry
   * Loads application.config.js and stores in registry
   * Extracts and registers routing configuration
   * Makes configuration accessible to the entire application
   * Sets up the container for dependency injection
   * @returns {void}
   */
  initConfig() {
    const appConfig = require('./config/application.config');

    if (!this.serviceManager) {
      this.serviceManager = new ServiceManager(appConfig);
    } else {
      if (typeof this.serviceManager.setConfig === 'function') {
        this.serviceManager.setConfig(appConfig);
      } else {
        this.serviceManager.config = appConfig;
      }
    }

    this.setServiceManager(this.serviceManager);
    this.setRoutes(appConfig.router.routes);
  }

  /**
   * Initialize view engine and template system
   * Configures Nunjucks templating engine with Express
   * Sets up view helpers through ViewHelperManager
   * Registers date filter and custom view helpers
   * Enables template auto-reloading in development
   * Makes view helpers globally available in templates
   * Ensures request-scoped helper instances for proper routing
   * context
   * @returns {void}
   */
  initView() {
    const nunjucks = require('nunjucks');
    this.app.set('view engine', nunjucks);

    var env = nunjucks.configure([path.resolve('view')], {
      autoescape: false,
      express: this.app,
      watch: true,
      nocache: true
    });

    // Add date filter
    const dateFilter = require('nunjucks-date-filter');
    env.addFilter('date', dateFilter);

    this.app.use((req, res, next) => {
      res.locals.masterTemplate = 'layout/master.njk'
      // Make request.url available to templates for canonical URL
      res.locals.request = {
        url: req.url
      };
      next();
    });

    // Register view helpers from configuration using
    // ViewHelperManager
    // Get ViewHelperManager from ServiceManager
    // (uses factory pattern)
    const viewHelperManager = this.serviceManager.get(
      'ViewHelperManager');

    // Store the nunjucks env in global for controller access
    global.nunjucksEnv = env;

    // Get all available helper names
    const helperNames = viewHelperManager.getAvailableHelpers();
    console.log('Available helpers:', helperNames);

    // Store reference to serviceManager for use in helper closure
    const serviceManager = this.serviceManager;

    // Register each helper directly on env.globals for template
    // access
    // Templates can use {{ headTitle() }} directly
    helperNames.forEach(helperName => {
      env.addGlobal(helperName, function (...args) {
        // Get FRESH ViewHelperManager from ServiceManager
        // each time
        // This ensures we get the request-scoped instance
        // with current RouteMatch
        const currentViewHelperManager = serviceManager.get(
          'ViewHelperManager');

        // Get the helper instance from ViewHelperManager
        const helperInstance = currentViewHelperManager.get(
          helperName);

        // Set the nunjucks context on the helper
        helperInstance.setContext(this);
        // IMPORTANT: pass Nunjucks ctx as FINAL argument
        return helperInstance.render(...args, this);
        //                                     ^^^ this =
        //                                     Nunjucks ctx
      });
    });
  }

  /**
   * Initialize static asset serving
   * Configures Express to serve static files from public directory
   * Enables direct access to CSS, JavaScript, images, and other
   * static assets
   * @returns {void}
   */
  initHelper() {
    //this.app.use(express.static('public'));
    this.app.use(express.static(path.join(__dirname, "../public")));
  }

  /**
   * Initialize application routing
   * Mounts all routes from configuration
   * Sets up dispatcher middleware for MVC routing
   * Adds 404 error handler as catch-all route
   * Resolves and renders custom 404 error template
   * Falls back to basic HTML error page if template resolution
   * fails
   * @returns {void}
   */
  initRouter() {
    // Mount routers
    const router = this.getRoutes();
    for (let key in router) {
      if (router[key].hasOwnProperty('route')) {
        this.app.all(router[key].route,
          async (req, res, next) =>
            this.dispatcher(req, res, next));
      }
    }

    // Add 404 handler middleware (must be after all other routes)
    this.app.use((req, res, next) => {
      try {
        // Resolve 404 template path using framework-level
        // error handling
        const errorTemplateInfo = this.resolveErrorTemplate(
          '404');
        const templatePath = errorTemplateInfo.templatePath;

        const templateData = {
          pageTitle: 'Page Not Found',
          errorCode: 404,
          errorMessage: 'The page you are looking for could not be ' +
            'found.'
        };

        // Set 404 status and render template directly
        // (no MVC overhead)
        res.status(404);
        res.render(templatePath, templateData);
      } catch (error) {
        // If error template resolution fails, send basic
        // error response
        console.error(
          'Error template resolution failed:',
          error.message);
        res.status(404).send(`
                    <h1>404 - Page Not Found</h1>
                    <p>The page you are looking for could not be found.</p>
                    <hr>
                    <p><strong>Developer Note:</strong> ${error.message}</p>
                `);
      }
    });
  }

  /**
   * Initialize error handler middleware
   * MUST be called after initRouter() to properly catch route errors
   * Registers Express error handling middleware (4-parameter signature)
   * Logs all errors to error-YYYY-MM-DD.log files
   * Passes errors to next handler for rendering/response
   * @returns {void}
   */
  initErrorHandler() {
    // Error logging middleware - MUST have 4 parameters to be recognized as error handler
    // MUST be registered AFTER all routes to catch errors
    this.app.use((err, req, res, next) => {
      // Log error with stack trace
      if (this.logger) {
        this.logger.logError(err);
      } else {
        // Fallback if logger not initialized
        console.error('Error occurred but logger not initialized:', err);
      }

      // Pass error to next error handler (if any)
      next(err);
    });

    console.log('Error handler middleware registered (error logging active)');
  }
}

module.exports = Bootstrap;
