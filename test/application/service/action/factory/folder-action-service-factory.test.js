const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderActionServiceFactory = require(path.join(projectRoot, 'application/service/action/factory/folder-action-service-factory'));
const FolderActionService = require(path.join(projectRoot, 'application/service/action/folder-action-service'));

describe('FolderActionServiceFactory', () => {
  it('should create a FolderActionService instance', () => {
    const factory = new FolderActionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(FolderActionService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new FolderActionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
