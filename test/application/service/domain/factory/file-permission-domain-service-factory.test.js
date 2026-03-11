const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FilePermissionServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/file-permission-domain-service-factory'));
const FilePermissionService = require(path.join(projectRoot, 'application/service/domain/file-permission-domain-service'));

describe('FilePermissionServiceFactory', () => {
  it('should create a FilePermissionService instance', () => {
    const factory = new FilePermissionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FilePermissionService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FilePermissionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
