const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileMetadataServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/file-metadata-domain-service-factory'));
const FileMetadataService = require(path.join(projectRoot, 'application/service/domain/file-metadata-domain-service'));

describe('FileMetadataServiceFactory', () => {
  it('should create a FileMetadataService instance', () => {
    const factory = new FileMetadataServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FileMetadataService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FileMetadataServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
