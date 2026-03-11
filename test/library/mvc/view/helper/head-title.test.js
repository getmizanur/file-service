const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const HeadTitle = require(path.join(projectRoot, 'library/mvc/view/helper/head-title'));

describe('HeadTitle', () => {
  let helper;

  beforeEach(() => {
    helper = new HeadTitle();
  });

  describe('constructor', () => {
    it('should have default separator and title', () => {
      expect(helper.separator).toBe(' - ');
      expect(helper.defaultTitle).toBe('Daily Politics');
    });
  });

  describe('render (no context - fallback mode)', () => {
    it('should return default title when no titles set', () => {
      expect(helper.render(null)).toBe('Daily Politics');
    });

    it('should set title', () => {
      const result = helper.render('Admin');
      expect(result).toBe('Admin');
    });

    it('should append title', () => {
      helper.render('Admin');
      const result = helper.render('Dashboard', 'append');
      expect(result).toBe('Admin - Dashboard');
    });

    it('should prepend title', () => {
      helper.render('Dashboard');
      const result = helper.render('Admin', 'prepend');
      expect(result).toBe('Admin - Dashboard');
    });

    it('should render via "render" sentinel', () => {
      helper.render('Page Title');
      const result = helper.render('render');
      expect(result).toBe('Page Title');
    });

    it('should handle unknown mode as set', () => {
      helper.render('First');
      helper.render('Second', 'unknownMode');
      expect(helper.render(null)).toBe('Second');
    });
  });

  describe('render (with context)', () => {
    it('should use context storage', () => {
      const ctx = { ctx: {} };
      helper.render('Page', 'set', ctx);
      const result = helper.render(null, 'render', ctx);
      expect(result).toBe('Page');
    });
  });

  describe('set / append / prepend', () => {
    it('set should replace titles', () => {
      helper.set('Only This');
      expect(helper.getTitles()).toEqual(['Only This']);
    });

    it('append should add to end', () => {
      helper.set('First');
      helper.append('Second');
      expect(helper.getTitles()).toEqual(['First', 'Second']);
    });

    it('prepend should add to beginning', () => {
      helper.set('Second');
      helper.prepend('First');
      expect(helper.getTitles()).toEqual(['First', 'Second']);
    });

    it('should return this for chaining', () => {
      expect(helper.set('A')).toBe(helper);
      expect(helper.append('B')).toBe(helper);
      expect(helper.prepend('C')).toBe(helper);
    });
  });

  describe('setSeparator / setDefaultTitle', () => {
    it('should change separator', () => {
      helper.setSeparator(' | ');
      helper.set('A');
      helper.append('B');
      expect(helper.toString()).toBe('A | B');
    });

    it('should change default title', () => {
      helper.setDefaultTitle('My Site');
      expect(helper.render(null)).toBe('My Site');
    });

    it('should return this', () => {
      expect(helper.setSeparator(' | ')).toBe(helper);
      expect(helper.setDefaultTitle('X')).toBe(helper);
    });
  });

  describe('clear / isEmpty', () => {
    it('should clear all titles', () => {
      helper.set('Title');
      helper.clear();
      expect(helper.isEmpty()).toBe(true);
    });

    it('clear should return this', () => {
      expect(helper.clear()).toBe(helper);
    });

    it('isEmpty should be true initially', () => {
      expect(helper.isEmpty()).toBe(true);
    });
  });

  describe('setServiceManager', () => {
    it('should set service manager and return this', () => {
      const sm = {};
      expect(helper.setServiceManager(sm)).toBe(helper);
      expect(helper.serviceManager).toBe(sm);
    });
  });

  describe('syncToViewModel', () => {
    it('should sync titles to viewModel', () => {
      helper.set('Admin');
      const vm = { setVariable: jest.fn() };
      helper.syncToViewModel(vm);
      expect(vm.setVariable).toHaveBeenCalledWith('_headTitleParts', ['Admin']);
    });

    it('should not sync when empty', () => {
      const vm = { setVariable: jest.fn() };
      helper.syncToViewModel(vm);
      expect(vm.setVariable).not.toHaveBeenCalled();
    });

    it('should handle null viewModel', () => {
      helper.set('Title');
      expect(() => helper.syncToViewModel(null)).not.toThrow();
    });
  });

  describe('branch coverage', () => {
    it('should handle this.titles being non-array in _getTitles (line 34)', () => {
      helper.titles = 'not-an-array';
      expect(helper.getTitles()).toEqual([]);
    });

    it('should handle non-array titles in _setTitles (line 42)', () => {
      helper._setTitles('not-an-array');
      expect(helper.titles).toEqual([]);
    });

    it('should handle append when _getTitles returns non-array-like (line 93)', () => {
      helper.titles = null;
      const result = helper.render('New', 'append');
      expect(result).toBe('New');
    });

    it('should handle prepend when _getTitles returns non-array-like (line 98)', () => {
      helper.titles = null;
      const result = helper.render('New', 'prepend');
      expect(result).toBe('New');
    });

    it('should return [] when context has non-array _headTitleParts (line 29-30)', () => {
      const ctx = { ctx: {} };
      helper.setContext(ctx);
      helper.setVariable('_headTitleParts', 'not-array');
      expect(helper.getTitles()).toEqual([]);
      helper.clearContext();
    });

    it('should render mode=render with no prior titles in context', () => {
      const ctx = { ctx: {} };
      const result = helper.render(null, 'render', ctx);
      expect(result).toBe('Daily Politics');
    });

    it('should handle syncToViewModel with viewModel lacking setVariable (line 174)', () => {
      helper.set('Title');
      expect(() => helper.syncToViewModel({})).not.toThrow();
    });
  });

  describe('toString', () => {
    it('should render to string', () => {
      helper.set('A');
      helper.append('B');
      expect(helper.toString()).toBe('A - B');
    });

    it('should return default when empty', () => {
      expect(helper.toString()).toBe('Daily Politics');
    });
  });
});
