const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const IndexActionServiceFactory = require(path.join(projectRoot, 'application/service/action/factory/index-action-service-factory'));
const IndexActionService = require(path.join(projectRoot, 'application/service/action/index-action-service'));

describe('IndexActionServiceFactory', () => {
  it('should create an IndexActionService instance', () => {
    const factory = new IndexActionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(IndexActionService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new IndexActionServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
