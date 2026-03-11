const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const ViewHelperManagerFactory = require(path.join(projectRoot, 'library/mvc/service/factory/view-helper-manager-factory'));
const ViewHelperManager = require(path.join(projectRoot, 'library/mvc/view/view-helper-manager'));
const AbstractFactory = require(path.join(projectRoot, 'library/mvc/service/abstract-factory'));

describe('ViewHelperManagerFactory', () => {

  describe('inheritance', () => {
    it('should extend AbstractFactory', () => {
      const factory = new ViewHelperManagerFactory();
      expect(factory).toBeInstanceOf(AbstractFactory);
    });
  });

  describe('createService', () => {
    it('should throw if serviceManager is null', () => {
      const factory = new ViewHelperManagerFactory();
      expect(() => factory.createService(null)).toThrow('serviceManager is required');
    });

    it('should throw if serviceManager has no get method', () => {
      const factory = new ViewHelperManagerFactory();
      expect(() => factory.createService({})).toThrow('serviceManager is required');
    });

    it('should return a ViewHelperManager instance', () => {
      const sm = { get: jest.fn().mockReturnValue({}), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result).toBeInstanceOf(ViewHelperManager);
    });

    it('should handle Config service not being registered', () => {
      const sm = {
        get: jest.fn().mockImplementation((name) => {
          if (name === 'Config') throw new Error('Service not found');
        }),
        has: jest.fn()
      };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result).toBeInstanceOf(ViewHelperManager);
    });

    it('should handle Config returning null', () => {
      const sm = { get: jest.fn().mockReturnValue(null), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result).toBeInstanceOf(ViewHelperManager);
    });

    it('should pass view_helpers invokables from config', () => {
      const config = {
        view_helpers: {
          invokables: {
            myHelper: { class: '/application/view/helper/my-helper', params: [] }
          }
        }
      };
      const sm = { get: jest.fn().mockReturnValue(config), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result.has('myHelper')).toBe(true);
    });

    it('should pass view_helpers factories from config', () => {
      const config = {
        view_helpers: {
          factories: {
            myFactory: '/application/view/helper/factory/my-factory'
          }
        }
      };
      const sm = { get: jest.fn().mockReturnValue(config), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result.has('myFactory')).toBe(true);
    });

    it('should handle config with no view_helpers key', () => {
      const config = { someOtherKey: 'value' };
      const sm = { get: jest.fn().mockReturnValue(config), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result).toBeInstanceOf(ViewHelperManager);
    });

    it('should handle view_helpers that is not an object', () => {
      const config = { view_helpers: 'not-an-object' };
      const sm = { get: jest.fn().mockReturnValue(config), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result).toBeInstanceOf(ViewHelperManager);
    });

    it('should handle view_helpers with only invokables (no factories)', () => {
      const config = {
        view_helpers: {
          invokables: { custom: { class: '/app/helper', params: [] } }
        }
      };
      const sm = { get: jest.fn().mockReturnValue(config), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result).toBeInstanceOf(ViewHelperManager);
    });

    it('should handle view_helpers with only factories (no invokables)', () => {
      const config = {
        view_helpers: {
          factories: { custom: '/app/factory' }
        }
      };
      const sm = { get: jest.fn().mockReturnValue(config), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result).toBeInstanceOf(ViewHelperManager);
    });

    it('should pass serviceManager to ViewHelperManager', () => {
      const sm = { get: jest.fn().mockReturnValue({}), has: jest.fn() };
      const factory = new ViewHelperManagerFactory();
      const result = factory.createService(sm);
      expect(result.getServiceManager()).toBe(sm);
    });
  });
});
