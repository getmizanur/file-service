const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const GridLayoutHelper = require(globalThis.applicationPath('/application/helper/grid-layout-helper'));

describe('GridLayoutHelper - Location Feature', () => {
  let helper;

  beforeEach(() => {
    helper = new GridLayoutHelper();
  });

  describe('_hasLocation()', () => {
    it('returns true for trash view', () => {
      expect(helper._hasLocation('trash')).toBe(true);
    });

    it('returns true for starred view', () => {
      expect(helper._hasLocation('starred')).toBe(true);
    });

    it('returns true for recent view', () => {
      expect(helper._hasLocation('recent')).toBe(true);
    });

    it('returns true for shared-with-me view', () => {
      expect(helper._hasLocation('shared-with-me')).toBe(true);
    });

    it('returns true for search view', () => {
      expect(helper._hasLocation('search')).toBe(true);
    });

    it('returns false for my-drive view', () => {
      expect(helper._hasLocation('my-drive')).toBe(false);
    });

    it('returns false for undefined view', () => {
      expect(helper._hasLocation(undefined)).toBe(false);
    });
  });

  describe('_renderItemLocation()', () => {
    it('returns empty string for my-drive view', () => {
      const item = { location: 'Documents', folder_id: 'f1', item_type: 'file' };
      expect(helper._renderItemLocation('my-drive', item)).toBe('');
    });

    it('returns empty string when item has no location', () => {
      const item = { folder_id: 'f1', item_type: 'file' };
      expect(helper._renderItemLocation('starred', item)).toBe('');
    });

    it('returns location HTML for starred view with file item', () => {
      const item = { location: 'Documents', folder_id: 'f1', item_type: 'file', location_path: 'My Drive / Documents' };
      const html = helper._renderItemLocation('starred', item);
      expect(html).toContain('grid-card-location');
      expect(html).toContain('data-folder-id="f1"');
      expect(html).toContain('Documents');
      expect(html).toContain('title="My Drive / Documents"');
    });

    it('returns location HTML for trash view with folder item', () => {
      const item = { location: 'Projects', parent_folder_id: 'p1', item_type: 'folder', location_path: 'My Drive / Projects' };
      const html = helper._renderItemLocation('trash', item);
      expect(html).toContain('data-folder-id="p1"');
      expect(html).toContain('Projects');
    });

    it('uses parent_folder_id for folder items', () => {
      const item = { location: 'Root', parent_folder_id: 'parent-1', folder_id: 'self-1', item_type: 'folder' };
      const html = helper._renderItemLocation('recent', item);
      expect(html).toContain('data-folder-id="parent-1"');
    });

    it('uses folder_id for file items', () => {
      const item = { location: 'Root', folder_id: 'folder-1', item_type: 'file' };
      const html = helper._renderItemLocation('recent', item);
      expect(html).toContain('data-folder-id="folder-1"');
    });

    it('handles missing folder_id gracefully', () => {
      const item = { location: 'Root', item_type: 'file' };
      const html = helper._renderItemLocation('starred', item);
      expect(html).toContain('data-folder-id=""');
    });

    it('contains folder SVG icon', () => {
      const item = { location: 'Docs', folder_id: 'f1', item_type: 'file' };
      const html = helper._renderItemLocation('starred', item);
      expect(html).toContain('<svg');
      expect(html).toContain('viewBox="0 0 24 24"');
    });
  });
});
