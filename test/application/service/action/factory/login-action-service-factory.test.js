const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const LoginActionServiceFactory = require(path.join(projectRoot, 'application/service/action/factory/login-action-service-factory'));
const LoginActionService = require(path.join(projectRoot, 'application/service/action/login-action-service'));

describe('LoginActionServiceFactory', () => {
  it('should create a LoginActionService instance', () => {
    const factory = new LoginActionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(LoginActionService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new LoginActionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
