const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const ViewModel = require(path.join(projectRoot, 'library/mvc/view/view-model'));

describe('ViewModel', () => {
  let vm;

  beforeEach(() => {
    vm = new ViewModel();
  });

  describe('template', () => {
    it('should default to null', () => {
      expect(vm.getTemplate()).toBeNull();
    });

    it('should set/get template with fluent interface', () => {
      expect(vm.setTemplate('index.njk')).toBe(vm);
      expect(vm.getTemplate()).toBe('index.njk');
    });
  });

  describe('variables', () => {
    it('should set/get variable', () => {
      expect(vm.setVariable('title', 'Hello')).toBe(vm);
      expect(vm.getVariable('title')).toBe('Hello');
    });

    it('should return default for missing variable', () => {
      expect(vm.getVariable('missing')).toBeNull();
      expect(vm.getVariable('missing', 'fallback')).toBe('fallback');
    });

    it('should set multiple variables', () => {
      expect(vm.setVariables({ a: 1, b: 2 })).toBe(vm);
      expect(vm.getVariable('a')).toBe(1);
      expect(vm.getVariable('b')).toBe(2);
    });

    it('should skip inherited properties in setVariables', () => {
      const obj = Object.create({ inherited: 'yes' });
      obj.own = 'val';
      vm.setVariables(obj);
      expect(vm.getVariable('own')).toBe('val');
      expect(vm.getVariable('inherited')).toBeNull();
    });

    it('should handle null/non-object in setVariables', () => {
      expect(vm.setVariables(null)).toBe(vm);
      expect(vm.setVariables('string')).toBe(vm);
    });

    it('should return all variables', () => {
      vm.setVariable('x', 1);
      expect(vm.getVariables()).toEqual({ x: 1 });
    });

    it('should clear variables', () => {
      vm.setVariable('x', 1);
      expect(vm.clearVariables()).toBe(vm);
      expect(vm.getVariables()).toEqual({});
    });
  });

  describe('helpers', () => {
    it('should set/get helper explicitly', () => {
      const helper = { render: jest.fn() };
      expect(vm.setHelper('test', helper)).toBe(vm);
      expect(vm.getHelper('test')).toBe(helper);
    });

    it('should throw when name is empty', () => {
      expect(() => vm.getHelper('')).toThrow('Helper name is required');
    });

    it('should return cached helper on second call', () => {
      const helper = { render: jest.fn() };
      vm.setHelper('cached', helper);
      expect(vm.getHelper('cached')).toBe(helper);
      expect(vm.getHelper('cached')).toBe(helper);
    });

    it('should resolve from ViewHelperManager', () => {
      const helper = { render: jest.fn() };
      const mgr = { get: jest.fn(() => helper) };
      vm.setViewHelperManager(mgr);
      expect(vm.getHelper('url')).toBe(helper);
      expect(mgr.get).toHaveBeenCalledWith('url');
    });

    it('should resolve from nunjucks globals as fallback', () => {
      const helper = { render: jest.fn() };
      globalThis.nunjucksEnv = { globals: { myHelper: helper } };
      expect(vm.getHelper('myHelper')).toBe(helper);
      delete globalThis.nunjucksEnv;
    });

    it('should throw when helper not found', () => {
      expect(() => vm.getHelper('nonexistent')).toThrow("Helper 'nonexistent' not found");
    });

    it('should clear helpers', () => {
      vm.setHelper('test', {});
      expect(vm.clearHelpers()).toBe(vm);
      expect(() => vm.getHelper('test')).toThrow();
    });
  });

  describe('viewHelperManager', () => {
    it('should set/get viewHelperManager', () => {
      const mgr = { get: jest.fn() };
      expect(vm.setViewHelperManager(mgr)).toBe(vm);
      expect(vm.getViewHelperManager()).toBe(mgr);
    });

    it('should default to null', () => {
      expect(vm.getViewHelperManager()).toBeNull();
    });
  });
});
