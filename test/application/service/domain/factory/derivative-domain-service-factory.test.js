const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const DerivativeServiceFactory = require(path.join(projectRoot, 'application/service/domain/factory/derivative-domain-service-factory'));
const DerivativeService = require(path.join(projectRoot, 'application/service/domain/derivative-domain-service'));

describe('DerivativeServiceFactory', () => {
  it('should create a DerivativeService instance', () => {
    const factory = new DerivativeServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service).toBeInstanceOf(DerivativeService);
  });

  it('should set serviceManager on the created service', () => {
    const factory = new DerivativeServiceFactory();
    const mockSm = { get: jest.fn() };
    const service = factory.createService(mockSm);
    expect(service.getServiceManager()).toBe(mockSm);
  });
});
