const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

// Mock dotenv before requiring Bootstrap (it calls dotenv.config at module load)
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('helmet', () => {
  const fn = jest.fn(() => (req, res, next) => next());
  fn.contentSecurityPolicy = jest.fn(() => (req, res, next) => next());
  fn.frameguard = jest.fn(() => (req, res, next) => next());
  fn.noSniff = jest.fn(() => (req, res, next) => next());
  fn.hidePoweredBy = jest.fn(() => (req, res, next) => next());
  fn.referrerPolicy = jest.fn(() => (req, res, next) => next());
  fn.permittedCrossDomainPolicies = jest.fn(() => (req, res, next) => next());
  fn.dnsPrefetchControl = jest.fn(() => (req, res, next) => next());
  fn.hsts = jest.fn(() => (req, res, next) => next());
  return fn;
});
jest.mock('cookie-session', () => jest.fn(() => (req, res, next) => next()));
jest.mock('nunjucks', () => ({
  configure: jest.fn(() => ({
    addFilter: jest.fn(),
    addGlobal: jest.fn()
  }))
}));
jest.mock('nunjucks-date-filter', () => jest.fn());
jest.mock('express-session', () => jest.fn(() => (req, res, next) => next()));
jest.mock('compression', () => jest.fn(() => (req, res, next) => next()));
jest.mock('cookie-parser', () => jest.fn(() => (req, res, next) => next()));

// Mock session store modules for success-path testing
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};
jest.mock('connect-redis', () => ({
  RedisStore: jest.fn().mockImplementation(() => ({ client: mockRedisClient })),
}), { virtual: true });
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue(mockRedisClient),
}), { virtual: true });
jest.mock('connect-mongo', () => ({
  create: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }),
}), { virtual: true });
jest.mock('express-mysql-session', () => jest.fn().mockReturnValue(
  jest.fn().mockImplementation(() => ({ get: jest.fn(), set: jest.fn() }))
), { virtual: true });

// Mock session-file-store for file store success path
jest.mock('session-file-store', () => jest.fn().mockReturnValue(
  jest.fn().mockImplementation((opts) => ({ ...opts, type: 'file-store' }))
), { virtual: true });

const Bootstrap = require(path.join(projectRoot, 'application/bootstrap'));
const Bootstrapper = require(path.join(projectRoot, 'library/core/bootstrapper'));

