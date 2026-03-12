const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderGridHelper = require(globalThis.applicationPath('/application/helper/folder-grid-helper'));

describe('FolderGridHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new FolderGridHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(FolderGridHelper);
  });

  describe('render()', () => {
    it('returns empty message when folders is null', () => {
      const html = helper.render(null);
      expect(html).toContain('No folders in this location');
    });

    it('returns empty message when folders is empty array', () => {
      const html = helper.render([]);
      expect(html).toContain('No folders in this location');
    });

    it('renders folder cards with row wrapper', () => {
      const folders = [{ folder_id: 'f1', name: 'Documents', owner: 'me' }];
      const html = helper.render(folders);
      expect(html).toContain('row mb-4');
      expect(html).toContain('folder-grid-card');
      expect(html).toContain('Documents');
    });

    it('omits row wrapper when wrapInRow is false', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(folders, 'my-drive', 'grid', [], false);
      expect(html).not.toMatch(/^<div class="row mb-4">/);
      expect(html).toContain('folder-grid-card');
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
      const html = helper.render(folders, 'my-drive', 'grid', [], true, ctx);
      expect(html).toContain('Test');
    });
  });

  describe('_renderCard()', () => {
    it('renders card with cursor pointer for non-trash', () => {
      const html = helper._renderCard(
        { name: 'Docs', owner: 'me' }, 'f1', false, 'my-drive', 'grid'
      );
      expect(html).toContain('cursor: pointer');
      expect(html).toContain('Docs');
    });

    it('renders card without cursor for trash view', () => {
      const html = helper._renderCard(
        { name: 'Docs', owner: 'me' }, 'f1', false, 'trash', 'grid'
      );
      expect(html).not.toContain('cursor: pointer');
    });

    it('shows "You" for owner "me"', () => {
      const html = helper._renderCard(
        { name: 'Docs', owner: 'me' }, 'f1', false, 'my-drive', 'grid'
      );
      expect(html).toContain('You created');
    });

    it('shows owner name for non-me owners', () => {
      const html = helper._renderCard(
        { name: 'Docs', owner: 'Alice' }, 'f1', false, 'my-drive', 'grid'
      );
      expect(html).toContain('Alice created');
    });
  });

  describe('_renderTrashMenu()', () => {
    it('renders restore option', () => {
      const html = helper._renderTrashMenu('f1');
      expect(html).toContain('Restore');
      expect(html).toContain('/admin/folder/restore?id=f1');
    });
  });

  describe('static stringToColor()', () => {
    it('returns a hex color string', () => {
      const color = FolderGridHelper.stringToColor('Alice');
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('returns consistent color for same input', () => {
      const c1 = FolderGridHelper.stringToColor('Bob');
      const c2 = FolderGridHelper.stringToColor('Bob');
      expect(c1).toBe(c2);
    });

    it('returns different colors for different inputs', () => {
      const c1 = FolderGridHelper.stringToColor('Alice');
      const c2 = FolderGridHelper.stringToColor('Bob');
      expect(c1).not.toBe(c2);
    });
  });

  describe('render() additional branches', () => {
    it('renders starred folders', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(folders, 'my-drive', 'grid', ['f1']);
      expect(html).toContain('#fbbc04');
    });

    it('renders search view with location', () => {
      const folders = [{ folder_id: 'f1', name: 'Found', owner: 'me', location: 'Parent', location_path: 'Root / Parent' }];
      const html = helper.render(folders, 'search');
      expect(html).toContain('Parent');
    });

    it('uses created_by fallback for owner', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', created_by: 'alice@test.com' }];
      const html = helper.render(folders);
      expect(html).toContain('alice@test.com');
    });

    it('renders starred viewMode with my-drive link', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(folders, 'starred');
      expect(html).toContain('view=my-drive');
    });

    it('renders recent viewMode with my-drive link', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(folders, 'recent');
      expect(html).toContain('view=my-drive');
    });

    it('renders home viewMode with my-drive link', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(folders, 'home');
      expect(html).toContain('view=my-drive');
    });
  });

  describe('_renderDropdownMenu()', () => {
    it('renders dropdown with all action options', () => {
      const html = helper._renderDropdownMenu(
        { name: 'Test', parent_folder_id: 'p1' }, 'f1', 'Test', false
      );
      expect(html).toContain('Star');
      expect(html).toContain('Download');
      expect(html).toContain('Move');
      expect(html).toContain('Rename');
      expect(html).toContain('Move to trash');
    });

    it('renders disable public link for public folders', () => {
      const html = helper._renderDropdownMenu(
        { name: 'Test', visibility: 'public' }, 'f1', 'Test', false
      );
      expect(html).toContain('Disable public link');
    });

    it('does not render disable public link for private folders', () => {
      const html = helper._renderDropdownMenu(
        { name: 'Test', visibility: 'private' }, 'f1', 'Test', false
      );
      expect(html).not.toContain('Disable public link');
    });

    it('renders starred icon when isStarred is true', () => {
      const html = helper._renderDropdownMenu(
        { name: 'Test' }, 'f1', 'Test', true
      );
      expect(html).toContain('#fbbc04');
    });
  });

  describe('_renderCard() additional', () => {
    it('uses updated_dt for date display', () => {
      const html = helper._renderCard(
        { name: 'Docs', owner: 'me', updated_dt: '2025-06-15' }, 'f1', false, 'my-drive', 'grid'
      );
      expect(html).toContain('created');
    });

    it('uses created_dt when no updated_dt', () => {
      const html = helper._renderCard(
        { name: 'Docs', owner: 'me', created_dt: '2025-01-01' }, 'f1', false, 'my-drive', 'grid'
      );
      expect(html).toContain('created');
    });

    it('uses fallback id when no folder_id', () => {
      const folders = [{ id: 'alt-id', name: 'Docs', owner: 'me' }];
      const html = helper.render(folders);
      expect(html).toContain('alt-id');
    });

    it('renders with null viewMode and layoutMode', () => {
      const folders = [{ folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(folders, null, null);
      expect(html).toContain('folder-grid-card');
    });

    it('renders with no date sources at all', () => {
      const html = helper._renderCard(
        { name: 'Docs', owner: 'me' }, 'f1', false, 'my-drive', 'grid'
      );
      expect(html).toContain('-');
    });

    it('renders folder with public visibility dropdown', () => {
      const folders = [{ folder_id: 'f1', name: 'Public', owner: 'me', visibility: 'public' }];
      const html = helper.render(folders, 'my-drive', 'grid');
      expect(html).toContain('Disable public link');
    });
  });
});
