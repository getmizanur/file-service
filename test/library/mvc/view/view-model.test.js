const ViewModel = require('../../../../library/mvc/view/view-model');

describe('ViewModel', () => {
  let vm;

  beforeEach(() => {
    vm = new ViewModel();
    // Clean up global nunjucks env if set
    delete globalThis.nunjucksEnv;
  });

  describe('constructor', () => {
    it('initializes with empty variables', () => {
      expect(vm.getVariables()).toEqual({});
    });

    it('initializes with null template', () => {
      expect(vm.getTemplate()).toBeNull();
    });
  });

  describe('setTemplate / getTemplate', () => {
    it('sets and gets the template', () => {
      vm.setTemplate('pages/index.njk');
      expect(vm.getTemplate()).toBe('pages/index.njk');
    });

    it('returns this for chaining', () => {
      expect(vm.setTemplate('t')).toBe(vm);
    });
  });

  describe('setVariable / getVariable', () => {
    it('sets and gets a variable', () => {
      vm.setVariable('title', 'Hello');
      expect(vm.getVariable('title')).toBe('Hello');
    });

    it('returns defaultValue when variable does not exist', () => {
      expect(vm.getVariable('missing', 'fallback')).toBe('fallback');
    });

    it('returns null as default when defaultValue not specified', () => {
      expect(vm.getVariable('missing')).toBeNull();
    });

    it('returns this for chaining', () => {
      expect(vm.setVariable('k', 'v')).toBe(vm);
    });

    it('can store falsy values', () => {
      vm.setVariable('zero', 0);
      vm.setVariable('empty', '');
      vm.setVariable('no', false);
      expect(vm.getVariable('zero', 'default')).toBe(0);
      expect(vm.getVariable('empty', 'default')).toBe('');
      expect(vm.getVariable('no', 'default')).toBe(false);
    });
  });

  describe('getVariables', () => {
    it('returns all variables', () => {
      vm.setVariable('a', 1);
      vm.setVariable('b', 2);
      expect(vm.getVariables()).toEqual({ a: 1, b: 2 });
    });
  });

  describe('setVariables', () => {
    it('sets multiple variables at once', () => {
      vm.setVariables({ x: 10, y: 20 });
      expect(vm.getVariable('x')).toBe(10);
      expect(vm.getVariable('y')).toBe(20);
    });

    it('returns this for chaining', () => {
      expect(vm.setVariables({ a: 1 })).toBe(vm);
    });

    it('returns this for null input', () => {
      expect(vm.setVariables(null)).toBe(vm);
    });

    it('returns this for non-object input', () => {
      expect(vm.setVariables('bad')).toBe(vm);
    });

    it('does not set inherited properties', () => {
      const parent = { inherited: true };
      const child = Object.create(parent);
      child.own = 'yes';
      vm.setVariables(child);
      expect(vm.getVariable('own')).toBe('yes');
      expect(vm.getVariable('inherited')).toBeNull();
    });
  });

  describe('clearVariables', () => {
    it('clears all variables', () => {
      vm.setVariable('a', 1);
      vm.clearVariables();
      expect(vm.getVariables()).toEqual({});
    });

    it('returns this for chaining', () => {
      expect(vm.clearVariables()).toBe(vm);
    });
  });

  describe('setViewHelperManager / getViewHelperManager', () => {
    it('sets and gets the view helper manager', () => {
      const manager = { get: jest.fn() };
      vm.setViewHelperManager(manager);
      expect(vm.getViewHelperManager()).toBe(manager);
    });

    it('returns null initially', () => {
      expect(vm.getViewHelperManager()).toBeNull();
    });

    it('returns this for chaining', () => {
      expect(vm.setViewHelperManager({})).toBe(vm);
    });
  });

  describe('getHelper', () => {
    it('throws when name is empty', () => {
      expect(() => vm.getHelper('')).toThrow('Helper name is required');
    });

    it('throws when name is null', () => {
      expect(() => vm.getHelper(null)).toThrow('Helper name is required');
    });

    it('returns cached helper on second call', () => {
      const helperObj = { render: jest.fn() };
      vm.setHelper('myHelper', helperObj);
      expect(vm.getHelper('myHelper')).toBe(helperObj);
    });

    it('resolves from ViewHelperManager when not cached', () => {
      const helperObj = { render: jest.fn() };
      const manager = { get: jest.fn().mockReturnValue(helperObj) };
      vm.setViewHelperManager(manager);
      const result = vm.getHelper('pagination');
      expect(manager.get).toHaveBeenCalledWith('pagination');
      expect(result).toBe(helperObj);
    });

    it('caches helper resolved from manager', () => {
      const helperObj = { render: jest.fn() };
      const manager = { get: jest.fn().mockReturnValue(helperObj) };
      vm.setViewHelperManager(manager);
      vm.getHelper('pagination');
      vm.getHelper('pagination');
      expect(manager.get).toHaveBeenCalledTimes(1);
    });

    it('falls back to nunjucks globals', () => {
      const helperObj = { render: jest.fn() };
      globalThis.nunjucksEnv = { globals: { legacyHelper: helperObj } };
      const result = vm.getHelper('legacyHelper');
      expect(result).toBe(helperObj);
    });

    it('throws when helper not found anywhere', () => {
      expect(() => vm.getHelper('nonExistent')).toThrow("Helper 'nonExistent' not found");
    });
  });

  describe('setHelper', () => {
    it('sets a helper by name', () => {
      const helperObj = { render: jest.fn() };
      vm.setHelper('test', helperObj);
      expect(vm.getHelper('test')).toBe(helperObj);
    });

    it('returns this for chaining', () => {
      expect(vm.setHelper('h', {})).toBe(vm);
    });
  });

  describe('clearHelpers', () => {
    it('clears cached helpers', () => {
      vm.setHelper('test', { render: jest.fn() });
      vm.clearHelpers();
      expect(() => vm.getHelper('test')).toThrow("Helper 'test' not found");
    });

    it('returns this for chaining', () => {
      expect(vm.clearHelpers()).toBe(vm);
    });
  });
});
