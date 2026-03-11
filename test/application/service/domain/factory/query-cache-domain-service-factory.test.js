const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const QueryCacheServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/query-cache-domain-service-factory'));
const QueryCacheService = require(path.join(projectRoot, 'application/service/domain/query-cache-domain-service'));

describe('QueryCacheServiceFactory', () => {
  it('should create a QueryCacheService instance', () => {
    const factory = new QueryCacheServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(QueryCacheService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new QueryCacheServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
