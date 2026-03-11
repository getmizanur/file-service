const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const ViewHelperManager = require(path.join(projectRoot, 'library/mvc/view/view-helper-manager'));

describe('ViewHelperManager', () => {
  describe('constructor', () => {
    it('should create with defaults', () => {
      const mgr = new ViewHelperManager();
      expect(mgr.instances).toEqual({});
      expect(mgr.serviceManager).toBeNull();
      expect(mgr.context).toBeNull();
    });

    it('should accept application helpers and serviceManager', () => {
      const sm = { get: jest.fn() };
      const mgr = new ViewHelperManager({ myHelper: { class: '/some/path' } }, sm);
      expect(mgr.serviceManager).toBe(sm);
      expect(mgr.applicationHelpers.myHelper).toBeDefined();
    });

    it('should accept helpers with invokables/factories format', () => {
      const mgr = new ViewHelperManager({
        invokables: { custom: { class: '/custom/helper' } },
        factories: { customFactory: '/custom/factory' }
      });
      expect(mgr.applicationHelpers.custom).toBeDefined();
      expect(mgr.applicationFactories.customFactory).toBeDefined();
    });

    it('should throw on framework helper conflicts', () => {
      expect(() => new ViewHelperManager({ form: { class: '/override' } }))
        .toThrow(/cannot override framework helpers/);
    });
  });

  describe('setContext / getContext', () => {
    it('should set and get context', () => {
      const mgr = new ViewHelperManager();
      const ctx = { title: 'test' };
      expect(mgr.setContext(ctx)).toBe(mgr);
      expect(mgr.getContext()).toBe(ctx);
    });

    it('should set null for falsy context', () => {
      const mgr = new ViewHelperManager();
      mgr.setContext({ title: 'test' });
      mgr.setContext(null);
      expect(mgr.getContext()).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear instances and context', () => {
      const mgr = new ViewHelperManager();
      mgr.instances.foo = {};
      mgr.context = { x: 1 };
      expect(mgr.reset()).toBe(mgr);
      expect(mgr.instances).toEqual({});
      expect(mgr.context).toBeNull();
    });
  });

  describe('getAllHelpers / getFrameworkHelpers', () => {
    it('should return framework helpers', () => {
      const mgr = new ViewHelperManager();
      const helpers = mgr.getFrameworkHelpers();
      expect(helpers.form).toBeDefined();
      expect(helpers.formText).toBeDefined();
      expect(helpers.escapeHtml).toBeDefined();
    });

    it('should merge application helpers', () => {
      const mgr = new ViewHelperManager({ myHelper: { class: '/my/helper' } });
      const all = mgr.getAllHelpers({ myHelper2: { class: '/my/helper2' } });
      expect(all.form).toBeDefined();
      expect(all.myHelper2).toBeDefined();
    });
  });

  describe('isFrameworkHelper', () => {
    it('should return true for framework invokable', () => {
      const mgr = new ViewHelperManager();
      expect(mgr.isFrameworkHelper('form')).toBe(true);
    });

    it('should return true for framework factory', () => {
      const mgr = new ViewHelperManager();
      expect(mgr.isFrameworkHelper('headTitle')).toBe(true);
    });

    it('should return false for unknown helper', () => {
      const mgr = new ViewHelperManager();
      expect(mgr.isFrameworkHelper('customThing')).toBe(false);
    });
  });

  describe('getFrameworkHelperNames', () => {
    it('should return all framework helper names', () => {
      const mgr = new ViewHelperManager();
      const names = mgr.getFrameworkHelperNames();
      expect(names).toContain('form');
      expect(names).toContain('headTitle');
      expect(names).toContain('url');
    });
  });

  describe('validateApplicationHelpers', () => {
    it('should return empty for non-conflicting', () => {
      const mgr = new ViewHelperManager();
      expect(mgr.validateApplicationHelpers({ myHelper: '/path' })).toEqual([]);
    });

    it('should return conflicts for framework names', () => {
      const mgr = new ViewHelperManager();
      const conflicts = mgr.validateApplicationHelpers({ form: '/path' });
      expect(conflicts).toContain('form');
    });
  });

  describe('has', () => {
    it('should find framework helpers', () => {
      const mgr = new ViewHelperManager();
      expect(mgr.has('form')).toBe(true);
      expect(mgr.has('headTitle')).toBe(true);
    });

    it('should find application helpers', () => {
      const mgr = new ViewHelperManager({ myHelper: { class: '/path' } });
      expect(mgr.has('myHelper')).toBe(true);
    });

    it('should return false for unknown', () => {
      const mgr = new ViewHelperManager();
      expect(mgr.has('unknown')).toBe(false);
    });
  });

  describe('get', () => {
    it('should instantiate and cache framework invokable', () => {
      const mgr = new ViewHelperManager();
      const helper = mgr.get('form');
      expect(helper).toBeDefined();
      // Should cache
      expect(mgr.get('form')).toBe(helper);
    });

    it('should throw for unknown helper', () => {
      const mgr = new ViewHelperManager();
      expect(() => mgr.get('nonExistent')).toThrow("Helper 'nonExistent' not found");
    });

    it('should apply context to helper if supported', () => {
      const mgr = new ViewHelperManager();
      const ctx = { title: 'test' };
      mgr.setContext(ctx);
      const helper = mgr.get('form');
      // Form extends AbstractHelper which has setContext
      expect(helper.nunjucksContext).toBe(ctx);
    });
  });

  describe('getAvailableHelpers', () => {
    it('should list all available helper names', () => {
      const mgr = new ViewHelperManager({ myHelper: { class: '/path' } });
      const available = mgr.getAvailableHelpers();
      expect(available).toContain('form');
      expect(available).toContain('myHelper');
    });
  });

  describe('syncToViewModel', () => {
    it('should skip null viewModel', () => {
      const mgr = new ViewHelperManager();
      expect(() => mgr.syncToViewModel(null)).not.toThrow();
    });

    it('should call syncToViewModel on cached instances', () => {
      const mgr = new ViewHelperManager();
      const mockInstance = { syncToViewModel: jest.fn() };
      mgr.instances.test = mockInstance;
      const viewModel = { setVariable: jest.fn() };
      mgr.syncToViewModel(viewModel);
      expect(mockInstance.syncToViewModel).toHaveBeenCalledWith(viewModel);
    });

    it('should skip instances without syncToViewModel', () => {
      const mgr = new ViewHelperManager();
      mgr.instances.test = {};
      expect(() => mgr.syncToViewModel({ setVariable: jest.fn() })).not.toThrow();
    });
  });

  describe('getServiceManager / setServiceManager', () => {
    it('should get and set service manager', () => {
      const mgr = new ViewHelperManager();
      const sm = { get: jest.fn() };
      expect(mgr.setServiceManager(sm)).toBe(mgr);
      expect(mgr.getServiceManager()).toBe(sm);
    });
  });

  describe('get - factory helpers', () => {
    it('should instantiate framework factory helper (headTitle)', () => {
      const sm = { get: jest.fn() };
      const mgr = new ViewHelperManager({}, sm);
      const helper = mgr.get('headTitle');
      expect(helper).toBeDefined();
      // Should cache
      expect(mgr.get('headTitle')).toBe(helper);
    });

    it('should instantiate application invokable helper', () => {
      const mgr = new ViewHelperManager({
        myHelper: { class: '/library/mvc/view/helper/escape-html' }
      });
      const helper = mgr.get('myHelper');
      expect(helper).toBeDefined();
      // Should cache
      expect(mgr.get('myHelper')).toBe(helper);
    });

    it('should instantiate application invokable with string path', () => {
      const mgr = new ViewHelperManager({
        myHelper: '/library/mvc/view/helper/escape-html'
      });
      const helper = mgr.get('myHelper');
      expect(helper).toBeDefined();
    });

    it('should instantiate application factory helper', () => {
      const sm = { get: jest.fn() };
      const mgr = new ViewHelperManager({
        invokables: {},
        factories: { myFactory: '/library/mvc/view/helper/factory/head-title-factory' }
      }, sm);
      const helper = mgr.get('myFactory');
      expect(helper).toBeDefined();
    });
  });

  describe('_applyContext', () => {
    it('should not throw for instance without setContext', () => {
      const mgr = new ViewHelperManager();
      mgr.context = { test: true };
      const instance = {};
      expect(() => mgr._applyContext(instance)).not.toThrow();
    });

    it('should not apply context when context is null', () => {
      const mgr = new ViewHelperManager();
      const instance = { setContext: jest.fn() };
      mgr._applyContext(instance);
      expect(instance.setContext).not.toHaveBeenCalled();
    });
  });

  describe('branch coverage', () => {
    it('should handle constructor with plain object (no invokables key) (line 13 fallback)', () => {
      const mgr = new ViewHelperManager({ myHelper: { class: '/some/path' } });
      // applicationHelpers.invokables is undefined, so falls through to applicationHelpers itself
      expect(mgr.applicationHelpers.myHelper).toBeDefined();
    });

    it('should handle constructor with undefined (line 13 default param)', () => {
      const mgr = new ViewHelperManager(undefined);
      expect(mgr.applicationHelpers).toEqual({});
    });

    it('should handle getAllHelpers with invokables format (line 92-93)', () => {
      const mgr = new ViewHelperManager();
      const all = mgr.getAllHelpers({
        invokables: { custom: { class: '/custom/helper' } }
      });
      expect(all.custom).toBeDefined();
      expect(all.form).toBeDefined();
    });

    it('should handle getAllHelpers with no args (line 92-93 default param)', () => {
      const mgr = new ViewHelperManager();
      const all = mgr.getAllHelpers();
      expect(all.form).toBeDefined();
    });

    it('should handle validateApplicationHelpers with invokables format (line 117)', () => {
      const mgr = new ViewHelperManager();
      const conflicts = mgr.validateApplicationHelpers({
        invokables: { form: '/path' },
        factories: { headTitle: '/path' }
      });
      expect(conflicts).toContain('form');
      expect(conflicts).toContain('headTitle');
    });

    it('should handle validateApplicationHelpers with no args (line 117-118 defaults)', () => {
      const mgr = new ViewHelperManager();
      const conflicts = mgr.validateApplicationHelpers();
      expect(conflicts).toEqual([]);
    });

    it('should handle _checkConflicts invokable matching factory name (line 127)', () => {
      const mgr = new ViewHelperManager();
      const conflicts = mgr._checkConflicts({ headTitle: '/path' }, {});
      expect(conflicts).toContain('headTitle');
    });

    it('should handle _checkConflicts factory matching invokable name (line 131)', () => {
      const mgr = new ViewHelperManager();
      const conflicts = mgr._checkConflicts({}, { form: '/path' });
      expect(conflicts).toContain('form');
    });

    it('should handle getAvailableHelpers with application factories (line 221)', () => {
      const mgr = new ViewHelperManager({
        invokables: { myHelper: { class: '/path' } },
        factories: { myFactory: '/factory/path' }
      });
      const available = mgr.getAvailableHelpers();
      expect(available).toContain('myHelper');
      expect(available).toContain('myFactory');
      expect(available).toContain('form');
      expect(available).toContain('headTitle');
    });

    it('should handle syncToViewModel with object missing setVariable (line 233)', () => {
      const mgr = new ViewHelperManager();
      expect(() => mgr.syncToViewModel({})).not.toThrow();
    });

    it('should handle getFrameworkHelperNames including factories (line 112)', () => {
      const mgr = new ViewHelperManager();
      const names = mgr.getFrameworkHelperNames();
      expect(names).toContain('headTitle');
      expect(names).toContain('url');
      expect(names).toContain('params');
    });
  });

  describe('_checkConflicts', () => {
    it('should detect factory conflicts', () => {
      const mgr = new ViewHelperManager();
      const conflicts = mgr._checkConflicts({}, { headTitle: '/path' });
      expect(conflicts).toContain('headTitle');
    });

    it('should handle null inputs', () => {
      const mgr = new ViewHelperManager();
      const conflicts = mgr._checkConflicts(null, null);
      expect(conflicts).toEqual([]);
    });
  });

  describe('has with application factories', () => {
    it('should find application factory', () => {
      const mgr = new ViewHelperManager({
        invokables: {},
        factories: { myFactory: '/some/factory' }
      });
      expect(mgr.has('myFactory')).toBe(true);
    });
  });
});
