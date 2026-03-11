const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderStarServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/folder-star-domain-service-factory'));
const FolderStarService = require(path.join(projectRoot, 'application/service/domain/folder-star-domain-service'));

describe('FolderStarServiceFactory', () => {
  it('should create a FolderStarService instance', () => {
    const factory = new FolderStarServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FolderStarService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FolderStarServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
