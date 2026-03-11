const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const AbstractActionService = require(path.join(projectRoot, 'application/service/abstract-action-service'));
const AbstractService = require(path.join(projectRoot, 'application/service/abstract-service'));

class ConcreteActionService extends AbstractActionService {
  constructor() {
    super();
  }
}

describe('AbstractActionService', () => {

  describe('constructor', () => {
    it('should throw TypeError when instantiated directly', () => {
      expect(() => new AbstractActionService()).toThrow(TypeError);
      expect(() => new AbstractActionService()).toThrow('Cannot construct AbstractActionService instances directly');
    });

    it('should allow instantiation through a concrete subclass', () => {
      const service = new ConcreteActionService();
      expect(service).toBeInstanceOf(AbstractActionService);
      expect(service).toBeInstanceOf(AbstractService);
    });
  });

  describe('inherited methods from AbstractService', () => {
    it('should have getServiceManager method', () => {
      const service = new ConcreteActionService();
      expect(typeof service.getServiceManager).toBe('function');
    });

    it('should have setServiceManager method', () => {
      const service = new ConcreteActionService();
      expect(typeof service.setServiceManager).toBe('function');
    });

    it('should set and get serviceManager', () => {
      const service = new ConcreteActionService();
      const mockSm = { get: jest.fn() };
      service.setServiceManager(mockSm);
      expect(service.getServiceManager()).toBe(mockSm);
    });

    it('should have setCache method', () => {
      const service = new ConcreteActionService();
      expect(typeof service.setCache).toBe('function');
    });

    it('should have clearCaches method', () => {
      const service = new ConcreteActionService();
      expect(typeof service.clearCaches).toBe('function');
    });

    it('should have loadApplicationConfig method', () => {
      const service = new ConcreteActionService();
      expect(typeof service.loadApplicationConfig).toBe('function');
    });

    it('should have hasTypedBackendOptions method', () => {
      const service = new ConcreteActionService();
      expect(typeof service.hasTypedBackendOptions).toBe('function');
    });

    it('should have getAvailableCacheTypes method', () => {
      const service = new ConcreteActionService();
      expect(typeof service.getAvailableCacheTypes).toBe('function');
    });

    it('should have hasCacheType method', () => {
      const service = new ConcreteActionService();
      expect(typeof service.hasCacheType).toBe('function');
    });
  });
});
