const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderShareLinkServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/folder-share-link-domain-service-factory'));
const FolderShareLinkService = require(path.join(projectRoot, 'application/service/domain/folder-share-link-domain-service'));

describe('FolderShareLinkServiceFactory', () => {
  it('should create a FolderShareLinkService instance', () => {
    const factory = new FolderShareLinkServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FolderShareLinkService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FolderShareLinkServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
