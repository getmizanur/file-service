const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const AbstractFactory = require(path.join(projectRoot, 'library/mvc/service/abstract-factory'));

describe('AbstractFactory', () => {

  let factory;

  beforeEach(() => {
    factory = new AbstractFactory();
  });

  describe('createService()', () => {
    it('should throw "must be implemented by subclass"', () => {
      expect(() => factory.createService({})).toThrow('must be implemented by subclass');
    });
  });

  describe('static getFactoryVersion()', () => {
    it('should return "1.0.0"', () => {
      expect(AbstractFactory.getFactoryVersion()).toBe('1.0.0');
    });
  });

  describe('validateConfiguration()', () => {
    it('should return true by default', () => {
      expect(factory.validateConfiguration({})).toBe(true);
      expect(factory.validateConfiguration(null)).toBe(true);
    });
  });

  describe('getRequiredConfigKeys()', () => {
    it('should return an empty array by default', () => {
      expect(factory.getRequiredConfigKeys()).toEqual([]);
    });
  });

  describe('hasNestedKey()', () => {
    it('should return true for existing top-level keys', () => {
      expect(factory.hasNestedKey({ foo: 1 }, 'foo')).toBe(true);
    });

    it('should return true for nested keys via dot path', () => {
      expect(factory.hasNestedKey({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(true);
    });

    it('should return false for missing nested keys', () => {
      expect(factory.hasNestedKey({ a: { b: 1 } }, 'a.b.c')).toBe(false);
    });

    it('should return false for missing top-level keys', () => {
      expect(factory.hasNestedKey({ foo: 1 }, 'bar')).toBe(false);
    });

    it('should return false for null/undefined obj', () => {
      expect(factory.hasNestedKey(null, 'foo')).toBe(false);
      expect(factory.hasNestedKey(undefined, 'foo')).toBe(false);
    });

    it('should return false for non-object obj', () => {
      expect(factory.hasNestedKey('string', 'length')).toBe(false);
    });

    it('should return false when intermediate key is null', () => {
      expect(factory.hasNestedKey({ a: null }, 'a.b')).toBe(false);
    });

    it('should handle keys whose value is null or falsy', () => {
      expect(factory.hasNestedKey({ a: null }, 'a')).toBe(true);
      expect(factory.hasNestedKey({ a: 0 }, 'a')).toBe(true);
      expect(factory.hasNestedKey({ a: false }, 'a')).toBe(true);
    });
  });

  describe('getNestedConfig()', () => {
    it('should retrieve a nested value', () => {
      expect(factory.getNestedConfig({ a: { b: 42 } }, 'a.b')).toBe(42);
    });

    it('should return default when key is missing', () => {
      expect(factory.getNestedConfig({ a: 1 }, 'b', 'default')).toBe('default');
    });

    it('should return null as default when no default provided', () => {
      expect(factory.getNestedConfig({}, 'x')).toBeNull();
    });

    it('should return default for null/undefined obj', () => {
      expect(factory.getNestedConfig(null, 'a', 'fallback')).toBe('fallback');
      expect(factory.getNestedConfig(undefined, 'a', 'fallback')).toBe('fallback');
    });

    it('should return default for non-object obj', () => {
      expect(factory.getNestedConfig(42, 'a')).toBeNull();
    });

    it('should return default when intermediate is null', () => {
      expect(factory.getNestedConfig({ a: null }, 'a.b', 'def')).toBe('def');
    });

    it('should return the value even if it is falsy', () => {
      expect(factory.getNestedConfig({ a: 0 }, 'a')).toBe(0);
      expect(factory.getNestedConfig({ a: false }, 'a')).toBe(false);
      expect(factory.getNestedConfig({ a: '' }, 'a')).toBe('');
    });

    it('should handle single-level key', () => {
      expect(factory.getNestedConfig({ x: 'y' }, 'x')).toBe('y');
    });
  });

  describe('validateRequiredConfig()', () => {

    class StrictFactory extends AbstractFactory {
      getRequiredConfigKeys() {
        return ['database.host', 'database.port', 'app.name'];
      }
    }

    let strict;

    beforeEach(() => {
      strict = new StrictFactory();
    });

    it('should return true when all required keys exist', () => {
      const config = { database: { host: 'localhost', port: 3306 }, app: { name: 'test' } };
      expect(strict.validateRequiredConfig(config)).toBe(true);
    });

    it('should return false when a required key is missing', () => {
      const config = { database: { host: 'localhost' }, app: { name: 'test' } };
      expect(strict.validateRequiredConfig(config)).toBe(false);
    });

    it('should return { ok, errors } when returnErrors is true', () => {
      const config = { database: { host: 'localhost' } };
      const result = strict.validateRequiredConfig(config, { returnErrors: true });
      expect(result.ok).toBe(false);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.errors.length).toBe(2); // missing database.port and app.name
      expect(result.errors[0]).toContain('database.port');
    });

    it('should return { ok: true, errors: [] } with returnErrors when all keys present', () => {
      const config = { database: { host: 'localhost', port: 3306 }, app: { name: 'test' } };
      const result = strict.validateRequiredConfig(config, { returnErrors: true });
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return true for base factory with no required keys', () => {
      expect(factory.validateRequiredConfig({})).toBe(true);
    });
  });

  describe('normalizeValidationResult()', () => {
    it('should normalize boolean true', () => {
      const result = factory.normalizeValidationResult(true);
      expect(result).toEqual({ ok: true, errors: [] });
    });

    it('should normalize boolean false', () => {
      const result = factory.normalizeValidationResult(false);
      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should normalize an object result', () => {
      const input = { ok: false, errors: ['bad config'] };
      const result = factory.normalizeValidationResult(input);
      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(['bad config']);
    });

    it('should normalize an object with no errors array', () => {
      const result = factory.normalizeValidationResult({ ok: true });
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle object with non-array errors', () => {
      const result = factory.normalizeValidationResult({ ok: true, errors: 'not array' });
      expect(result.errors).toEqual([]);
    });

    it('should return { ok: true, errors: [] } for invalid input (not boolean, not object)', () => {
      expect(factory.normalizeValidationResult(null)).toEqual({ ok: true, errors: [] });
      expect(factory.normalizeValidationResult(undefined)).toEqual({ ok: true, errors: [] });
      expect(factory.normalizeValidationResult(42)).toEqual({ ok: true, errors: [] });
    });
  });
});
