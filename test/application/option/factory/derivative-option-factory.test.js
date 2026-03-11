const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const DerivativeOptionFactory = require(path.join(
  projectRoot, 'application/option/factory/derivative-option-factory'
));
const AbstractFactory = require(path.join(
  projectRoot, 'library/mvc/service/abstract-factory'
));

describe('DerivativeOptionFactory', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof DerivativeOptionFactory).toBe('function');
    });

    it('should extend AbstractFactory', () => {
      const factory = new DerivativeOptionFactory();
      expect(factory).toBeInstanceOf(AbstractFactory);
    });
  });

  describe('prototype methods', () => {
    const proto = DerivativeOptionFactory.prototype;

    it('should have createService', () => {
      expect(typeof proto.createService).toBe('function');
    });

    it('should have getRequiredConfigKeys', () => {
      expect(typeof proto.getRequiredConfigKeys).toBe('function');
    });

    it('should have validateConfiguration', () => {
      expect(typeof proto.validateConfiguration).toBe('function');
    });
  });

  describe('createService()', () => {
    it('should return a DerivativeOption instance', () => {
      const factory = new DerivativeOptionFactory();
      const mockSm = {
        get: jest.fn().mockReturnValue({
          derivative_option: { soffice_bin: '/usr/bin/soffice' }
        })
      };
      const result = factory.createService(mockSm);
      expect(result).toBeDefined();
      expect(result.constructor.name).toBe('DerivativeOption');
    });

    it('should pass derivative_option config to DerivativeOption', () => {
      const factory = new DerivativeOptionFactory();
      const derivativeConfig = { soffice_bin: '/usr/bin/soffice' };
      const mockSm = {
        get: jest.fn().mockReturnValue({
          derivative_option: derivativeConfig
        })
      };
      const result = factory.createService(mockSm);
      expect(result).toBeDefined();
    });

    it('should handle missing derivative_option config gracefully', () => {
      const factory = new DerivativeOptionFactory();
      const mockSm = {
        get: jest.fn().mockReturnValue({})
      };
      const result = factory.createService(mockSm);
      expect(result).toBeDefined();
    });
  });

  describe('getRequiredConfigKeys()', () => {
    it('should return an array containing derivative_option', () => {
      const factory = new DerivativeOptionFactory();
      const keys = factory.getRequiredConfigKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toContain('derivative_option');
    });

    it('should return exactly one required key', () => {
      const factory = new DerivativeOptionFactory();
      expect(factory.getRequiredConfigKeys()).toHaveLength(1);
    });
  });

  describe('validateConfiguration()', () => {
    it('should return true when soffice_bin is a string', () => {
      const factory = new DerivativeOptionFactory();
      const config = { derivative_option: { soffice_bin: '/usr/bin/soffice' } };
      expect(factory.validateConfiguration(config)).toBe(true);
    });

    it('should return true when soffice_bin is null', () => {
      const factory = new DerivativeOptionFactory();
      const config = { derivative_option: { soffice_bin: null } };
      expect(factory.validateConfiguration(config)).toBe(true);
    });

    it('should return true when soffice_bin is not present', () => {
      const factory = new DerivativeOptionFactory();
      const config = { derivative_option: {} };
      expect(factory.validateConfiguration(config)).toBe(true);
    });

    it('should return false when soffice_bin is a number', () => {
      const factory = new DerivativeOptionFactory();
      const config = { derivative_option: { soffice_bin: 123 } };
      expect(factory.validateConfiguration(config)).toBe(false);
    });

    it('should return false when soffice_bin is a boolean', () => {
      const factory = new DerivativeOptionFactory();
      const config = { derivative_option: { soffice_bin: true } };
      expect(factory.validateConfiguration(config)).toBe(false);
    });

    it('should return true when config has no derivative_option key', () => {
      const factory = new DerivativeOptionFactory();
      expect(factory.validateConfiguration({})).toBe(true);
    });
  });
});
