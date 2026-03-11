const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const HeadMeta = require(path.join(projectRoot, 'library/mvc/view/helper/head-meta'));

describe('HeadMeta', () => {
  let helper, ctx;

  beforeEach(() => {
    helper = new HeadMeta();
    // Create a nunjucks-like context object
    ctx = { ctx: {} };
  });

  it('should render empty when no meta tags', () => {
    expect(helper.render(null, null, 'add', ctx)).toBe('');
  });

  it('should add meta tag by name and content', () => {
    helper.render('description', 'A test page', 'add', ctx);
    const result = helper.render(null, null, 'add', ctx);
    expect(result).toContain('name="description"');
    expect(result).toContain('content="A test page"');
  });

  it('should add og: property tags', () => {
    helper.render('og:title', 'My Title', 'add', ctx);
    const result = helper.render(null, null, 'add', ctx);
    expect(result).toContain('property="og:title"');
  });

  it('should add twitter: property tags', () => {
    helper.render('twitter:card', 'summary', 'add', ctx);
    const result = helper.render(null, null, 'add', ctx);
    expect(result).toContain('property="twitter:card"');
  });

  it('should handle charset meta', () => {
    helper.render('charset', 'utf-8', 'add', ctx);
    const result = helper.render(null, null, 'add', ctx);
    expect(result).toContain('charset="utf-8"');
  });

  it('should handle object format', () => {
    helper.render({ name: 'robots', content: 'noindex' }, null, 'add', ctx);
    const result = helper.render(null, null, 'add', ctx);
    expect(result).toContain('name="robots"');
  });

  it('should set mode - replaces all', () => {
    helper.render('description', 'first', 'add', ctx);
    helper.render('keywords', 'only-this', 'set', ctx);
    const result = helper.render(null, null, 'add', ctx);
    expect(result).not.toContain('description');
    expect(result).toContain('keywords');
  });

  it('should render mode returns tags', () => {
    helper.render('description', 'test', 'add', ctx);
    const result = helper.render(null, null, 'render', ctx);
    expect(result).toContain('<meta');
  });

  it('should render when first arg is "render"', () => {
    helper.render('description', 'test', 'add', ctx);
    const result = helper.render('render', null, null, ctx);
    expect(result).toContain('<meta');
  });

  it('should escape HTML in content', () => {
    helper.render('description', '<script>alert("xss")</script>', 'add', ctx);
    const result = helper.render(null, null, 'add', ctx);
    expect(result).toContain('&lt;script&gt;');
  });

  it('should handle unknown mode as add', () => {
    helper.render('description', 'test', 'unknownMode', ctx);
    const result = helper.render(null, null, 'add', ctx);
    expect(result).toContain('description');
  });

  describe('clear', () => {
    it('should clear all meta tags', () => {
      helper.render('description', 'test', 'add', ctx);
      helper.setContext(ctx);
      helper.clear();
      helper.clearContext();
      const result = helper.render(null, null, 'add', ctx);
      expect(result).toBe('');
    });
  });

  describe('_renderMetaTags', () => {
    it('should return empty for null', () => {
      expect(helper._renderMetaTags(null)).toBe('');
    });

    it('should return empty for empty object', () => {
      expect(helper._renderMetaTags({})).toBe('');
    });

    it('should skip non-object attributes', () => {
      expect(helper._renderMetaTags({ bad: 'notobject' })).toBe('');
    });

    it('should skip null/false values', () => {
      const result = helper._renderMetaTags({ test: { name: 'x', bad: null, hidden: false } });
      expect(result).toContain('name="x"');
      expect(result).not.toContain('bad');
    });

    it('should render boolean true as attribute without value', () => {
      const result = helper._renderMetaTags({ test: { httpEquiv: true } });
      expect(result).toContain('httpEquiv');
    });

    it('should render object values as [object Object]', () => {
      const result = helper._renderMetaTags({ test: { name: 'x', nested: { a: 1 } } });
      expect(result).toContain('nested="[object Object]"');
    });
  });

  describe('render with invalid metaTags variable (line 22)', () => {
    it('should reset metaTags to {} when stored value is an array', () => {
      helper.setContext(ctx);
      helper.setVariable('_headMetaTags', [1, 2, 3]);
      helper.clearContext();
      // render should treat array as invalid and reset to {}
      const result = helper.render('description', 'test', 'add', ctx);
      expect(result).toBe('');
    });

    it('should reset metaTags to {} when stored value is non-object', () => {
      helper.setContext(ctx);
      helper.setVariable('_headMetaTags', 'string');
      helper.clearContext();
      const result = helper.render('description', 'test', 'add', ctx);
      expect(result).toBe('');
    });
  });

  describe('render with mode "render" in switch (line 47)', () => {
    it('should render when mode is "render" via switch case', () => {
      helper.render('description', 'test content', 'add', ctx);
      // Call with nameOrProperty and content, but mode='render'
      const result = helper.render('description', 'ignored', 'render', ctx);
      expect(result).toContain('<meta');
      expect(result).toContain('description');
    });
  });

  describe('_addMetaTag', () => {
    it('should use property key from object', () => {
      const tags = {};
      helper._addMetaTag(tags, { property: 'og:title', content: 'Test' });
      expect(tags['og:title']).toBeDefined();
    });

    it('should use charset key', () => {
      const tags = {};
      helper._addMetaTag(tags, { charset: 'utf-8' });
      expect(tags['utf-8']).toBeDefined();
    });

    it('should fallback to unknown key', () => {
      const tags = {};
      helper._addMetaTag(tags, { content: 'test' });
      expect(tags['unknown']).toBeDefined();
    });
  });
});
