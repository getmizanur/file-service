const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const ErrorLoggingListener = require(path.join(
  projectRoot, 'application/listener/error-logging-listener'
));
const AbstractListener = require(path.join(projectRoot, 'library/event/abstract-listener'));

describe('ErrorLoggingListener', () => {
  let listener;
  let mockLogger;
  let originalLogger;

  beforeEach(() => {
    listener = new ErrorLoggingListener();

    mockLogger = {
      logError: jest.fn(),
    };

    originalLogger = globalThis.logger;
    globalThis.logger = mockLogger;
  });

  afterEach(() => {
    globalThis.logger = originalLogger;
  });

  it('should extend AbstractListener', () => {
    expect(listener).toBeInstanceOf(AbstractListener);
  });

  it('should have setServiceManager / getServiceManager', () => {
    const sm = { get: jest.fn() };
    listener.setServiceManager(sm);
    expect(listener.getServiceManager()).toBe(sm);
  });

  // ------------------------------------------------------------------
  // handle()
  // ------------------------------------------------------------------

  describe('handle()', () => {
    it('should log error from getError()', () => {
      const error = new Error('dispatch failed');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => null,
        getRouteMatch: () => null,
      };

      listener.handle(event);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        traceId: expect.any(String),
      }));
    });

    it('should log error from getException() when getError() is null', () => {
      const error = new Error('exception thrown');
      const event = {
        getError: () => null,
        getException: () => error,
        getRequest: () => null,
        getRouteMatch: () => null,
      };

      listener.handle(event);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        traceId: expect.any(String),
      }));
    });

    it('should not log when neither getError() nor getException() returns a value', () => {
      const event = {
        getError: () => null,
        getException: () => null,
      };

      listener.handle(event);

      expect(mockLogger.logError).not.toHaveBeenCalled();
    });

    it('should not throw when event has no getError/getException methods', () => {
      const event = {};

      expect(() => listener.handle(event)).not.toThrow();
      expect(mockLogger.logError).not.toHaveBeenCalled();
    });

    it('should fall back to console.error when globalThis.logger is not available', () => {
      globalThis.logger = null;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('no logger');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => null,
        getRouteMatch: () => null,
      };

      listener.handle(event);

      expect(consoleSpy).toHaveBeenCalledWith('[ErrorLoggingListener]', error);
      consoleSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // Trace context
  // ------------------------------------------------------------------

  describe('trace context', () => {
    it('should include request method and URL', () => {
      const error = new Error('test');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => ({
          getMethod: () => 'GET',
          getUrl: () => '/admin/my-drive',
          getExpressRequest: () => ({ ip: '172.30.0.148' }),
        }),
        getRouteMatch: () => null,
      };

      listener.handle(event);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        method: 'GET',
        url: '/admin/my-drive',
        ip: '172.30.0.148',
      }));
    });

    it('should fall back to getPath() when getUrl() returns null', () => {
      const error = new Error('test');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => ({
          getMethod: () => 'POST',
          getUrl: () => null,
          getPath: () => '/admin/file/upload',
          getExpressRequest: () => null,
        }),
        getRouteMatch: () => null,
      };

      listener.handle(event);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        method: 'POST',
        url: '/admin/file/upload',
      }));
    });

    it('should extract IP from socket.remoteAddress when ip is not available', () => {
      const error = new Error('test');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => ({
          getMethod: () => 'GET',
          getUrl: () => '/',
          getExpressRequest: () => ({ ip: undefined, socket: { remoteAddress: '10.0.0.1' } }),
        }),
        getRouteMatch: () => null,
      };

      listener.handle(event);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        ip: '10.0.0.1',
      }));
    });

    it('should include route context from routeMatch', () => {
      const error = new Error('test');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => null,
        getRouteMatch: () => ({
          getModule: () => 'admin',
          getController: () => 'my-drive',
          getAction: () => 'list',
        }),
      };

      listener.handle(event);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        route: 'admin/my-drive/list',
      }));
    });

    it('should use ? for missing route parts', () => {
      const error = new Error('test');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => null,
        getRouteMatch: () => ({
          getModule: () => null,
          getController: () => 'home',
          getAction: () => null,
        }),
      };

      listener.handle(event);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        route: '?/home/?',
      }));
    });

    it('should generate a unique traceId', () => {
      const error = new Error('test');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => null,
        getRouteMatch: () => null,
      };

      listener.handle(event);
      const firstCall = mockLogger.logError.mock.calls[0][1].traceId;

      listener.handle(event);
      const secondCall = mockLogger.logError.mock.calls[1][1].traceId;

      expect(firstCall).toBeTruthy();
      expect(secondCall).toBeTruthy();
      expect(firstCall).not.toBe(secondCall);
    });

    it('should handle full context with all fields populated', () => {
      const error = new Error('full context');
      const event = {
        getError: () => error,
        getException: () => null,
        getRequest: () => ({
          getMethod: () => 'PUT',
          getUrl: () => '/api/file/update',
          getExpressRequest: () => ({ ip: '82.21.226.68' }),
        }),
        getRouteMatch: () => ({
          getModule: () => 'admin',
          getController: () => 'rest/file-update',
          getAction: () => 'rest',
        }),
      };

      listener.handle(event);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, {
        traceId: expect.any(String),
        method: 'PUT',
        url: '/api/file/update',
        ip: '82.21.226.68',
        route: 'admin/rest/file-update/rest',
      });
    });
  });
});
