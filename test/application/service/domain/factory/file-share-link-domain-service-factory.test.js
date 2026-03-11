const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileShareLinkServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/file-share-link-domain-service-factory'));
const FileShareLinkService = require(path.join(projectRoot, 'application/service/domain/file-share-link-domain-service'));

describe('FileShareLinkServiceFactory', () => {
  it('should create a FileShareLinkService instance', () => {
    const factory = new FileShareLinkServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FileShareLinkService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FileShareLinkServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
