const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderListHelper = require(globalThis.applicationPath('/application/helper/folder-list-helper'));

describe('FolderListHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new FolderListHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(FolderListHelper);
  });

  describe('render()', () => {
    it('returns empty string when folders is null', () => {
      expect(helper.render(null)).toBe('');
    });

    it('returns empty string when folders is empty array', () => {
      expect(helper.render([])).toBe('');
    });

    it('renders folder rows', () => {
      const folders = [{ folder_id: 'f1', name: 'Documents', owner: 'me' }];
      const html = helper.render(folders);
      expect(html).toContain('<tr');
      expect(html).toContain('folder-row');
      expect(html).toContain('Documents');
    });

    it('handles folders with toObject method', () => {
      const folder = {
        toObject: () => ({ folder_id: 'f1', name: 'EntityFolder', owner: 'me' })
      };
      const html = helper.render([folder]);
      expect(html).toContain('EntityFolder');
    });

    it('strips Nunjucks context from args', () => {
      const folders = [{ folder_id: 'f1', name: 'Test', owner: 'me' }];
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(folders, 'my-drive', 'list', [], ctx);
      expect(html).toContain('Test');
    });
  });

  describe('_renderLocationCell()', () => {
    it('returns empty string for non-search view mode', () => {
      expect(helper._renderLocationCell({}, 'my-drive')).toBe('');
    });

    it('returns location td for search view mode', () => {
      const html = helper._renderLocationCell({ location: 'My Folder' }, 'search');
      expect(html).toContain('<td');
      expect(html).toContain('My Folder');
    });
  });

  describe('_renderQuickActions()', () => {
    it('renders restore button for trash view', () => {
      const html = helper._renderQuickActions(
        { name: 'Docs' }, 'f1', 'Docs', true, []
      );
      expect(html).toContain('Restore');
      expect(html).toContain('/admin/folder/restore?id=f1');
    });

    it('renders action buttons for non-trash view', () => {
      const html = helper._renderQuickActions(
        { name: 'Docs' }, 'f1', 'Docs', false, []
      );
      expect(html).toContain('Star');
      expect(html).toContain('Share');
      expect(html).toContain('Download');
      expect(html).toContain('Move');
      expect(html).toContain('Rename');
    });

    it('renders starred icon for starred folders', () => {
      const html = helper._renderQuickActions(
        { name: 'Docs', is_starred: true }, 'f1', 'Docs', false, ['f1']
      );
      expect(html).toContain('#fbbc04');
    });
  });

  describe('render() additional branches', () => {
    it('renders trash view with restore only', () => {
      const folders = [{ folder_id: 'f1', name: 'Old', owner: 'me' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, 'trash');
      expect(html).toContain('Restore');
      expect(html).not.toContain('cursor: pointer');
      spy.mockRestore();
    });

    it('renders starred viewMode with my-drive link', () => {
      const folders = [{ folder_id: 'f1', name: 'Star', owner: 'me' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, 'starred');
      expect(html).toContain('view=my-drive');
      spy.mockRestore();
    });

    it('renders recent viewMode with my-drive link', () => {
      const folders = [{ folder_id: 'f1', name: 'Recent', owner: 'me' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, 'recent');
      expect(html).toContain('view=my-drive');
      spy.mockRestore();
    });

    it('renders search view with location cell', () => {
      const folders = [{ folder_id: 'f1', name: 'Found', owner: 'me', location: 'Parent', location_path: 'Root / Parent' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, 'search');
      expect(html).toContain('location-cell');
      expect(html).toContain('Parent');
      spy.mockRestore();
    });

    it('uses created_by fallback for owner', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', created_by: 'alice' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders);
      expect(html).toContain('alice');
      spy.mockRestore();
    });

    it('falls back to id when no folder_id', () => {
      const folders = [{ id: 'alt-id', name: 'Docs', owner: 'me' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders);
      expect(html).toContain('alt-id');
      spy.mockRestore();
    });
  });

  describe('render() null property branches', () => {
    it('renders with no date sources', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders);
      expect(html).toContain('-');
      spy.mockRestore();
    });

    it('renders with created_dt only', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me', created_dt: '2025-01-01' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders);
      expect(html).toContain('folder-row');
      spy.mockRestore();
    });

    it('renders with null viewMode and layoutMode', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, null, null);
      expect(html).toContain('folder-row');
      spy.mockRestore();
    });

    it('renders with null parent_folder_id', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me', parent_folder_id: null }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, 'my-drive', 'list');
      expect(html).toContain('folder-row');
      spy.mockRestore();
    });

    it('renders with null name', () => {
      const folders = [{ folder_id: 'f1', name: null, owner: 'me' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, 'my-drive', 'list');
      expect(html).toContain('folder-row');
      spy.mockRestore();
    });

    it('renders folder with toObject method', () => {
      const folders = [{ toObject: () => ({ folder_id: 'f1', name: 'Entity', owner: 'me' }) }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders);
      expect(html).toContain('Entity');
      spy.mockRestore();
    });

    it('renders folder with public visibility', () => {
      const folders = [{ folder_id: 'f1', name: 'Public', owner: 'me', visibility: 'public' }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, 'my-drive', 'list');
      expect(html).toContain('Public');
      spy.mockRestore();
    });

    it('renders folder with is_shared', () => {
      const folders = [{ folder_id: 'f1', name: 'Shared', owner: 'me', is_shared: true }];
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const html = helper.render(folders, 'my-drive', 'list');
      expect(html).toContain('Shared');
      spy.mockRestore();
    });
  });

  describe('_renderLocationCell() with path', () => {
    it('renders crumbs with tooltip for multi-level path', () => {
      const html = helper._renderLocationCell(
        { location: 'Child', location_path: 'Root / Child' }, 'search'
      );
      expect(html).toContain('location-tooltip-popup');
      expect(html).toContain('Root');
    });
  });
});
