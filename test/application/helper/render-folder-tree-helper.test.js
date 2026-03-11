const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const RenderFolderTreeHelper = require(globalThis.applicationPath('/application/helper/render-folder-tree-helper'));

describe('RenderFolderTreeHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new RenderFolderTreeHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(RenderFolderTreeHelper);
  });

  describe('render()', () => {
    it('returns empty string when items is null', () => {
      expect(helper.render(null)).toBe('');
    });

    it('returns empty string when items is undefined', () => {
      expect(helper.render(undefined)).toBe('');
    });

    it('returns empty string when items is empty array', () => {
      expect(helper.render([])).toBe('');
    });

    it('renders a single folder item', () => {
      const items = [{ folder_id: 'f1', name: 'Documents' }];
      const html = helper.render(items);
      expect(html).toContain('<li>');
      expect(html).toContain('Documents');
      expect(html).toContain('f1');
    });

    it('renders nested folder items', () => {
      const items = [{
        folder_id: 'f1',
        name: 'Root',
        children: [{ folder_id: 'f2', name: 'Child', children: [] }]
      }];
      const html = helper.render(items);
      expect(html).toContain('Root');
      expect(html).toContain('Child');
      expect(html).toContain('collapse');
    });

    it('marks active folder', () => {
      const items = [{ folder_id: 'f1', name: 'Documents' }];
      const html = helper.render(items, 0, 'f1');
      expect(html).toContain('active');
    });

    it('does not mark non-active folder as active', () => {
      const items = [{ folder_id: 'f1', name: 'Documents' }];
      const html = helper.render(items, 0, 'other-id');
      // The item itself should not have the active class on its nav-link
      expect(html).not.toContain('nav-link d-flex align-items-center p-0 active');
    });

    it('handles expandedIds parameter', () => {
      const items = [{
        folder_id: 'f1',
        name: 'Root',
        children: [{ folder_id: 'f2', name: 'Child', children: [] }]
      }];
      const html = helper.render(items, 0, null, 'my-drive', 'grid', ['f1']);
      expect(html).toContain('Root');
      expect(html).toContain('Child');
    });

    it('strips Nunjucks context from args', () => {
      const items = [{ folder_id: 'f1', name: 'Test' }];
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(items, 0, null, 'my-drive', 'grid', [], ctx);
      expect(html).toContain('Test');
    });

    it('converts non-array expandedIds to empty array', () => {
      const items = [{ folder_id: 'f1', name: 'Root' }];
      // Pass an object (like Nunjucks might) for expandedIds
      const html = helper.render(items, 0, null, 'my-drive', 'grid', { not: 'array' });
      expect(html).toContain('Root');
    });
  });

  describe('_renderRecursive()', () => {
    beforeEach(() => {
      // Initialize urlHelper before calling _renderRecursive
      helper._initUrlHelper();
    });

    it('returns empty result for null items', () => {
      const result = helper._renderRecursive(null, 0, null, 'my-drive', 'grid', []);
      expect(result.html).toBe('');
      expect(result.isPathActive).toBe(false);
    });

    it('returns empty result for empty array', () => {
      const result = helper._renderRecursive([], 0, null, 'my-drive', 'grid', []);
      expect(result.html).toBe('');
      expect(result.isPathActive).toBe(false);
    });

    it('renders items and tracks active state', () => {
      const items = [{ folder_id: 'f1', name: 'Docs' }];
      const result = helper._renderRecursive(items, 0, 'f1', 'my-drive', 'grid', []);
      expect(result.html).toContain('Docs');
    });

    it('handles non-string viewMode gracefully', () => {
      const items = [{ folder_id: 'f1', name: 'Docs' }];
      const result = helper._renderRecursive(items, 0, null, 123, 'grid', []);
      expect(result.html).toContain('Docs');
    });

    it('handles non-number level gracefully', () => {
      const items = [{ folder_id: 'f1', name: 'Docs' }];
      const result = helper._renderRecursive(items, 'abc', null, 'my-drive', 'grid', []);
      expect(result.html).toContain('Docs');
    });
  });

  describe('render() additional branches', () => {
    it('renders with starred viewMode', () => {
      const items = [{ folder_id: 'f1', name: 'Root' }];
      const html = helper.render(items, 0, 'f1', 'starred', 'grid', []);
      expect(html).toContain('Root');
    });

    it('renders deeply nested tree with expanded state', () => {
      const items = [{
        folder_id: 'root',
        name: 'Root',
        children: [{
          folder_id: 'child',
          name: 'Child',
          children: [{ folder_id: 'grandchild', name: 'Grandchild', children: [] }]
        }]
      }];
      const html = helper.render(items, 0, 'grandchild', 'my-drive', 'grid', ['root', 'child']);
      expect(html).toContain('Root');
      expect(html).toContain('Child');
      expect(html).toContain('Grandchild');
    });

    it('uses view.callbacks.url when available for _initUrlHelper', () => {
      const helper2 = new RenderFolderTreeHelper();
      helper2.view = { callbacks: { url: jest.fn().mockReturnValue('/test?id=f1') } };
      const items = [{ folder_id: 'f1', name: 'Root' }];
      const html = helper2.render(items, 0, null, 'my-drive', 'grid', []);
      expect(html).toContain('Root');
      expect(helper2.urlHelper.fromRoute).toBe(helper2.view.callbacks.url);
    });

    it('renders with non-grid layout mode (adds layout param)', () => {
      const items = [{ folder_id: 'f1', name: 'Root' }];
      const html = helper.render(items, 0, null, 'my-drive', 'list', []);
      expect(html).toContain('layout=list');
    });

    it('renders with object layoutMode (Nunjucks fallback)', () => {
      const items = [{ folder_id: 'f1', name: 'Root' }];
      const result = helper._renderRecursive(items, 0, null, 'my-drive', { not: 'string' }, []);
      expect(result.html).toContain('Root');
    });

    it('renders with non-array expandedIds in _renderRecursive', () => {
      const items = [{ folder_id: 'f1', name: 'Root' }];
      const result = helper._renderRecursive(items, 0, null, 'my-drive', 'grid', 'not-array');
      expect(result.html).toContain('Root');
    });

    it('marks active path through nested tree', () => {
      const items = [{
        folder_id: 'root',
        name: 'Root',
        children: [{ folder_id: 'active-child', name: 'Active', children: [] }]
      }];
      const html = helper.render(items, 0, 'active-child', 'my-drive', 'grid', []);
      expect(html).toContain('Active');
    });
  });
});
