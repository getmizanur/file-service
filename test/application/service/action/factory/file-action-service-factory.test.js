const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileActionServiceFactory = require(path.join(projectRoot, 'application/service/action/factory/file-action-service-factory'));
const FileActionService = require(path.join(projectRoot, 'application/service/action/file-action-service'));

describe('FileActionServiceFactory', () => {
  it('should create a FileActionService instance', () => {
    const factory = new FileActionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FileActionService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FileActionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
