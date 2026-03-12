const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const ListLayoutHelper = require(globalThis.applicationPath('/application/helper/list-layout-helper'));

describe('ListLayoutHelper - Location Feature', () => {
  let helper;

  beforeEach(() => {
    helper = new ListLayoutHelper();
  });

  describe('_renderLocationCell()', () => {
    it('returns td element for my-drive view', () => {
      const item = { location: 'Documents', folder_id: 'f1', item_type: 'file' };
      const html = helper._renderLocationCell(item, 'my-drive');
      expect(html).toContain('<td');
      expect(html).toContain('location-cell');
    });

    it('returns td element for trash view', () => {
      const item = { location: 'Documents', folder_id: 'f1', item_type: 'file', location_path: 'My Drive / Documents' };
      const html = helper._renderLocationCell(item, 'trash');
      expect(html).toContain('<td');
      expect(html).toContain('location-cell');
      expect(html).toContain('data-folder-id="f1"');
      expect(html).toContain('Documents');
    });

    it('returns td element for starred view', () => {
      const item = { location: 'Projects', folder_id: 'f2', item_type: 'file' };
      const html = helper._renderLocationCell(item, 'starred');
      expect(html).toContain('<td');
      expect(html).toContain('data-folder-id="f2"');
    });

    it('returns td element for recent view', () => {
      const item = { location: 'Work', folder_id: 'f3', item_type: 'file' };
      const html = helper._renderLocationCell(item, 'recent');
      expect(html).toContain('<td');
      expect(html).toContain('data-folder-id="f3"');
    });

    it('returns td element for shared-with-me view', () => {
      const item = { location: 'Shared', folder_id: 'f4', item_type: 'file' };
      const html = helper._renderLocationCell(item, 'shared-with-me');
      expect(html).toContain('<td');
    });

    it('returns td element for search view', () => {
      const item = { location: 'Docs', folder_id: 'f5', item_type: 'file', location_path: 'My Drive / Docs' };
      const html = helper._renderLocationCell(item, 'search');
      expect(html).toContain('<td');
      expect(html).toContain('Docs');
    });

    it('uses parent_folder_id for folder items', () => {
      const item = { location: 'Root', parent_folder_id: 'parent-1', item_type: 'folder' };
      const html = helper._renderLocationCell(item, 'trash');
      expect(html).toContain('data-folder-id="parent-1"');
    });

    it('uses folder_id for file items', () => {
      const item = { location: 'Root', folder_id: 'file-folder-1', item_type: 'file' };
      const html = helper._renderLocationCell(item, 'recent');
      expect(html).toContain('data-folder-id="file-folder-1"');
    });

    it('renders breadcrumb tooltip when location_path has parts', () => {
      const item = { location: 'Sub', folder_id: 'f1', item_type: 'file', location_path: 'My Drive / Documents / Sub' };
      const html = helper._renderLocationCell(item, 'starred');
      expect(html).toContain('location-tooltip-popup');
      expect(html).toContain('location-crumb');
      expect(html).toContain('My Drive');
      expect(html).toContain('Documents');
      expect(html).toContain('Sub');
    });

    it('handles empty location gracefully', () => {
      const item = { location: '', folder_id: 'f1', item_type: 'file' };
      const html = helper._renderLocationCell(item, 'trash');
      expect(html).toContain('<td');
      expect(html).toContain('location-cell');
    });

    it('handles missing folder_id gracefully', () => {
      const item = { location: 'Root', item_type: 'file' };
      const html = helper._renderLocationCell(item, 'recent');
      expect(html).toContain('data-folder-id=""');
    });
  });

  describe('render() location header', () => {
    const fileItem = {
      id: 'file-1', name: 'test.pdf', item_type: 'file', owner: 'me',
      location: 'Docs', folder_id: 'f1', location_path: 'My Drive / Docs'
    };

    it('includes Location header for trash view', () => {
      const html = helper.render([fileItem], [], [], 'trash', 'list');
      expect(html).toContain('<th scope="col">Location</th>');
    });

    it('includes Location header for starred view', () => {
      const html = helper.render([fileItem], [], [], 'starred', 'list');
      expect(html).toContain('<th scope="col">Location</th>');
    });

    it('includes Location header for recent view', () => {
      const html = helper.render([fileItem], [], [], 'recent', 'list');
      expect(html).toContain('<th scope="col">Location</th>');
    });

    it('includes Location header for shared-with-me view', () => {
      const html = helper.render([fileItem], [], [], 'shared-with-me', 'list');
      expect(html).toContain('<th scope="col">Location</th>');
    });

    it('includes Location header for my-drive view', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      expect(html).toContain('<th scope="col">Location</th>');
    });
  });
});
