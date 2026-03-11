const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const AuthenticationServiceFactory = require(path.join(projectRoot, 'application/service/factory/authentication-service-factory'));
const AbstractFactory = require(path.join(projectRoot, 'library/mvc/service/abstract-factory'));

describe('AuthenticationServiceFactory', () => {

  describe('constructor', () => {
    it('should be an instance of AbstractFactory', () => {
      const factory = new AuthenticationServiceFactory();
      expect(factory).toBeInstanceOf(AbstractFactory);
    });
  });

  describe('createService', () => {
    it('should throw when MvcEvent and Application have no request', () => {
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'MvcEvent') throw new Error('Not registered');
          if (name === 'Application') return { getRequest: () => null };
          return null;
        })
      };
      const factory = new AuthenticationServiceFactory();
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(() => factory.createService(mockSm)).toThrow('Request not available in Application service');
      spy.mockRestore();
    });

    it('should throw when express session is not available', () => {
      const mockRequest = {
        getExpressRequest: () => ({ session: null })
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'MvcEvent') return { getRequest: () => mockRequest };
          return null;
        })
      };
      const factory = new AuthenticationServiceFactory();
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(() => factory.createService(mockSm)).toThrow('Express session not available in request');
      spy.mockRestore();
    });

    it('should create AuthenticationService when request and session are available', () => {
      const mockSession = { id: 'sess-1', user: null };
      const mockExpressReq = { session: mockSession, sessionID: 'sess-1' };
      const mockRequest = {
        getExpressRequest: () => mockExpressReq
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'MvcEvent') return { getRequest: () => mockRequest };
          return null;
        })
      };
      const factory = new AuthenticationServiceFactory();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const service = factory.createService(mockSm);
      expect(service).toBeDefined();
      expect(typeof service.authenticate).toBe('function');
      logSpy.mockRestore();
    });

    it('should fall back to Application.getRequest when MvcEvent throws', () => {
      const mockSession = { id: 'sess-1', user: null };
      const mockExpressReq = { session: mockSession, sessionID: 'sess-1' };
      const mockRequest = {
        getExpressRequest: () => mockExpressReq
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'MvcEvent') throw new Error('Not registered');
          if (name === 'Application') return { getRequest: () => mockRequest };
          return null;
        })
      };
      const factory = new AuthenticationServiceFactory();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const service = factory.createService(mockSm);
      expect(service).toBeDefined();
      logSpy.mockRestore();
    });

    it('should fall back to Application when MvcEvent returns no request', () => {
      const mockSession = { id: 'sess-1', user: null };
      const mockExpressReq = { session: mockSession, sessionID: 'sess-1' };
      const mockRequest = {
        getExpressRequest: () => mockExpressReq
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'MvcEvent') return { getRequest: () => null };
          if (name === 'Application') return { getRequest: () => mockRequest };
          return null;
        })
      };
      const factory = new AuthenticationServiceFactory();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const service = factory.createService(mockSm);
      expect(service).toBeDefined();
      logSpy.mockRestore();
    });
  });
});
