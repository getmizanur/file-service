const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/folder-domain-service-factory'));
const FolderService = require(path.join(projectRoot, 'application/service/domain/folder-domain-service'));

describe('FolderServiceFactory', () => {
  it('should create a FolderService instance', () => {
    const factory = new FolderServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FolderService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FolderServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
