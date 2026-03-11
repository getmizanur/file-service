const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const fs = require('node:fs');
const OnDemandCssHelper = require(globalThis.applicationPath('/application/helper/on-demand-css-helper'));

describe('OnDemandCssHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new OnDemandCssHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(OnDemandCssHelper);
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

    it('reads _moduleName from context and calls cssLinkTag', () => {
      const spy = jest.spyOn(helper, 'cssLinkTag').mockReturnValue('<style>body{}</style>');
      const ctx = { _moduleName: 'admin', _controllerName: 'index', _actionName: 'list', ctx: {}, env: {} };
      const html = helper.render(ctx);
      expect(spy).toHaveBeenCalledWith('admin', 'index', 'list');
      expect(html).toBe('<style>body{}</style>');
      spy.mockRestore();
    });
  });

  describe('cssLinkTag()', () => {
    it('returns empty string when no CSS files exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const html = helper.cssLinkTag('nonexistent');
      expect(html).toBe('');
      fs.existsSync.mockRestore();
    });

    it('returns style tag when module CSS exists', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('body { color: red; }');
      const html = helper.cssLinkTag('admin');
      expect(html).toContain('<style>');
      expect(html).toContain('body { color: red; }');
      expect(html).toContain('</style>');
      fs.existsSync.mockRestore();
      fs.readFileSync.mockRestore();
    });

    it('skips empty CSS files', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('   ');
      const html = helper.cssLinkTag('admin');
      expect(html).toBe('');
      fs.existsSync.mockRestore();
      fs.readFileSync.mockRestore();
    });
  });

  describe('_loadCssFile()', () => {
    it('returns null for non-existent file', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(helper._loadCssFile('/nonexistent.css')).toBeNull();
      fs.existsSync.mockRestore();
    });

    it('returns CSS content for existing file', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('.test { color: blue; }');
      expect(helper._loadCssFile('/test.css')).toBe('.test { color: blue; }');
      fs.existsSync.mockRestore();
      fs.readFileSync.mockRestore();
    });

    it('returns null for empty/whitespace-only file', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('   \n  ');
      expect(helper._loadCssFile('/empty.css')).toBeNull();
      fs.existsSync.mockRestore();
      fs.readFileSync.mockRestore();
    });

    it('returns null when readFileSync throws', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('read error'); });
      expect(helper._loadCssFile('/error.css')).toBeNull();
      fs.existsSync.mockRestore();
      fs.readFileSync.mockRestore();
    });
  });

  describe('cssLinkTag() with controller and action CSS', () => {
    it('combines module, controller, and action CSS', () => {
      let callCount = 0;
      jest.spyOn(fs, 'existsSync').mockImplementation(() => {
        callCount++;
        return true;
      });
      jest.spyOn(fs, 'readFileSync').mockReturnValue('.module { color: red; }');
      const html = helper.cssLinkTag('admin', 'index', 'list');
      expect(html).toContain('<style>');
      fs.existsSync.mockRestore();
      fs.readFileSync.mockRestore();
    });

    it('handles only module CSS when controller/action files do not exist', () => {
      let callIndex = 0;
      jest.spyOn(fs, 'existsSync').mockImplementation(() => {
        callIndex++;
        return callIndex === 1; // only first (module) exists
      });
      jest.spyOn(fs, 'readFileSync').mockReturnValue('.module { color: red; }');
      const html = helper.cssLinkTag('admin', 'index', 'list');
      expect(html).toContain('<style>');
      fs.existsSync.mockRestore();
      fs.readFileSync.mockRestore();
    });
  });
});
