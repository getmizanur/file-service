const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileStarServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/file-star-domain-service-factory'));
const FileStarService = require(path.join(projectRoot, 'application/service/domain/file-star-domain-service'));

describe('FileStarServiceFactory', () => {
  it('should create a FileStarService instance', () => {
    const factory = new FileStarServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FileStarService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FileStarServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
