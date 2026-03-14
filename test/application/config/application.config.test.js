const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

describe('application.config', () => {
  let config;

  beforeEach(() => {
    // Clear the module cache so env var changes take effect
    const configPath = globalThis.applicationPath('/application/config/application.config');
    delete require.cache[require.resolve(configPath)];

    // Also clear routes.config cache since it's required by application.config
    try {
      const routesPath = globalThis.applicationPath('/application/config/routes.config');
      delete require.cache[require.resolve(routesPath)];
    } catch {
      // routes.config may not be cached yet
    }

    config = require(configPath);
  });

  describe('top-level keys', () => {
    it('has router key', () => {
      expect(config).toHaveProperty('router');
    });

    it('has cache key', () => {
      expect(config).toHaveProperty('cache');
    });

    it('has session key', () => {
      expect(config).toHaveProperty('session');
    });

    it('has database key', () => {
      expect(config).toHaveProperty('database');
    });

    it('has service_manager key', () => {
      expect(config).toHaveProperty('service_manager');
    });

    it('has controller_plugins key', () => {
      expect(config).toHaveProperty('controller_plugins');
    });

    it('has view_helpers key', () => {
      expect(config).toHaveProperty('view_helpers');
    });

    it('has derivative_option key', () => {
      expect(config).toHaveProperty('derivative_option');
    });

    it('has view_manager key', () => {
      expect(config).toHaveProperty('view_manager');
    });
  });

  describe('cache', () => {
    it('has enabled property', () => {
      expect(config.cache).toHaveProperty('enabled');
    });

    it('has frontend property', () => {
      expect(config.cache.frontend).toBe('Core');
    });

    it('has backend property', () => {
      expect(config.cache).toHaveProperty('backend');
    });

    it('has frontend_options', () => {
      expect(config.cache).toHaveProperty('frontend_options');
      expect(config.cache.frontend_options).toHaveProperty('automatic_serialization');
      expect(config.cache.frontend_options).toHaveProperty('lifetime');
    });

    it('has backend_options', () => {
      expect(config.cache).toHaveProperty('backend_options');
      expect(config.cache.backend_options).toHaveProperty('host');
      expect(config.cache.backend_options).toHaveProperty('port');
    });
  });

  describe('session', () => {
    it('has enabled property', () => {
      expect(config.session).toHaveProperty('enabled');
    });

    it('has store property', () => {
      expect(config.session).toHaveProperty('store');
    });

    it('has name property', () => {
      expect(config.session).toHaveProperty('name');
    });

    it('has secret property', () => {
      expect(config.session).toHaveProperty('secret');
    });

    it('has cookie sub-object', () => {
      expect(config.session).toHaveProperty('cookie');
      expect(config.session.cookie).toHaveProperty('maxAge');
      expect(config.session.cookie).toHaveProperty('httpOnly');
      expect(config.session.cookie).toHaveProperty('secure');
      expect(config.session.cookie).toHaveProperty('sameSite');
      expect(config.session.cookie).toHaveProperty('path');
    });
  });

  describe('database', () => {
    it('has enabled property', () => {
      expect(config.database).toHaveProperty('enabled');
    });

    it('has adapter property', () => {
      expect(config.database).toHaveProperty('adapter');
    });

    it('has connection sub-object', () => {
      expect(config.database).toHaveProperty('connection');
      expect(config.database.connection).toHaveProperty('host');
      expect(config.database.connection).toHaveProperty('port');
      expect(config.database.connection).toHaveProperty('username');
      expect(config.database.connection).toHaveProperty('password');
      expect(config.database.connection).toHaveProperty('database');
    });

    it('has options sub-object', () => {
      expect(config.database).toHaveProperty('options');
      expect(config.database.options).toHaveProperty('useNullAsDefault');
      expect(config.database.options).toHaveProperty('pool');
    });
  });

  describe('service_manager', () => {
    it('has invokables', () => {
      expect(config.service_manager).toHaveProperty('invokables');
    });

    it('has factories', () => {
      expect(config.service_manager).toHaveProperty('factories');
      expect(typeof config.service_manager.factories).toBe('object');
    });

    it('factories contains expected service keys', () => {
      expect(config.service_manager.factories).toHaveProperty('DbAdapter');
      expect(config.service_manager.factories).toHaveProperty('AuthenticationService');
      expect(config.service_manager.factories).toHaveProperty('DerivativeOption');
    });

    it('invokables contains expected service keys', () => {
      expect(config.service_manager.invokables).toHaveProperty('FolderService');
      expect(config.service_manager.invokables).toHaveProperty('HomeActionService');
      expect(config.service_manager.invokables).toHaveProperty('FileMetadataService');
    });
  });

  describe('env var overrides', () => {
    /**
     * Helper: set env vars, load config in an isolated module scope, then restore env.
     */
    function loadConfigWithEnv(envOverrides) {
      const savedValues = {};
      for (const key of Object.keys(envOverrides)) {
        savedValues[key] = process.env[key];
        process.env[key] = envOverrides[key];
      }

      let freshConfig;
      jest.isolateModules(() => {
        freshConfig = require(globalThis.applicationPath('/application/config/application.config'));
      });

      for (const key of Object.keys(envOverrides)) {
        if (savedValues[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = savedValues[key];
        }
      }

      return freshConfig;
    }

    it('overrides cache backend via CACHE_BACKEND', () => {
      const freshConfig = loadConfigWithEnv({ CACHE_BACKEND: 'Memcached' });
      expect(freshConfig.cache.backend).toBe('Memcached');
    });

    it('overrides database adapter via DATABASE_ADAPTER', () => {
      const freshConfig = loadConfigWithEnv({ DATABASE_ADAPTER: 'mysql' });
      expect(freshConfig.database.adapter).toBe('mysql');
    });

    it('overrides database host via DATABASE_HOST', () => {
      const freshConfig = loadConfigWithEnv({ DATABASE_HOST: 'db.example.com' });
      expect(freshConfig.database.connection.host).toBe('db.example.com');
    });

    it('overrides session name via SESSION_NAME', () => {
      const freshConfig = loadConfigWithEnv({ SESSION_NAME: 'MY_SESSION' });
      expect(freshConfig.session.name).toBe('MY_SESSION');
    });

    it('disables cache via CACHE_ENABLED=false', () => {
      const freshConfig = loadConfigWithEnv({ CACHE_ENABLED: 'false' });
      expect(freshConfig.cache.enabled).toBe(false);
    });

    it('uses redis store_options when SESSION_STORE=redis', () => {
      const freshConfig = loadConfigWithEnv({
        SESSION_STORE: 'redis',
        REDIS_HOST: 'redis.example.com',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'secret',
        REDIS_DB: '2',
        REDIS_SESSION_PREFIX: 'myapp:',
        REDIS_SESSION_TTL: '7200',
      });
      expect(freshConfig.session.store_options).toEqual({
        host: 'redis.example.com',
        port: 6380,
        password: 'secret',
        db: 2,
        prefix: 'myapp:',
        ttl: 7200,
      });
    });

    it('uses redis store_options defaults when no REDIS_ env vars set', () => {
      const freshConfig = loadConfigWithEnv({ SESSION_STORE: 'redis' });
      expect(freshConfig.session.store_options).toEqual({
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 0,
        prefix: 'sess:',
        ttl: 3600,
      });
    });
  });
});
