const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const fs = require('node:fs');
const OnDemandJsHelper = require(globalThis.applicationPath('/application/helper/on-demand-js-helper'));

describe('OnDemandJsHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new OnDemandJsHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(OnDemandJsHelper);
  });

  describe('render()', () => {
    it('returns empty string when no context provided', () => {
      const html = helper.render();
      expect(html).toBe('');
    });

    it('returns empty string when context has no _moduleName', () => {
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(html).toBe('');
    });

    it('reads _moduleName from context and calls jsScriptTag', () => {
      const spy = jest.spyOn(helper, 'jsScriptTag').mockReturnValue('<script src="/js/module/admin.js"></script>');
      const ctx = { _moduleName: 'admin', _controllerName: 'index', _actionName: 'list', ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(spy).toHaveBeenCalledWith('admin', 'index', 'list');
      expect(html).toContain('<script');
      spy.mockRestore();
    });
  });

  describe('jsScriptTag()', () => {
    it('returns empty string when no JS files exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const html = helper.jsScriptTag('nonexistent');
      expect(html).toBe('');
      fs.existsSync.mockRestore();
    });

    it('returns script tag for module JS', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const html = helper.jsScriptTag('admin');
      expect(html).toContain('<script src="/js/module/admin.js"></script>');
      fs.existsSync.mockRestore();
    });

    it('returns script tags for module and controller JS', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const html = helper.jsScriptTag('admin', 'index');
      expect(html).toContain('/js/module/admin.js');
      expect(html).toContain('/js/module/admin/index.js');
      fs.existsSync.mockRestore();
    });

    it('returns script tags for module, controller, and action JS', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const html = helper.jsScriptTag('admin', 'index', 'list');
      expect(html).toContain('/js/module/admin.js');
      expect(html).toContain('/js/module/admin/index.js');
      expect(html).toContain('/js/module/admin/index/list.js');
      fs.existsSync.mockRestore();
    });

    it('skips non-existent controller and action JS', () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        return p.endsWith('admin.js') && !p.includes('/admin/');
      });
      const html = helper.jsScriptTag('admin', 'index', 'list');
      expect(html).toContain('/js/module/admin.js');
      expect(html).not.toContain('/js/module/admin/index.js');
      expect(html).not.toContain('/js/module/admin/index/list.js');
      fs.existsSync.mockRestore();
    });
  });
});
