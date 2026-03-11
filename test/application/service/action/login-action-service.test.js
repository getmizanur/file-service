const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const LoginActionService = require(path.join(projectRoot, 'application/service/action/login-action-service'));
const AbstractActionService = require(path.join(projectRoot, 'application/service/abstract-action-service'));

describe('LoginActionService', () => {
  let service;

  beforeEach(() => {
    service = new LoginActionService();
  });

  describe('constructor', () => {
    it('should be an instance of AbstractActionService', () => {
      expect(service).toBeInstanceOf(AbstractActionService);
    });
  });

  describe('method existence', () => {
    it('should have authenticate method', () => {
      expect(typeof service.authenticate).toBe('function');
    });
  });

  describe('authenticate', () => {
    it('should return success with identity on valid auth', async () => {
      const mockIdentity = { user_id: 'u1', email: 'test@example.com' };
      const mockResult = {
        isValid: () => true,
        getIdentity: () => mockIdentity
      };
      const mockAuthService = {
        setAdapter: jest.fn(),
        authenticate: jest.fn().mockResolvedValue(mockResult)
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'DbAdapter') return { query: jest.fn() };
          if (name === 'AuthenticationService') return mockAuthService;
          return null;
        })
      };
      service.setServiceManager(mockSm);

      const result = await service.authenticate({ username: 'test@example.com', password: 'pass123' });
      expect(result.success).toBe(true);
      expect(result.identity).toBe(mockIdentity);
    });

    it('should return failure with messages on invalid auth', async () => {
      const mockResult = {
        isValid: () => false,
        getMessages: () => ['Invalid credentials']
      };
      const mockAuthService = {
        setAdapter: jest.fn(),
        authenticate: jest.fn().mockResolvedValue(mockResult)
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'DbAdapter') return { query: jest.fn() };
          if (name === 'AuthenticationService') return mockAuthService;
          return null;
        })
      };
      service.setServiceManager(mockSm);

      const result = await service.authenticate({ username: 'test@example.com', password: 'wrong' });
      expect(result.success).toBe(false);
      expect(result.messages).toEqual(['Invalid credentials']);
    });
  });
});
