const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const ListLayoutHelper = require(globalThis.applicationPath('/application/helper/list-layout-helper'));

describe('ListLayoutHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new ListLayoutHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(ListLayoutHelper);
  });

  describe('render()', () => {
    it('returns empty string when items is null', () => {
      expect(helper.render(null)).toBe('');
    });

    it('returns empty string when items is empty array', () => {
      expect(helper.render([])).toBe('');
    });

    it('renders table structure with folder rows', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('<table');
      expect(html).toContain('folder-row');
      expect(html).toContain('Docs');
      expect(html).toContain('Name');
      expect(html).toContain('Owner');
    });

    it('renders folder row with data-prefetch-id attribute', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('data-prefetch-id="f1"');
    });

    it('renders file rows for file items', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('file-row');
      expect(html).toContain('test.txt');
    });

    it('renders file row with data-prefetch-file attribute', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('data-prefetch-file="f1"');
    });

    it('renders mixed folder and file rows', () => {
      const items = [
        { item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' },
        { item_type: 'file', id: 'f2', name: 'readme.txt', owner: 'me' }
      ];
      const html = helper.render(items);
      expect(html).toContain('folder-row');
      expect(html).toContain('file-row');
    });

    it('includes Location header for search view mode', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items, [], [], 'search');
      expect(html).toContain('Location');
    });

    it('strips Nunjucks context from args', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Test', owner: 'me' }];
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(items, [], [], 'my-drive', 'list', ctx);
      expect(html).toContain('Test');
    });
  });

  describe('_formatSize()', () => {
    it('returns dash for null', () => {
      expect(helper._formatSize(null)).toBe('-');
    });

    it('returns dash for 0', () => {
      expect(helper._formatSize(0)).toBe('-');
    });

    it('returns bytes for small sizes', () => {
      expect(helper._formatSize(500)).toBe('500 B');
    });

    it('returns KB for kilobyte range', () => {
      expect(helper._formatSize(2048)).toBe('2.0 KB');
    });

    it('returns MB for megabyte range', () => {
      expect(helper._formatSize(2 * 1024 * 1024)).toBe('2.0 MB');
    });
  });

  describe('_renderAccessIcon()', () => {
    it('returns public icon for public visibility', () => {
      const html = helper._renderAccessIcon({ visibility: 'public' });
      expect(html).toContain('#007bff');
      expect(html).toContain('Public');
    });

    it('returns shared icon for shared items', () => {
      const html = helper._renderAccessIcon({ is_shared: true });
      expect(html).toContain('Shared');
    });

    it('returns empty string for private non-shared items', () => {
      const html = helper._renderAccessIcon({ visibility: 'private' });
      expect(html).toBe('');
    });
  });

  describe('_renderStarIcon()', () => {
    it('returns empty string when not starred', () => {
      expect(helper._renderStarIcon(false)).toBe('');
    });

    it('returns empty string for falsy values', () => {
      expect(helper._renderStarIcon(null)).toBe('');
      expect(helper._renderStarIcon(undefined)).toBe('');
    });

    it('returns star SVG when starred', () => {
      const html = helper._renderStarIcon(true);
      expect(html).toContain('<svg');
      expect(html).toContain('#fbbc04');
      expect(html).toContain('Starred');
    });
  });

  describe('_renderLocationCell()', () => {
    it('returns empty string for unlisted view modes', () => {
      expect(helper._renderLocationCell({}, 'home')).toBe('');
      expect(helper._renderLocationCell({}, null)).toBe('');
    });

    it('returns td with location for search mode', () => {
      const html = helper._renderLocationCell({ location: 'My Folder' }, 'search');
      expect(html).toContain('<td');
      expect(html).toContain('My Folder');
    });
  });

  describe('_resolveFileIcon()', () => {
    it('returns image icon for image type', () => {
      const html = helper._resolveFileIcon({ document_type: 'image', name: 'photo.jpg' });
      expect(html).toContain('#6f42c1');
    });

    it('returns video icon for video type', () => {
      const html = helper._resolveFileIcon({ document_type: 'video', name: 'clip.mp4' });
      expect(html).toContain('#e83e8c');
    });

    it('returns pdf icon for .pdf file', () => {
      const html = helper._resolveFileIcon({ name: 'report.pdf' });
      expect(html).toContain('#ea4335');
    });

    it('returns generic icon for unknown type', () => {
      const html = helper._resolveFileIcon({ name: 'readme.txt' });
      expect(html).toContain('#007bff');
    });
  });

  describe('_resolvePreviewType()', () => {
    it('returns image for image type', () => {
      expect(helper._resolvePreviewType({ document_type: 'image', name: 'a.jpg' })).toBe('image');
    });

    it('returns pdf for .pdf', () => {
      expect(helper._resolvePreviewType({ name: 'a.pdf' })).toBe('pdf');
    });

    it('returns video for video type', () => {
      expect(helper._resolvePreviewType({ document_type: 'video', name: 'a.mp4' })).toBe('video');
    });

    it('returns null for unknown type', () => {
      expect(helper._resolvePreviewType({ name: 'a.txt' })).toBeNull();
    });
  });

  describe('_renderPreviewPopup()', () => {
    it('returns empty string for no thumbnail', () => {
      expect(helper._renderPreviewPopup(null)).toBe('');
    });

    it('returns popup HTML with thumbnail', () => {
      const html = helper._renderPreviewPopup('/thumb/123');
      expect(html).toContain('file-preview-popup');
      expect(html).toContain('/thumb/123');
    });
  });

  describe('render() additional branches', () => {
    it('renders with starred file IDs', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'star.txt', owner: 'me' }];
      const html = helper.render(items, [], ['f1']);
      expect(html).toContain('#fbbc04');
    });

    it('renders with starred folder IDs', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Star', owner: 'me' }];
      const html = helper.render(items, ['f1']);
      expect(html).toContain('#fbbc04');
    });

    it('renders trash view for folders', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Old', owner: 'me' }];
      const html = helper.render(items, [], [], 'trash');
      expect(html).toContain('Restore');
    });

    it('renders trash view for files', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'deleted.txt', owner: 'me' }];
      const html = helper.render(items, [], [], 'trash');
      expect(html).toContain('Restore');
    });

    it('handles public visibility items', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'pub.txt', owner: 'me', visibility: 'public' }];
      const html = helper.render(items, [], [], 'my-drive');
      expect(html).toContain('Public');
    });

    it('handles shared items', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'shared.txt', owner: 'me', is_shared: true }];
      const html = helper.render(items, [], [], 'my-drive');
      expect(html).toContain('Shared');
    });

    it('renders items with thumbnails', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'photo.jpg', owner: 'me', has_thumbnail: true }];
      const html = helper.render(items);
      expect(html).toContain('file-preview-popup');
    });

    it('renders search mode with location column', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'found.txt', owner: 'me', location: 'Docs' }];
      const html = helper.render(items, [], [], 'search');
      expect(html).toContain('Location');
      expect(html).toContain('Docs');
    });
  });

  describe('_resolvePreviewType() additional', () => {
    it('returns null for items with has_preview_pages but no matching extension', () => {
      expect(helper._resolvePreviewType({ name: 'doc.docx' })).toBeNull();
    });

    it('returns image by extension', () => {
      expect(helper._resolvePreviewType({ name: 'test.png' })).toBe('image');
    });

    it('returns video by extension', () => {
      expect(helper._resolvePreviewType({ name: 'test.mp4' })).toBe('video');
    });
  });

  describe('_renderLocationCell() with path', () => {
    it('renders location cell with crumbs for multi-part path', () => {
      const html = helper._renderLocationCell({ location: 'Child', location_path: 'Root / Child' }, 'search');
      expect(html).toContain('location-crumb');
      expect(html).toContain('location-chevron');
      expect(html).toContain('location-tooltip-popup');
    });

    it('renders location cell with single part path', () => {
      const html = helper._renderLocationCell({ location: 'Root' }, 'search');
      expect(html).toContain('Root');
    });

    it('renders location cell with no location (empty)', () => {
      const html = helper._renderLocationCell({}, 'search');
      expect(html).toContain('<td');
    });
  });

  describe('render() edge case branches', () => {
    it('renders folder with item.id instead of folder_id', () => {
      const items = [{ item_type: 'folder', id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items, [], [], 'my-drive', 'list');
      expect(html).toContain('folder-row');
    });

    it('renders folder with no updated_dt (uses created_dt)', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', created_dt: '2025-01-01' }];
      const html = helper.render(items);
      expect(html).toContain('folder-row');
    });

    it('renders folder with no dates at all', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs' }];
      const html = helper.render(items);
      expect(html).toContain('-');
    });

    it('renders folder with created_by instead of owner', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', created_by: 'alice' }];
      const html = helper.render(items);
      expect(html).toContain('alice');
    });

    it('renders folder with null parent_folder_id', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', parent_folder_id: null, owner: 'me' }];
      const html = helper.render(items, [], [], 'my-drive', 'list');
      expect(html).toContain('folder-row');
    });

    it('renders folder with null name', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: null, owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('folder-row');
    });

    it('renders folder in starred viewMode', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Star', owner: 'me' }];
      const html = helper.render(items, [], [], 'starred', 'list');
      expect(html).toContain('/my-drive');
    });

    it('renders folder in recent viewMode', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Recent', owner: 'me' }];
      const html = helper.render(items, [], [], 'recent', 'list');
      expect(html).toContain('/my-drive');
    });

    it('renders file with null name', () => {
      const items = [{ item_type: 'file', id: 'f1', name: null, owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('file-row');
    });

    it('renders file with original_filename for icon detection', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'file', original_filename: 'file.xlsx', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('file-row');
    });

    it('renders file with has_preview_pages', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'report.docx', owner: 'me', has_preview_pages: true }];
      const html = helper.render(items);
      expect(html).toContain('file-row');
    });

    it('renders file with document_type video', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'clip.mp4', owner: 'me', document_type: 'video' }];
      const html = helper.render(items);
      expect(html).toContain('file-row');
    });

    it('renders file with visibility public', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'pub.txt', owner: 'me', visibility: 'public' }];
      const html = helper.render(items);
      expect(html).toContain('Public Link Active');
    });

    it('renders file in search viewMode with location', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'found.txt', owner: 'me', location: 'Docs', location_path: 'Root / Docs' }];
      const html = helper.render(items, [], [], 'search', 'list');
      expect(html).toContain('location-crumb');
    });

    it('renders folder in search viewMode with location', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Found', owner: 'me', location: 'Root' }];
      const html = helper.render(items, [], [], 'search', 'list');
      expect(html).toContain('Root');
    });

    it('renders with null layoutMode and viewMode', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items, [], [], null, null);
      expect(html).toContain('folder-row');
    });
  });

  describe('_resolveFileIcon() additional', () => {
    it('returns xlsx icon for .xlsx file', () => {
      const html = helper._resolveFileIcon({ name: 'data.xlsx' });
      expect(html).toContain('svg');
    });
  });

  describe('_renderFileQuickActions() file information button', () => {
    it('renders File information button for non-trash files', () => {
      const html = helper._renderFileQuickActions(
        { id: 'f1', name: 'report.pdf', content_type: 'application/pdf', size_bytes: 167000, owner: 'me' },
        false,
        { starUrl: '/star', starActionText: 'Add to Starred', starIconFill: 'none', starIconStroke: 'currentColor' }
      );
      expect(html).toContain('File information');
      expect(html).toContain('showFileInfoPanel');
    });

    it('includes data-info attributes with file metadata', () => {
      const html = helper._renderFileQuickActions({
        id: 'f1', name: 'report.pdf', content_type: 'application/pdf',
        size_bytes: 167000, created_dt: '2026-03-24T07:01:00Z',
        last_modified: '2026-03-24T07:01:00Z', last_opened: '2026-03-24T10:04:00Z',
        owner: 'alice'
      }, false, {
        starUrl: '/star', starActionText: 'Add to Starred', starIconFill: 'none', starIconStroke: 'currentColor'
      });
      expect(html).toContain('data-info-name="report.pdf"');
      expect(html).toContain('data-info-type="application/pdf"');
      expect(html).toContain('data-info-size="167000"');
      expect(html).toContain('data-info-created="2026-03-24T07:01:00Z"');
      expect(html).toContain('data-info-modified="2026-03-24T07:01:00Z"');
      expect(html).toContain('data-info-opened="2026-03-24T10:04:00Z"');
      expect(html).toContain('data-info-owner="alice"');
    });

    it('does not render File information button for trash files', () => {
      const html = helper._renderFileQuickActions(
        { id: 'f1', name: 'test.txt' },
        true,
        { starUrl: '', starActionText: '', starIconFill: '', starIconStroke: '' }
      );
      expect(html).not.toContain('File information');
    });

    it('defaults owner to me when not provided', () => {
      const html = helper._renderFileQuickActions(
        { id: 'f1', name: 'test.txt' },
        false,
        { starUrl: '/star', starActionText: 'Star', starIconFill: 'none', starIconStroke: 'currentColor' }
      );
      expect(html).toContain('data-info-owner="me"');
    });

    it('defaults size to 0 when not provided', () => {
      const html = helper._renderFileQuickActions(
        { id: 'f1', name: 'test.txt' },
        false,
        { starUrl: '/star', starActionText: 'Star', starIconFill: 'none', starIconStroke: 'currentColor' }
      );
      expect(html).toContain('data-info-size="0"');
    });

    it('escapes double quotes in file name', () => {
      const html = helper._renderFileQuickActions(
        { id: 'f1', name: 'file"name.txt' },
        false,
        { starUrl: '/star', starActionText: 'Star', starIconFill: 'none', starIconStroke: 'currentColor' }
      );
      expect(html).toContain('data-info-name="file&quot;name.txt"');
    });

    it('uses updated_dt as fallback when last_modified is absent', () => {
      const html = helper._renderFileQuickActions(
        { id: 'f1', name: 'test.txt', updated_dt: '2026-03-20T12:00:00Z' },
        false,
        { starUrl: '/star', starActionText: 'Star', starIconFill: 'none', starIconStroke: 'currentColor' }
      );
      expect(html).toContain('data-info-modified="2026-03-20T12:00:00Z"');
    });
  });
});
