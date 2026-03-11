const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const UserServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/user-domain-service-factory'));
const UserService = require(path.join(projectRoot, 'application/service/domain/user-domain-service'));

describe('UserServiceFactory', () => {
  it('should create a UserService instance', () => {
    const factory = new UserServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(UserService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new UserServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