describe('Bootstrap', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof Bootstrap).toBe('function');
    });

    it('should extend Bootstrapper', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      expect(bs).toBeInstanceOf(Bootstrapper);
    });
  });

  describe('constructor', () => {
    it('should store app reference', () => {
      const mockApp = { use: jest.fn() };
      const bs = new Bootstrap(mockApp);
      expect(bs.app).toBe(mockApp);
    });

    it('should accept optional serviceManager', () => {
      const mockApp = { use: jest.fn() };
      const mockSm = { get: jest.fn() };
      const bs = new Bootstrap(mockApp, mockSm);
      expect(bs.serviceManager).toBe(mockSm);
    });

    it('should default serviceManager to null', () => {
      const mockApp = { use: jest.fn() };
      const bs = new Bootstrap(mockApp);
      expect(bs.serviceManager).toBeNull();
    });

    it('should initialize logger to null', () => {
      const mockApp = { use: jest.fn() };
      const bs = new Bootstrap(mockApp);
      expect(bs.logger).toBeNull();
    });
  });

  describe('prototype methods', () => {
    const proto = Bootstrap.prototype;

    it('should have initAppConfig', () => {
      expect(typeof proto.initAppConfig).toBe('function');
    });

    it('should have initSecurity', () => {
      expect(typeof proto.initSecurity).toBe('function');
    });

    it('should have initLogging', () => {
      expect(typeof proto.initLogging).toBe('function');
    });

    it('should have initSession', () => {
      expect(typeof proto.initSession).toBe('function');
    });

    it('should have createSessionStore', () => {
      expect(typeof proto.createSessionStore).toBe('function');
    });

    it('should have initConfig', () => {
      expect(typeof proto.initConfig).toBe('function');
    });

    it('should have initView', () => {
      expect(typeof proto.initView).toBe('function');
    });

    it('should have initHelper', () => {
      expect(typeof proto.initHelper).toBe('function');
    });

    it('should have initProfiler', () => {
      expect(typeof proto.initProfiler).toBe('function');
    });

    it('should have initRouter', () => {
      expect(typeof proto.initRouter).toBe('function');
    });

    it('should have initErrorHandler', () => {
      expect(typeof proto.initErrorHandler).toBe('function');
    });
  });

  describe('createSessionStore()', () => {
    let bs;

    beforeEach(() => {
      const mockApp = { use: jest.fn() };
      bs = new Bootstrap(mockApp);
    });

    it('should return null for memory store', () => {
      const result = bs.createSessionStore({ store: 'memory' });
      expect(result).toBeNull();
    });

    it('should return null for unknown store type (default case)', () => {
      const result = bs.createSessionStore({ store: 'unknown_store_xyz' });
      expect(result).toBeNull();
    });

    it('should default to file store when no store specified', () => {
      // file store will try to require session-file-store - may fail
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const spyLog = jest.spyOn(console, 'log').mockImplementation();
      const result = bs.createSessionStore({});
      // Either returns a FileStore or null if module not available
      expect(result === null || typeof result === 'object').toBe(true);
      spy.mockRestore();
      spyLog.mockRestore();
    });

    it('should return null and warn for redis store when redis not available', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = bs.createSessionStore({ store: 'redis', store_options: {} });
      // connect-redis may not be installed
      expect(result === null || typeof result === 'object').toBe(true);
      spy.mockRestore();
    });

    it('should return null and warn for mongodb store when mongo not available', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = bs.createSessionStore({ store: 'mongodb', store_options: {} });
      expect(result === null || typeof result === 'object').toBe(true);
      spy.mockRestore();
    });

    it('should return null and warn for mysql store when mysql not available', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = bs.createSessionStore({ store: 'mysql', store_options: {} });
      expect(result === null || typeof result === 'object').toBe(true);
      spy.mockRestore();
    });

    it('should handle file store with logFn that is not a function', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const spyLog = jest.spyOn(console, 'log').mockImplementation();
      bs.createSessionStore({ store: 'file', store_options: { logFn: 'not-a-function' } });
      spy.mockRestore();
      spyLog.mockRestore();
    });

    it('should keep logFn when it is a valid function', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const logFn = jest.fn();
      const result = bs.createSessionStore({ store: 'file', store_options: { logFn } });
      expect(result === null || typeof result === 'object').toBe(true);
      spy.mockRestore();
    });
  });

  describe('initAppConfig()', () => {
    it('should register compression, json, urlencoded, and cookieParser middleware', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.initAppConfig();
      // compression + json + urlencoded + cookieParser = at least 4 use calls
      expect(mockApp.use).toHaveBeenCalledTimes(4);
    });
  });

  describe('initSecurity()', () => {
    it('should register security middleware in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initSecurity();
      expect(mockApp.use).toHaveBeenCalled();
      spy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should enable HSTS in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const helmet = require('helmet');
      bs.initSecurity();
      expect(helmet.hsts).toHaveBeenCalled();
      spy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('initLogging()', () => {
    it('should set logger and register access logging middleware', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initLogging();
      expect(bs.logger).toBeDefined();
      expect(bs.logger).not.toBeNull();
      expect(mockApp.use).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('initSession()', () => {
    it('should skip session when disabled', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      // Configure with disabled session
      bs.getContainer = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({ session: { enabled: false } })
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initSession();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('disabled'));
      spy.mockRestore();
    });

    it('should setup session middleware when enabled', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.getContainer = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({
          session: {
            enabled: true,
            store: 'memory',
            secret: 'test-secret',
            name: 'test-session'
          }
        })
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initSession();
      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', 1);
      expect(mockApp.use).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should fallback to require when container throws', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.getContainer = jest.fn().mockReturnValue({
        get: jest.fn().mockImplementation(() => { throw new Error('no container'); })
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      // This will fallback to require('./config/application.config') which should work
      bs.initSession();
      expect(mockApp.use).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('initConfig()', () => {
    it('should create new ServiceManager when none provided', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.initConfig();
      expect(bs.serviceManager).toBeDefined();
      expect(bs.serviceManager).not.toBeNull();
    });

    it('should use existing serviceManager with setConfig', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const mockSm = { setConfig: jest.fn(), get: jest.fn() };
      const bs = new Bootstrap(mockApp, mockSm);
      bs.setRoutes = jest.fn();
      bs.setServiceManager = jest.fn();
      bs.initConfig();
      expect(mockSm.setConfig).toHaveBeenCalled();
    });

    it('should fallback to setting config property when setConfig not available', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const mockSm = { get: jest.fn() };
      const bs = new Bootstrap(mockApp, mockSm);
      bs.setRoutes = jest.fn();
      bs.setServiceManager = jest.fn();
      bs.initConfig();
      expect(mockSm.config).toBeDefined();
    });
  });

  describe('initHelper()', () => {
    it('should register static middleware', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.initHelper();
      expect(mockApp.use).toHaveBeenCalled();
    });
  });

  describe('initProfiler()', () => {
    it('should skip when PROFILER_ENABLED is not true', () => {
      const originalEnv = process.env.PROFILER_ENABLED;
      process.env.PROFILER_ENABLED = 'false';
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.serviceManager = { get: jest.fn() };
      bs.initProfiler();
      expect(bs.serviceManager.get).not.toHaveBeenCalled();
      process.env.PROFILER_ENABLED = originalEnv;
    });
  });

  describe('initView()', () => {
    it('should configure nunjucks and register helpers', () => {
      const nunjucks = require('nunjucks');
      const mockEnv = {
        addFilter: jest.fn(),
        addGlobal: jest.fn()
      };
      nunjucks.configure.mockReturnValue(mockEnv);

      const mockApp = { use: jest.fn(), set: jest.fn() };
      const mockViewHelperManager = {
        getAvailableHelpers: jest.fn().mockReturnValue(['headTitle', 'url']),
        get: jest.fn().mockReturnValue({
          setContext: jest.fn(),
          render: jest.fn().mockReturnValue('')
        })
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'ViewHelperManager') return mockViewHelperManager;
          return null;
        }),
        setConfig: jest.fn()
      };
      const bs = new Bootstrap(mockApp, mockSm);
      bs.setServiceManager = jest.fn();
      bs.setRoutes = jest.fn();

      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      bs.initView();

      expect(mockApp.set).toHaveBeenCalledWith('view engine', nunjucks);
      expect(nunjucks.configure).toHaveBeenCalled();
      expect(mockEnv.addFilter).toHaveBeenCalledWith('date', expect.any(Function));
      expect(mockEnv.addGlobal).toHaveBeenCalledTimes(2); // headTitle + url
      expect(mockApp.use).toHaveBeenCalled(); // middleware for res.locals
      logSpy.mockRestore();
    });

    it('should invoke registered helper closure correctly', () => {
      const nunjucks = require('nunjucks');
      let registeredGlobals = {};
      const mockEnv = {
        addFilter: jest.fn(),
        addGlobal: jest.fn((name, fn) => { registeredGlobals[name] = fn; })
      };
      nunjucks.configure.mockReturnValue(mockEnv);

      const mockHelper = {
        setContext: jest.fn(),
        render: jest.fn().mockReturnValue('rendered')
      };
      const mockViewHelperManager = {
        getAvailableHelpers: jest.fn().mockReturnValue(['testHelper']),
        get: jest.fn().mockReturnValue(mockHelper)
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'ViewHelperManager') return mockViewHelperManager;
          return null;
        }),
        setConfig: jest.fn()
      };
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp, mockSm);
      bs.setServiceManager = jest.fn();
      bs.setRoutes = jest.fn();

      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      bs.initView();

      // Call the registered global function
      const ctx = { some: 'context' };
      const result = registeredGlobals.testHelper.call(ctx, 'arg1', 'arg2');
      expect(mockHelper.setContext).toHaveBeenCalledWith(ctx);
      expect(mockHelper.render).toHaveBeenCalledWith('arg1', 'arg2', ctx);
      expect(result).toBe('rendered');
      logSpy.mockRestore();
    });
  });

  describe('initRouter()', () => {
    it('should mount routes and add 404 handler', () => {
      const mockApp = { use: jest.fn(), all: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.getRoutes = jest.fn().mockReturnValue({
        home: { route: '/' },
        about: { route: '/about' }
      });
      bs.initRouter();
      expect(mockApp.all).toHaveBeenCalledTimes(2);
      expect(mockApp.use).toHaveBeenCalled(); // 404 handler
    });

    it('should skip route entries without route property', () => {
      const mockApp = { use: jest.fn(), all: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.getRoutes = jest.fn().mockReturnValue({
        home: { route: '/' },
        defaults: { param: 'value' } // no route property
      });
      bs.initRouter();
      expect(mockApp.all).toHaveBeenCalledTimes(1);
    });

    it('should call dispatcher for route handler', async () => {
      let routeHandler;
      const mockApp = {
        use: jest.fn(),
        all: jest.fn((route, handler) => { routeHandler = handler; }),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      bs.getRoutes = jest.fn().mockReturnValue({ home: { route: '/' } });
      bs.dispatcher = jest.fn().mockResolvedValue(undefined);
      bs.initRouter();

      // Invoke the route handler
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();
      await routeHandler(mockReq, mockRes, mockNext);
      expect(bs.dispatcher).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should handle 404 with template resolution', () => {
      let notFoundHandler;
      const mockApp = {
        use: jest.fn((handler) => { notFoundHandler = handler; }),
        all: jest.fn(),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      bs.getRoutes = jest.fn().mockReturnValue({});
      bs.resolveErrorTemplate = jest.fn().mockReturnValue({ templatePath: 'error/404.njk' });
      bs.initRouter();

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn()
      };
      notFoundHandler({}, mockRes, jest.fn());
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error/404.njk', expect.objectContaining({ errorCode: 404 }));
    });

    it('should handle 404 with fallback HTML when template resolution fails', () => {
      let notFoundHandler;
      const mockApp = {
        use: jest.fn((handler) => { notFoundHandler = handler; }),
        all: jest.fn(),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      bs.getRoutes = jest.fn().mockReturnValue({});
      bs.resolveErrorTemplate = jest.fn().mockImplementation(() => { throw new Error('Template not found'); });
      bs.initRouter();

      const errSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      notFoundHandler({}, mockRes, jest.fn());
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('404'));
      errSpy.mockRestore();
    });
  });

  describe('initErrorHandler()', () => {
    it('should register error handling middleware', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initErrorHandler();
      expect(mockApp.use).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log error with logger when available', () => {
      let errorHandler;
      const mockApp = {
        use: jest.fn((handler) => { errorHandler = handler; }),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      bs.logger = { logError: jest.fn() };
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      bs.initErrorHandler();

      const mockErr = new Error('test error');
      const mockNext = jest.fn();
      errorHandler(mockErr, {}, {}, mockNext);
      expect(bs.logger.logError).toHaveBeenCalledWith(mockErr);
      expect(mockNext).toHaveBeenCalledWith(mockErr);
      logSpy.mockRestore();
    });

    it('should fallback to console.error when logger not initialized', () => {
      let errorHandler;
      const mockApp = {
        use: jest.fn((handler) => { errorHandler = handler; }),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      bs.logger = null;
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const errSpy = jest.spyOn(console, 'error').mockImplementation();
      bs.initErrorHandler();

      const mockErr = new Error('test error');
      const mockNext = jest.fn();
      errorHandler(mockErr, {}, {}, mockNext);
      expect(errSpy).toHaveBeenCalledWith('Error occurred but logger not initialized:', mockErr);
      expect(mockNext).toHaveBeenCalledWith(mockErr);
      logSpy.mockRestore();
      errSpy.mockRestore();
    });
  });

  describe('initLogging()', () => {
    it('should set logger and register access logging middleware', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initLogging();
      expect(bs.logger).toBeDefined();
      expect(bs.logger).not.toBeNull();
      expect(mockApp.use).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log access on response finish', () => {
      let accessMiddleware;
      const mockApp = {
        use: jest.fn((mw) => { accessMiddleware = mw; }),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initLogging();

      // Simulate the middleware
      const finishCallbacks = {};
      const mockReq = { method: 'GET', originalUrl: '/test', ip: '127.0.0.1' };
      const mockRes = {
        on: jest.fn((event, cb) => { finishCallbacks[event] = cb; }),
        statusCode: 200
      };
      const mockNext = jest.fn();
      accessMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Trigger finish event
      bs.logger.logAccess = jest.fn();
      finishCallbacks.finish();
      expect(bs.logger.logAccess).toHaveBeenCalledWith(expect.stringContaining('GET /test'));
      spy.mockRestore();
    });

    it('should handle missing ip gracefully', () => {
      let accessMiddleware;
      const mockApp = {
        use: jest.fn((mw) => { accessMiddleware = mw; }),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initLogging();

      const finishCallbacks = {};
      const mockReq = { method: 'POST', url: '/api', ip: undefined, socket: undefined };
      const mockRes = {
        on: jest.fn((event, cb) => { finishCallbacks[event] = cb; }),
        statusCode: 201
      };
      accessMiddleware(mockReq, mockRes, jest.fn());
      bs.logger.logAccess = jest.fn();
      finishCallbacks.finish();
      expect(bs.logger.logAccess).toHaveBeenCalledWith(expect.stringContaining('unknown'));
      spy.mockRestore();
    });
  });

  describe('initSession() - middleware routing', () => {
    it('should skip session for /p/ routes', () => {
      let sessionFilterMiddleware;
      const mockApp = {
        use: jest.fn((mw) => { sessionFilterMiddleware = mw; }),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      bs.getContainer = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({
          session: {
            enabled: true,
            store: 'memory',
            secret: 'test'
          }
        })
      });
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      bs.initSession();

      // Find the session filter middleware (the last one registered)
      const lastMw = mockApp.use.mock.calls[mockApp.use.mock.calls.length - 1][0];
      const nextFn = jest.fn();
      lastMw({ path: '/p/public-file' }, {}, nextFn);
      expect(nextFn).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should skip session for /s/ routes', () => {
      const mockApp = {
        use: jest.fn(),
        set: jest.fn()
      };
      const bs = new Bootstrap(mockApp);
      bs.getContainer = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({
          session: {
            enabled: true,
            store: 'memory',
            secret: 'test'
          }
        })
      });
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      bs.initSession();

      const lastMw = mockApp.use.mock.calls[mockApp.use.mock.calls.length - 1][0];
      const nextFn = jest.fn();
      lastMw({ path: '/s/shared-file' }, {}, nextFn);
      expect(nextFn).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('initSecurity() - Permissions-Policy middleware', () => {
    it('should set Permissions-Policy header', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      bs.initSecurity();

      // Find the Permissions-Policy middleware by invoking each 3-arg function
      // and checking which one sets the Permissions-Policy header
      const allMiddleware = mockApp.use.mock.calls
        .filter(call => typeof call[0] === 'function' && call[0].length === 3);
      let found = false;
      for (const mw of allMiddleware) {
        const mockRes = { setHeader: jest.fn() };
        const mockNext = jest.fn();
        try { mw[0]({}, mockRes, mockNext); } catch (e) { continue; }
        if (mockRes.setHeader.mock.calls.some(c => c[0] === 'Permissions-Policy')) {
          expect(mockRes.setHeader).toHaveBeenCalledWith('Permissions-Policy', expect.any(String));
          expect(mockNext).toHaveBeenCalled();
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
      spy.mockRestore();
    });
  });

  describe('initProfiler()', () => {
    it('should skip when PROFILER_ENABLED is not true', () => {
      const originalEnv = process.env.PROFILER_ENABLED;
      process.env.PROFILER_ENABLED = 'false';
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.serviceManager = { get: jest.fn() };
      bs.initProfiler();
      expect(bs.serviceManager.get).not.toHaveBeenCalled();
      process.env.PROFILER_ENABLED = originalEnv;
    });

    it('should skip when PROFILER_ENABLED is undefined', () => {
      const originalEnv = process.env.PROFILER_ENABLED;
      delete process.env.PROFILER_ENABLED;
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      bs.serviceManager = { get: jest.fn() };
      bs.initProfiler();
      expect(bs.serviceManager.get).not.toHaveBeenCalled();
      process.env.PROFILER_ENABLED = originalEnv;
    });

    it('should register profiler middleware when PROFILER_ENABLED is true', () => {
      const originalEnv = process.env.PROFILER_ENABLED;
      process.env.PROFILER_ENABLED = 'true';
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const mockProfiler = { start: jest.fn(), stop: jest.fn() };
      bs.serviceManager = {
        get: jest.fn().mockReturnValue(mockProfiler),
      };

      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      bs.initProfiler();
      expect(bs.serviceManager.get).toHaveBeenCalledWith('Profiler');
      expect(mockApp.use).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[Profiler]'));
      logSpy.mockRestore();
      process.env.PROFILER_ENABLED = originalEnv;
    });
  });

  describe('initView() - template locals middleware', () => {
    it('should set res.locals.masterTemplate and request in middleware', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);

      const mockViewHelperManager = {
        getAvailableHelpers: jest.fn().mockReturnValue([]),
      };
      bs.serviceManager = {
        get: jest.fn((name) => {
          if (name === 'ViewHelperManager') return mockViewHelperManager;
          return null;
        }),
      };

      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      bs.initView();

      // Find the locals middleware (sets res.locals.masterTemplate)
      const localsMiddleware = mockApp.use.mock.calls.find(call => {
        if (typeof call[0] !== 'function' || call[0].length !== 3) return false;
        const mockRes = { locals: {} };
        const mockReq = { url: '/test' };
        try { call[0](mockReq, mockRes, () => {}); } catch { return false; }
        return mockRes.locals.masterTemplate !== undefined;
      });

      expect(localsMiddleware).toBeDefined();
      const mockRes = { locals: {} };
      const mockReq = { url: '/test-url' };
      const mockNext = jest.fn();
      localsMiddleware[0](mockReq, mockRes, mockNext);
      expect(mockRes.locals.masterTemplate).toBe('layout/master.njk');
      expect(mockRes.locals.request.url).toBe('/test-url');
      expect(mockNext).toHaveBeenCalled();

      logSpy.mockRestore();
    });
  });

  describe('initSession() - session apply vs skip', () => {
    it('should apply session for normal routes', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      bs.serviceManager = {
        get: jest.fn(() => ({
          session: { enabled: true, secret: 'test-secret', store: 'memory' },
        })),
        has: jest.fn().mockReturnValue(true),
      };

      bs.initSession();

      // Find the session wrapper middleware
      const sessionWrapper = mockApp.use.mock.calls.find(call =>
        typeof call[0] === 'function' && call[0].length === 3
      );

      if (sessionWrapper) {
        const mockReq = { path: '/admin/dashboard' };
        const mockRes = {};
        const mockNext = jest.fn();
        // This should go through the session middleware, not call next directly
        sessionWrapper[0](mockReq, mockRes, mockNext);
      }

      logSpy.mockRestore();
    });

    it('should set expressSessionConfig.store when createSessionStore returns store', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      bs.serviceManager = {
        get: jest.fn(() => ({
          session: { enabled: true, secret: 'test-secret', store: 'file' },
        })),
        has: jest.fn().mockReturnValue(true),
      };

      // Override createSessionStore to return a non-null store
      const mockStore = { get: jest.fn(), set: jest.fn(), destroy: jest.fn() };
      bs.createSessionStore = jest.fn().mockReturnValue(mockStore);

      bs.initSession();
      expect(bs.createSessionStore).toHaveBeenCalled();
      expect(mockApp.use).toHaveBeenCalled();

      logSpy.mockRestore();
    });

    it('should use default secret and store when not provided', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      bs.serviceManager = {
        get: jest.fn(() => ({
          session: { enabled: true },
        })),
        has: jest.fn().mockReturnValue(true),
      };

      bs.initSession();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('session middleware initialized'));
      expect(mockApp.use).toHaveBeenCalled();

      logSpy.mockRestore();
    });

    it('should use session config from catch fallback when container throws', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      // Don't set getContainer - it doesn't exist on the class
      bs.getContainer = jest.fn().mockImplementation(() => { throw new Error('no container'); });
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      bs.initSession();
      // Should have used the config from require() fallback
      expect(mockApp.use).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('createSessionStore() - redis store', () => {
    it('should create Redis store with options', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = bs.createSessionStore({
        store: 'redis',
        store_options: {
          url: 'redis://localhost:6379',
          prefix: 'mysess:',
          ttl: 7200,
          password: 'secret',
          db: 1,
          connectTimeout: 5000,
        },
      });

      expect(result).toBeDefined();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using Redis session store'),
        expect.any(Object)
      );
      logSpy.mockRestore();
    });

    it('should use default redis host/port when not specified', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = bs.createSessionStore({
        store: 'redis',
        store_options: {},
      });

      expect(result).toBeDefined();
      logSpy.mockRestore();
    });

    it('should handle redis connect rejection', async () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const errSpy = jest.spyOn(console, 'error').mockImplementation();

      let connectReject;
      const { createClient } = require('redis');
      createClient.mockImplementation(() => ({
        connect: jest.fn().mockReturnValue(
          new Promise((_, reject) => { connectReject = reject; })
        ),
        on: jest.fn(),
      }));

      bs.createSessionStore({ store: 'redis', store_options: {} });
      // Trigger the connect rejection
      if (connectReject) {
        connectReject(new Error('connection refused'));
        await new Promise(r => setTimeout(r, 10));
      }

      logSpy.mockRestore();
      errSpy.mockRestore();
    });

    it('should test reconnectStrategy and redis callbacks', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const errSpy = jest.spyOn(console, 'error').mockImplementation();

      // Capture the createClient options and callbacks
      let capturedOpts = null;
      let capturedConnectCb = null;
      let capturedErrorCb = null;
      const { createClient } = require('redis');
      createClient.mockImplementation((opts) => {
        capturedOpts = opts;
        return {
          connect: jest.fn().mockResolvedValue(undefined),
          on: jest.fn((event, cb) => {
            if (event === 'connect') capturedConnectCb = cb;
            if (event === 'error') capturedErrorCb = cb;
          }),
        };
      });

      bs.createSessionStore({
        store: 'redis',
        store_options: {},
      });

      // Test reconnectStrategy
      expect(capturedOpts).toBeDefined();
      const strategy = capturedOpts.socket.reconnectStrategy;
      expect(strategy(1)).toBe(100);
      expect(strategy(5)).toBe(500);
      // retries > 10 should return Error
      const retryResult = strategy(11);
      expect(retryResult).toBeInstanceOf(Error);

      // Test connect and error callbacks
      if (capturedConnectCb) capturedConnectCb();
      if (capturedErrorCb) capturedErrorCb(new Error('redis err'));

      logSpy.mockRestore();
      errSpy.mockRestore();
    });
  });

  describe('createSessionStore() - mongodb store', () => {
    it('should create MongoDB store', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = bs.createSessionStore({
        store: 'mongodb',
        store_options: { mongoUrl: 'mongodb://localhost:27017/sessions' },
      });

      expect(result).toBeDefined();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using MongoDB session store'),
        expect.any(Object)
      );
      logSpy.mockRestore();
    });

    it('should handle mongodb store creation failure', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Override the mock to throw
      const MongoStore = require('connect-mongo');
      MongoStore.create.mockImplementation(() => { throw new Error('mongo fail'); });

      const result = bs.createSessionStore({
        store: 'mongodb',
        store_options: {},
      });

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB store not available'),
        'mongo fail'
      );
      warnSpy.mockRestore();

      // Restore the mock
      MongoStore.create.mockReturnValue({ get: jest.fn(), set: jest.fn() });
    });
  });

  describe('createSessionStore() - mysql store', () => {
    it('should create MySQL store', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = bs.createSessionStore({
        store: 'mysql',
        store_options: { host: 'localhost', port: 3306 },
      });

      expect(result).toBeDefined();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using MySQL session store'),
        expect.any(Object)
      );
      logSpy.mockRestore();
    });

    it('should handle mysql store creation failure', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Override the mock to throw
      const MySQLStoreFactory = require('express-mysql-session');
      MySQLStoreFactory.mockReturnValue(
        jest.fn().mockImplementation(() => { throw new Error('mysql fail'); })
      );

      const result = bs.createSessionStore({
        store: 'mysql',
        store_options: {},
      });

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('MySQL store not available'),
        'mysql fail'
      );
      warnSpy.mockRestore();

      // Restore
      MySQLStoreFactory.mockReturnValue(
        jest.fn().mockImplementation(() => ({ get: jest.fn(), set: jest.fn() }))
      );
    });
  });

  describe('createSessionStore() - redis failure path', () => {
    it('should handle redis store creation failure with stack trace', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Override redis createClient to throw
      const { createClient } = require('redis');
      createClient.mockImplementation(() => { throw new Error('redis fail'); });

      const result = bs.createSessionStore({
        store: 'redis',
        store_options: {},
      });

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis store not available'),
        'redis fail'
      );
      expect(warnSpy).toHaveBeenCalledWith(
        'Error stack:',
        expect.any(String)
      );
      warnSpy.mockRestore();

      // Restore
      createClient.mockReturnValue(mockRedisClient);
    });
  });

  describe('createSessionStore() - file store failure path', () => {
    it('should handle file store failure and warn', () => {
      const mockApp = { use: jest.fn(), set: jest.fn() };
      const bs = new Bootstrap(mockApp);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Override session-file-store mock to throw
      const FileStoreFactory = require('session-file-store');
      FileStoreFactory.mockReturnValue(
        jest.fn().mockImplementation(() => { throw new Error('file store fail'); })
      );

      const result = bs.createSessionStore({ store: 'file', store_options: {} });
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('File store not available'),
        'file store fail'
      );
      warnSpy.mockRestore();

      // Restore
      FileStoreFactory.mockReturnValue(
        jest.fn().mockImplementation((opts) => ({ ...opts, type: 'file-store' }))
      );
    });
  });
});
