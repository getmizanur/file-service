const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderPermissionServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/folder-permission-domain-service-factory'));
const FolderPermissionService = require(path.join(projectRoot, 'application/service/domain/folder-permission-domain-service'));

describe('FolderPermissionServiceFactory', () => {
  it('should create a FolderPermissionService instance', () => {
    const factory = new FolderPermissionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FolderPermissionService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FolderPermissionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
