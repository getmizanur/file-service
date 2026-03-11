const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const StorageServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/storage-domain-service-factory'));
const StorageService = require(path.join(projectRoot, 'application/service/domain/storage-domain-service'));

describe('StorageServiceFactory', () => {
  it('should create a StorageService instance', () => {
    const factory = new StorageServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(StorageService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new StorageServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
