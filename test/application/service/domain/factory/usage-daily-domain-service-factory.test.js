const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const UsageDailyServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/usage-daily-domain-service-factory'));
const UsageDailyService = require(path.join(projectRoot, 'application/service/domain/usage-daily-domain-service'));

describe('UsageDailyServiceFactory', () => {
  it('should create a UsageDailyService instance', () => {
    const factory = new UsageDailyServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(UsageDailyService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new UsageDailyServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
