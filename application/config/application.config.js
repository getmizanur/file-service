// application/config/application.config.js
const os = require('node:os');

module.exports = {
  // Router configuration - consolidated routing setup
  "router": require('./routes.config'),

  // Application routing mode configuration
  //
  // The framework supports two controller resolution modes:
  //
  // 1. Module mode (module_mode: true)
  //    Controllers are organised into module directories:
  //      {module_path}/{module}/controller/{controller}-controller.js
  //    Example: /application/module/admin/controller/home-controller.js
  //    When a route does not specify a module, default_module is used.
  //
  // 2. Single-module mode (module_mode: false, the default)
  //    All controllers live under a single flat directory:
  //      {controller_path}/{controller}-controller.js
  //    Example: /application/controller/home-controller.js
  //    The module property in route config is ignored.
  //
  // Shared defaults (both modes):
  //   default_controller – used when a route omits the controller (default: 'index')
  //   default_action     – used when a route omits the action    (default: 'index')
  //
  "application": {
    "module_mode": true,
    "default_module": 'admin',
    "module_path": '/application/module'
  },

  /* Single-module mode example:
  "application": {
    "module_mode": false,
    "default_controller": 'index',
    "default_action": 'index',
    "controller_path": '/application/controller',
  },*/

  // Cache configuration
  //
  // Two-tier caching architecture:
  //   frontend – cache strategy (currently "Core": simple key/value with TTL)
  //   backend  – storage engine (Redis by default, configurable via CACHE_BACKEND)
  //
  // All values are overridable via environment variables.
  // Set CACHE_ENABLED=false to disable caching entirely (useful for debugging).
  //
  "cache": {
    "enabled": process.env.CACHE_ENABLED !== 'false',
    "frontend": "Core",
    "backend": process.env.CACHE_BACKEND || "Redis",
    "frontend_options": {
      "automatic_serialization": true,      // serialize/deserialize JS objects transparently
      "lifetime": Number.parseInt(process.env.CACHE_LIFETIME) || 3600  // default TTL: 1 hour
    },
    "backend_options": {
      "host": process.env.REDIS_HOST || "localhost",
      "port": Number.parseInt(process.env.REDIS_PORT) || 6379,
      "password": process.env.REDIS_PASSWORD || null,
      "database": Number.parseInt(process.env.REDIS_DB) || 0,
      "key_prefix": process.env.REDIS_KEY_PREFIX || "file_service:"  // namespace to avoid key collisions
    }
  },

  // Session configuration
  //
  // Controls server-side session management. The session store is selected at
  // boot time via SESSION_STORE env var ("file" or "redis").
  //
  // Key behaviours:
  //   rolling: true   – the idle timeout resets on every request (keep-alive)
  //   resave: false   – only write to the store when the session actually changes
  //   saveUninitialized: false – don't create a session until something is stored
  //
  // Cookie flags default to secure-ish values for development. In production,
  // set SESSION_SECURE=true (requires HTTPS) and rotate SESSION_SECRET.
  //
  "session": {
    "enabled": process.env.SESSION_ENABLED !== 'false',
    "store": process.env.SESSION_STORE || "file",           // "file" (default) or "redis"
    "name": process.env.SESSION_NAME || "JSSESSIONID",      // cookie name sent to the browser
    "secret": process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    "resave": process.env.SESSION_RESAVE === 'true' || false,
    "saveUninitialized": process.env.SESSION_SAVE_UNINITIALIZED === 'true' || false,
    "rolling": process.env.SESSION_ROLLING !== 'false',     // reset idle timer on each request
    "cookie": {
      "maxAge": Number.parseInt(process.env.SESSION_MAX_AGE) || 3600000, // 1 hour
      "httpOnly": process.env.SESSION_HTTP_ONLY !== 'false',  // prevent client-side JS access
      "secure": process.env.SESSION_SECURE === 'true' || false, // true in production (HTTPS only)
      "sameSite": process.env.SESSION_SAME_SITE || 'lax',    // CSRF protection
      "path": process.env.SESSION_COOKIE_PATH || '/'
    },
    // Store options – resolved at boot via an IIFE so the right backend config
    // is selected once based on SESSION_STORE, without runtime branching.
    "store_options": (function () {
      const storeType = process.env.SESSION_STORE || "file";

      switch (storeType.toLowerCase()) {
        case 'redis':
          return {
            "host": process.env.REDIS_HOST || "localhost",
            "port": Number.parseInt(process.env.REDIS_PORT) || 6379,
            "password": process.env.REDIS_PASSWORD || undefined,
            "db": Number.parseInt(process.env.REDIS_DB) || 0,
            "prefix": process.env.REDIS_SESSION_PREFIX || "sess:",
            "ttl": Number.parseInt(process.env.REDIS_SESSION_TTL) || 3600
          };

        case 'file':
        default:
          return {
            "path": process.env.FILE_SESSION_PATH || globalThis.applicationPath('/tmp/sessions'),
            "ttl": Number.parseInt(process.env.FILE_SESSION_TTL) || 3600, // 1 hour
            "retries": Number.parseInt(process.env.FILE_SESSION_RETRIES) || 5,
            "factor": Number.parseInt(process.env.FILE_SESSION_FACTOR) || 1,
            "minTimeout": Number.parseInt(process.env.FILE_SESSION_MIN_TIMEOUT) || 50,
            "maxTimeout": Number.parseInt(process.env.FILE_SESSION_MAX_TIMEOUT) || 100,
            "fileExtension": process.env.FILE_SESSION_EXTENSION || '.json',
            "encoding": process.env.FILE_SESSION_ENCODING || 'utf8',
            "logFn": process.env.NODE_ENV === 'development' ? console.log : undefined // Logging only in development
          };
      }
    })(),
    // Session security – optional integrity checks layered on top of the store.
    //
    // When enabled, the framework signs the session ID with HMAC (algorithm + secret)
    // so tampered cookies are rejected. The optional validateUserAgent / validateIpAddress
    // flags bind the session to the client's fingerprint for extra hijack resistance
    // (may cause issues behind load balancers or with mobile clients that switch networks).
    //
    "security": {
      "enabled": process.env.SESSION_SECURITY_ENABLED !== 'false',
      "secret": process.env.SESSION_SECURITY_SECRET || process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
      "algorithm": process.env.SESSION_SECURITY_ALGORITHM || 'sha256',
      "signatureLength": Number.parseInt(process.env.SESSION_SIGNATURE_LENGTH) || 16,
      "validateUserAgent": process.env.SESSION_VALIDATE_USER_AGENT === 'true' || false,
      "validateIpAddress": process.env.SESSION_VALIDATE_IP === 'true' || false
    },

    /*
    * ALTERNATIVE STORE CONFIGURATIONS (for future reference):
    * 
    * Redis Store (connect-redis):
    * "store": "redis",
    * "store_options": {
    *     "host": process.env.REDIS_HOST || "localhost",
    *     "port": Number.parseInt(process.env.REDIS_PORT) || 6379,
    *     "password": process.env.REDIS_PASSWORD || null,
    *     "db": Number.parseInt(process.env.REDIS_DB) || 0,
    *     "prefix": process.env.REDIS_SESSION_PREFIX || "sess:",
    *     "ttl": Number.parseInt(process.env.REDIS_SESSION_TTL) || 3600,
    *     "logErrors": process.env.REDIS_LOG_ERRORS !== 'false'
    * }
    * 
    * MongoDB Store (connect-mongo):
    * "store": "mongodb",
    * "store_options": {
    *     "url": process.env.MONGODB_SESSION_URL || "mongodb://localhost:27017/sessions",
    *     "collection": process.env.MONGODB_SESSION_COLLECTION || "sessions",
    *     "expires": Number.parseInt(process.env.MONGODB_SESSION_EXPIRES) || 3600000,
    *     "touchAfter": Number.parseInt(process.env.MONGODB_TOUCH_AFTER) || 24 * 3600
    * }
    * 
    * MySQL Store (express-mysql-session):
    * "store": "mysql",
    * "store_options": {
    *     "host": process.env.MYSQL_HOST || "localhost",
    *     "port": Number.parseInt(process.env.MYSQL_PORT) || 3306,
    *     "user": process.env.MYSQL_USER || "root",
    *     "password": process.env.MYSQL_PASSWORD || "",
    *     "database": process.env.MYSQL_DATABASE || "sessions",
    *     "table": process.env.MYSQL_SESSION_TABLE || "sessions",
    *     "checkExpirationInterval": Number.parseInt(process.env.MYSQL_CHECK_EXPIRATION) || 900000,
    *     "expiration": Number.parseInt(process.env.MYSQL_SESSION_EXPIRATION) || 3600000,
    *     "createDatabaseTable": process.env.MYSQL_CREATE_TABLE !== 'false'
    * }
    * 
    * Memory Store (development only - not recommended for production):
    * "store": "memory",
    * "store_options": {}
    */
  },

  // Config caching
  //
  // When enabled, the bootstrapper calls compileRoutes() at boot to build a
  // Map<routePath, routeConfig> for O(1) route matching instead of iterating
  // the routes object on every request.
  //
  "config_cache": {
    "enabled": true,
    "route_key": "route_key"  // cache key used to store/retrieve the compiled route map
  },

  // Database configuration (PostgreSQL)
  //
  // The adapter is resolved by DbAdapter factory (see service_manager.factories).
  // Set DATABASE_ENABLED=false to start the app without a database connection
  // (useful for health-check-only deployments or local frontend work).
  //
  // Connection pool:
  //   "max" in connection – hard cap on total client connections (pg Pool level)
  //   "pool.min/max" in options – soft pool sizing hints for the query layer
  //
  // Set DATABASE_DEBUG=true to log every SQL query (development only).
  //
  "database": {
    "enabled": process.env.DATABASE_ENABLED !== 'false',
    "adapter": process.env.DATABASE_ADAPTER || "postgres",
    "connection": {
      "host": process.env.DATABASE_HOST || "localhost",
      "port": Number.parseInt(process.env.DATABASE_PORT) || 5432,
      "username": process.env.DATABASE_USER || "ubuntu",
      "password": process.env.DATABASE_PASSWORD || "ubuntu",
      "database": process.env.DATABASE_NAME || "fileservice",
      "ssl": process.env.DATABASE_SSL === 'true' || false,
      "connectionTimeoutMillis": Number.parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 30000,  // max wait to establish a new connection
      "idleTimeoutMillis": Number.parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,              // close idle clients after this period
      "max": Number.parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 20                             // max connections in the pool
    },
    "options": {
      "useNullAsDefault": true,
      "debug": process.env.DATABASE_DEBUG === 'true' || false,
      "pool": {
        "min": Number.parseInt(process.env.DATABASE_POOL_MIN) || 2,
        "max": Number.parseInt(process.env.DATABASE_POOL_MAX) || 10
      }
    }
    /*
    * ALTERNATIVE DATABASE CONFIGURATIONS (for future reference):
    * 
    * MySQL Configuration:
    * "adapter": "mysql",
    * "connection": {
    *     "host": process.env.DATABASE_HOST || "localhost",
    *     "port": Number.parseInt(process.env.DATABASE_PORT) || 3306,
    *     "user": process.env.DATABASE_USER || "root",
    *     "password": process.env.DATABASE_PASSWORD || "",
    *     "database": process.env.DATABASE_NAME || "dailypolitics_cms",
    *     "charset": process.env.DATABASE_CHARSET || "utf8mb4",
    *     "timezone": process.env.DATABASE_TIMEZONE || "UTC"
    * }
    * 
    * SQL Server Configuration:
    * "adapter": "sqlserver",
    * "connection": {
    *     "server": process.env.DATABASE_HOST || "localhost",
    *     "port": Number.parseInt(process.env.DATABASE_PORT) || 1433,
    *     "user": process.env.DATABASE_USER || "sa",
    *     "password": process.env.DATABASE_PASSWORD || "",
    *     "database": process.env.DATABASE_NAME || "dailypolitics_cms",
    *     "encrypt": process.env.DATABASE_ENCRYPT === 'true' || true,
    *     "trustServerCertificate": process.env.DATABASE_TRUST_CERT === 'true' || false
    * }
    * 
    * SQLite Configuration:
    * "adapter": "sqlite",
    * "connection": {
    *     "filename": process.env.DATABASE_PATH || globalThis.applicationPath('/data/database.db')
    * }
    */
  },

  // Event listeners
  //
  // Array of { event, listener } pairs. The listener value must match a key
  // registered in service_manager.invokables so the EventManager can resolve it.
  //
  "listeners": [
    {
      "event": "asset.changed",
      "listener": "AssetCacheInvalidationListener"
    },
    {
      "event": "dispatch.error",
      "listener": "ErrorLoggingListener"
    },
    {
      "event": "render.error",
      "listener": "ErrorLoggingListener"
    },
    {
      "event": "error",
      "listener": "ErrorLoggingListener"
    }
  ],

  // Service Manager configuration
  //
  // Registers application-level services. Framework services (ViewManager,
  // ViewHelperManager, PluginManager, EventManager, MvcEvent, etc.) are
  // registered internally by the ServiceManager bootstrap – only add
  // application-specific services here.
  //
  // invokables – simple classes: ServiceManager calls `new Class(options)`.
  //              The value is the module path relative to the project root.
  // factories  – classes that need custom construction logic: ServiceManager
  //              calls factory.createService(serviceManager) to build them.
  //
  "service_manager": {
    "invokables": {
      // Action services – orchestrate controller workflows (one per page/feature)
      "HomeActionService": '/application/service/action/home-action-service',
      "MyDriveActionService": '/application/service/action/my-drive-action-service',
      "RecentActionService": '/application/service/action/recent-action-service',
      "StarredActionService": '/application/service/action/starred-action-service',
      "SharedActionService": '/application/service/action/shared-action-service',
      "TrashActionService": '/application/service/action/trash-action-service',
      "SearchActionService": '/application/service/action/search-action-service',
      "FileActionService": '/application/service/action/file-action-service',
      "FolderActionService": '/application/service/action/folder-action-service',
      "LoginActionService": '/application/service/action/login-action-service',

      // Event listeners – react to framework lifecycle events
      "AssetCacheInvalidationListener": '/application/listener/asset-cache-invalidation-listener',
      "ErrorLoggingListener": '/application/listener/error-logging-listener',

      // Domain services – business logic and data access (shared across controllers)
      "FolderService": '/application/service/domain/folder-domain-service',
      "FolderStarService": '/application/service/domain/folder-star-domain-service',
      "FolderPermissionService": '/application/service/domain/folder-permission-domain-service',
      "FolderShareLinkService": '/application/service/domain/folder-share-link-domain-service',
      "FileStarService": '/application/service/domain/file-star-domain-service',
      "FilePermissionService": '/application/service/domain/file-permission-domain-service',
      "FileShareLinkService": '/application/service/domain/file-share-link-domain-service',
      "UserService": '/application/service/domain/user-domain-service',
      "FileMetadataService": '/application/service/domain/file-metadata-domain-service',
      "StorageService": '/application/service/domain/storage-domain-service',
      "DerivativeService": '/application/service/domain/derivative-domain-service',
      "UsageDailyService": '/application/service/domain/usage-daily-domain-service',
      "QueryCacheService": '/application/service/domain/query-cache-domain-service'
    },
    "factories": {
      "DbAdapter": '/library/db/adapter/adapter-service-factory',
      "AuthenticationService": "/application/service/factory/authentication-service-factory",
      "DerivativeOption": '/application/option/factory/derivative-option-factory',
      "StorageOption": '/application/option/factory/storage-option-factory'
    }
  },

  // Controller plugins
  //
  // Plugins are injected into every controller and available via this.plugin('name').
  // Framework plugins (flashMessenger, layout, params, redirect, url, etc.) are
  // registered internally by PluginManager – only add custom plugins here.
  //
  "controller_plugins": {
    "invokables": {
      "json": "/application/plugin/json-plugin",       // JSON response helper (sets headers + serializes)
      "opaqueId" : "/application/plugin/opaque-id-plugin" // generates opaque IDs for client-facing references
    }
  },

  // View helpers
  //
  // Callable in Nunjucks templates via {{ helperName(...) }}.
  // Framework helpers (form, formButton, etc.) are registered internally by
  // ViewHelperManager – only add custom application helpers here.
  //
  "view_helpers": {
    "invokables": {
      "onDemandCss": "/application/helper/on-demand-css-helper",
      "onDemandJs": "/application/helper/on-demand-js-helper",
      "newButton": "/application/helper/new-button-helper",
      "renderFolderTree": "/application/helper/render-folder-tree-helper",
      "fileList": "/application/helper/file-list-helper",
      "folderState": "/application/helper/folder-state-helper",
      "folderGrid": "/application/helper/folder-grid-helper",
      "folderList": "/application/helper/folder-list-helper",
      "fileGrid": "/application/helper/file-grid-helper",
      "errorDecorator": "/application/helper/error-decorator-helper",
      "paginationWidget": "/application/helper/pagination-helper",
      "listLayout": "/application/helper/list-layout-helper",
      "gridLayout": "/application/helper/grid-layout-helper",
      "profilerToolbar": "/application/helper/profiler-toolbar-helper",
      "breadcrumb": "/application/helper/breadcrumb-helper",
      "formImageButton": "/application/helper/form-image-button-helper"
    },
    "factories": {

    }
  },

  // Derivative (thumbnail/preview) generation options
  //
  // The DerivativeService generates thumbnails and previews for uploaded files.
  // For office documents it shells out to LibreOffice (soffice) to convert to
  // PDF/image first. If soffice_bin is null, the path is auto-detected from
  // common OS install locations.
  //
  "derivative_option": {
    "soffice_bin": process.env.SOFFICE_BIN || null,
  },

  // Storage upload configuration
  //
  // Controls how files are uploaded to S3 (or compatible) backends.
  //
  // multipart_threshold – files larger than this (in bytes) use multipart
  //                       upload instead of a single PutObject. Default: 50MB.
  // part_size           – size of each multipart part. Default: 10MB.
  // queue_size          – number of concurrent part uploads. Default: 4.
  //
  // These can be overridden per-backend via the storage_backend config JSON
  // column (upload.useMultipartAboveBytes). The backend-level value takes
  // precedence over these application-level defaults.
  //
  "storage_option": {
    "multipart_threshold": Number.parseInt(process.env.STORAGE_MULTIPART_THRESHOLD) || 52428800, // 50MB
    "part_size": Number.parseInt(process.env.STORAGE_PART_SIZE) || 10485760,                     // 10MB
    "queue_size": Number.parseInt(process.env.STORAGE_QUEUE_SIZE) || 4,
  },

  // View manager – template resolution and error page configuration
  //
  // template_map       – maps logical template names to absolute file paths.
  //                      The bootstrapper's resolveErrorTemplate() uses this
  //                      to locate 404/500 error pages.
  // template_path_stack – fallback directories searched when a template is not
  //                      found in template_map (searched in order).
  //
  // display_not_found_reason / display_exceptions – when true, error details
  // are shown on error pages. Keep false in production.
  //
  "view_manager": {
    "display_not_found_reason": process.env.VIEW_DISPLAY_NOT_FOUND_REASON === 'true' || false,
    "display_exceptions": process.env.VIEW_DISPLAY_EXCEPTIONS === 'true' || false,
    "doctype": process.env.VIEW_DOCTYPE || "HTML5",
    "not_found_template": process.env.VIEW_NOT_FOUND_TEMPLATE || "error/404",
    "exception_template": process.env.VIEW_EXCEPTION_TEMPLATE || "error/500",
    "template_map": {
      "layout/master": globalThis.applicationPath('/view/layout/master.njk'),
      "error/404": globalThis.applicationPath('/view/error/404.njk'),
      "error/500": globalThis.applicationPath('/view/error/500.njk')
    },
    "template_path_stack": [
      globalThis.applicationPath('/view')
    ]
  }
};
