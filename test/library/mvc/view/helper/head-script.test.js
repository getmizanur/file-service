const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const HeadScript = require(path.join(projectRoot, 'library/mvc/view/helper/head-script'));

describe('HeadScript', () => {
  let helper, ctx;

  beforeEach(() => {
    helper = new HeadScript();
    ctx = { ctx: {} };
  });

  it('should render empty when no scripts', () => {
    expect(helper.render(null, 'append', {}, ctx)).toBe('');
  });

  it('should add script by URL string', () => {
    helper.render('/app.js', 'append', {}, ctx);
    const result = helper.render(null, 'append', {}, ctx);
    expect(result).toContain('<script');
    expect(result).toContain('src="/app.js"');
    expect(result).toContain('type="text/javascript"');
  });

  it('should add script by object', () => {
    helper.render({ src: '/custom.js', type: 'module' }, 'append', {}, ctx);
    const result = helper.render(null, 'append', {}, ctx);
    expect(result).toContain('src="/custom.js"');
    expect(result).toContain('type="module"');
  });

  it('should prepend scripts', () => {
    helper.render('/first.js', 'append', {}, ctx);
    helper.render('/zero.js', 'prepend', {}, ctx);
    const result = helper.render(null, 'append', {}, ctx);
    const zeroIdx = result.indexOf('/zero.js');
    const firstIdx = result.indexOf('/first.js');
    expect(zeroIdx).toBeLessThan(firstIdx);
  });

  it('should set mode - replace all', () => {
    helper.render('/old.js', 'append', {}, ctx);
    helper.render('/new.js', 'set', {}, ctx);
    const result = helper.render(null, 'append', {}, ctx);
    expect(result).not.toContain('/old.js');
    expect(result).toContain('/new.js');
  });

  it('should render via "render" sentinel', () => {
    helper.render('/app.js', 'append', {}, ctx);
    const result = helper.render('render', 'append', {}, ctx);
    expect(result).toContain('<script');
  });

  it('should handle async and defer attributes', () => {
    helper.render('/async.js', 'append', { async: true, defer: true }, ctx);
    const result = helper.render(null, 'append', {}, ctx);
    expect(result).toContain('async');
    expect(result).toContain('defer');
  });

  it('should handle integrity, crossorigin, nonce', () => {
    helper.render({ src: '/a.js', integrity: 'sha256-xxx', crossorigin: 'anonymous', nonce: 'abc' }, 'append', {}, ctx);
    const result = helper.render(null, 'append', {}, ctx);
    expect(result).toContain('integrity="sha256-xxx"');
    expect(result).toContain('crossorigin="anonymous"');
    expect(result).toContain('nonce="abc"');
  });

  it('should handle referrerpolicy', () => {
    helper.render({ src: '/a.js', referrerpolicy: 'no-referrer' }, 'append', {}, ctx);
    const result = helper.render(null, 'append', {}, ctx);
    expect(result).toContain('referrerpolicy="no-referrer"');
  });

  it('should render inline script content', () => {
    helper.render({ content: 'console.log("hi")' }, 'append', {}, ctx);
    const result = helper.render(null, 'append', {}, ctx);
    expect(result).toContain('console.log("hi")');
  });

  it('should return empty for array/invalid input', () => {
    const result = helper.render([1, 2], 'append', {}, ctx);
    expect(result).toBe('');
  });

  describe('convenience methods', () => {
    it('append should return this', () => {
      // append calls render which uses withContext - just verify return value
      expect(helper.append('/a.js')).toBe(helper);
    });

    it('prepend should return this', () => {
      expect(helper.prepend('/a.js')).toBe(helper);
    });
  });

  describe('clear / isEmpty / toString', () => {
    it('isEmpty should return true initially (no context)', () => {
      expect(helper.isEmpty()).toBe(true);
    });

    it('toString should return empty when no scripts', () => {
      expect(helper.toString()).toBe('');
    });

    it('_renderScripts should render from array', () => {
      const result = helper._renderScripts([{ src: '/a.js' }]);
      expect(result).toContain('/a.js');
    });

    it('clear should reset scripts and return this (lines 162-163)', () => {
      helper.setContext(ctx);
      helper.setVariable('_headScriptParts', [{ src: '/a.js' }]);
      const result = helper.clear();
      expect(result).toBe(helper);
      const scripts = helper.getVariable('_headScriptParts', []);
      expect(scripts).toEqual([]);
      helper.clearContext();
    });

    it('isEmpty should return false after adding scripts with context', () => {
      helper.render('/app.js', 'append', {}, ctx);
      helper.setContext(ctx);
      expect(helper.isEmpty()).toBe(false);
      helper.clearContext();
    });

    it('toString should return scripts when present with context', () => {
      helper.render('/app.js', 'append', {}, ctx);
      helper.setContext(ctx);
      const result = helper.toString();
      expect(result).toContain('/app.js');
      helper.clearContext();
    });
  });

  describe('branch coverage', () => {
    it('should handle scripts being non-array in context (line 30)', () => {
      helper.setContext(ctx);
      helper.setVariable('_headScriptParts', 'not-an-array');
      const result = helper.render(null, 'append', {}, ctx);
      expect(result).toBe('');
      helper.clearContext();
    });

    it('should handle attributes being non-object string (line 42)', () => {
      helper.render('/app.js', 'append', 'not-an-object', ctx);
      const result = helper.render(null, 'append', {}, ctx);
      expect(result).toContain('/app.js');
    });

    it('should handle attributes being null (line 42)', () => {
      helper.render('/app.js', 'append', null, ctx);
      const result = helper.render(null, 'append', {}, ctx);
      expect(result).toContain('/app.js');
    });

    it('should handle render mode="render" explicitly (line 33)', () => {
      helper.render('/app.js', 'append', {}, ctx);
      const result = helper.render('/ignored.js', 'render', {}, ctx);
      expect(result).toContain('/app.js');
      expect(result).not.toContain('/ignored.js');
    });

    it('should handle script without src (no src attribute in output)', () => {
      const result = helper._renderScriptTag({ type: 'module' });
      expect(result).toContain('type="module"');
      expect(result).not.toContain('src=');
    });

    it('should handle non-object _renderScriptTag (line 93)', () => {
      expect(helper._renderScriptTag('string')).toBe('');
      expect(helper._renderScriptTag(123)).toBe('');
    });
  });

  describe('_renderScriptTag', () => {
    it('should return empty for null', () => {
      expect(helper._renderScriptTag(null)).toBe('');
    });

    it('should handle async as string', () => {
      const result = helper._renderScriptTag({ src: '/a.js', async: 'async' });
      expect(result).toContain('async');
    });

    it('should handle defer as string', () => {
      const result = helper._renderScriptTag({ src: '/a.js', defer: 'defer' });
      expect(result).toContain('defer');
    });
  });
});
