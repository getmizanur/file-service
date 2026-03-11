const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const HeadLink = require(path.join(projectRoot, 'library/mvc/view/helper/head-link'));

describe('HeadLink', () => {
  let helper, ctx;

  beforeEach(() => {
    helper = new HeadLink();
    ctx = { ctx: {} };
  });

  it('should render empty when no links', () => {
    expect(helper.render(null, 'add', ctx)).toBe('');
  });

  it('should add and render a link tag', () => {
    helper.render({ rel: 'stylesheet', href: '/a.css' }, 'add', ctx);
    const result = helper.render(null, 'add', ctx);
    expect(result).toContain('<link');
    expect(result).toContain('rel="stylesheet"');
    expect(result).toContain('href="/a.css"');
  });

  it('should deduplicate by rel+href', () => {
    helper.render({ rel: 'stylesheet', href: '/a.css' }, 'add', ctx);
    helper.render({ rel: 'stylesheet', href: '/a.css', media: 'print' }, 'add', ctx);
    const result = helper.render(null, 'add', ctx);
    // Should have only one link tag (updated)
    expect(result.match(/<link/g).length).toBe(1);
    expect(result).toContain('media="print"');
  });

  it('should set mode - replace all', () => {
    helper.render({ rel: 'stylesheet', href: '/a.css' }, 'add', ctx);
    helper.render({ rel: 'stylesheet', href: '/b.css' }, 'set', ctx);
    const result = helper.render(null, 'add', ctx);
    expect(result).not.toContain('/a.css');
    expect(result).toContain('/b.css');
  });

  it('should render mode', () => {
    helper.render({ rel: 'stylesheet', href: '/a.css' }, 'add', ctx);
    const result = helper.render(null, 'render', ctx);
    expect(result).toContain('<link');
  });

  it('should render via "render" sentinel string', () => {
    helper.render({ rel: 'stylesheet', href: '/a.css' }, 'add', ctx);
    const result = helper.render('render', 'add', ctx);
    expect(result).toContain('<link');
  });

  it('should skip non-object attributes', () => {
    helper.render('not-an-object', 'add', ctx);
    const result = helper.render(null, 'add', ctx);
    expect(result).toBe('');
  });

  it('should escape attribute values', () => {
    helper.render({ rel: 'stylesheet', href: '/a.css?v=1&t=2' }, 'add', ctx);
    const result = helper.render(null, 'add', ctx);
    expect(result).toContain('&amp;');
  });

  it('should handle unknown mode as add', () => {
    helper.render({ rel: 'icon', href: '/favicon.ico' }, 'unknownMode', ctx);
    const result = helper.render(null, 'add', ctx);
    expect(result).toContain('favicon.ico');
  });

  it('should render immediately when mode is "render" with attributes present', () => {
    helper.render({ rel: 'stylesheet', href: '/a.css' }, 'add', ctx);
    const result = helper.render({ rel: 'stylesheet', href: '/b.css' }, 'render', ctx);
    expect(result).toContain('<link');
    expect(result).toContain('/a.css');
  });

  describe('convenience methods', () => {
    it('stylesheet should call render', () => {
      const spy = jest.spyOn(helper, 'render');
      helper.stylesheet('/style.css');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ rel: 'stylesheet', href: '/style.css' }),
        'add'
      );
    });

    it('stylesheet should pass extra attributes', () => {
      const spy = jest.spyOn(helper, 'render');
      helper.stylesheet('/style.css', { media: 'print' });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ rel: 'stylesheet', media: 'print' }),
        'add'
      );
    });

    it('favicon should call render with icon attrs', () => {
      const spy = jest.spyOn(helper, 'render');
      helper.favicon('/favicon.ico');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }),
        'add'
      );
    });

    it('favicon should accept custom type', () => {
      const spy = jest.spyOn(helper, 'render');
      helper.favicon('/favicon.png', 'image/png');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'image/png' }),
        'add'
      );
    });

    it('canonical should call render with canonical attrs', () => {
      const spy = jest.spyOn(helper, 'render');
      helper.canonical('https://example.com/page');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ rel: 'canonical', href: 'https://example.com/page' }),
        'add'
      );
    });
  });

  describe('clear', () => {
    it('should clear all links', () => {
      helper.render({ rel: 'stylesheet', href: '/a.css' }, 'add', ctx);
      helper.setContext(ctx);
      helper.clear();
      helper.clearContext();
      const result = helper.render(null, 'add', ctx);
      expect(result).toBe('');
    });
  });

  describe('_renderLinkTags', () => {
    it('should return empty for non-array', () => {
      expect(helper._renderLinkTags(null)).toBe('');
      expect(helper._renderLinkTags([])).toBe('');
    });

    it('should skip non-object entries', () => {
      expect(helper._renderLinkTags(['bad'])).toBe('');
    });

    it('should handle boolean true attrs', () => {
      const result = helper._renderLinkTags([{ crossorigin: true }]);
      expect(result).toContain('crossorigin');
    });

    it('should skip null/undefined/false attribute values (line 109)', () => {
      const result = helper._renderLinkTags([{
        rel: 'stylesheet',
        href: null,
        media: undefined,
        disabled: false,
        crossorigin: true,
        type: 'text/css'
      }]);
      expect(result).toContain('rel="stylesheet"');
      expect(result).not.toContain('href');
      expect(result).not.toContain('media');
      expect(result).not.toContain('disabled');
      expect(result).toContain('crossorigin');
      expect(result).toContain('type="text/css"');
    });

    it('should skip null entries in linkTags array (line 105)', () => {
      const result = helper._renderLinkTags([null, { rel: 'icon' }]);
      expect(result).toContain('rel="icon"');
    });
  });

  describe('branch: _addLinkTag edge cases', () => {
    it('should skip array attributes (line 68)', () => {
      helper.setContext(ctx);
      helper.render([1, 2, 3], 'add', ctx);
      const result = helper.render(null, 'add', ctx);
      expect(result).toBe('');
      helper.clearContext();
    });

    it('should skip number attributes (line 68)', () => {
      helper.setContext(ctx);
      helper.render(42, 'add', ctx);
      const result = helper.render(null, 'add', ctx);
      expect(result).toBe('');
      helper.clearContext();
    });

    it('should handle linkTags being non-array in context (line 26)', () => {
      helper.setContext(ctx);
      helper.setVariable('_headLinkTags', 'not-an-array');
      const result = helper.render(null, 'add', ctx);
      expect(result).toBe('');
      helper.clearContext();
    });

    it('should handle dedup with existing link missing rel/href (line 76)', () => {
      helper.setContext(ctx);
      helper.render({ rel: 'stylesheet' }, 'add', ctx);
      helper.render({ rel: 'stylesheet', media: 'screen' }, 'add', ctx);
      const result = helper.render(null, 'add', ctx);
      // Should merge (same rel, both have empty href)
      const linkCount = (result.match(/<link/g) || []).length;
      expect(linkCount).toBe(1);
      expect(result).toContain('media="screen"');
      helper.clearContext();
    });
  });
});
