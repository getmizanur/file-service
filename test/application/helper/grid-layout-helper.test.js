const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const GridLayoutHelper = require(globalThis.applicationPath('/application/helper/grid-layout-helper'));

describe('GridLayoutHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new GridLayoutHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(GridLayoutHelper);
  });

  describe('render()', () => {
    it('returns empty string when items is null', () => {
      expect(helper.render(null)).toBe('');
    });

    it('returns empty string when items is empty array', () => {
      expect(helper.render([])).toBe('');
    });

    it('renders folder card for folder item_type', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('folder-grid-card');
      expect(html).toContain('Docs');
    });

    it('renders folder card with data-prefetch-id attribute', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('data-prefetch-id="f1"');
    });

    it('renders file card for file item_type', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('file-grid-card');
      expect(html).toContain('test.txt');
    });

    it('renders file card with data-prefetch-file attribute', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('data-prefetch-file="f1"');
    });

    it('renders mixed folder and file cards', () => {
      const items = [
        { item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' },
        { item_type: 'file', id: 'f2', name: 'readme.txt', owner: 'me' }
      ];
      const html = helper.render(items);
      expect(html).toContain('folder-grid-card');
      expect(html).toContain('file-grid-card');
    });

    it('strips Nunjucks context from args', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Test', owner: 'me' }];
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(items, [], [], 'my-drive', 'grid', ctx);
      expect(html).toContain('Test');
    });
  });

  describe('_resolvePreviewType()', () => {
    it('returns image for image items', () => {
      expect(helper._resolvePreviewType({ name: 'a.jpg' }, true, 'a.jpg')).toBe('image');
    });

    it('returns pdf for pdf items', () => {
      expect(helper._resolvePreviewType({ name: 'a.pdf' }, false, 'a.pdf')).toBe('pdf');
    });

    it('returns video for video items', () => {
      expect(helper._resolvePreviewType({ name: 'a.mp4', document_type: 'video' }, false, 'a.mp4')).toBe('video');
    });

    it('returns preview_pages when item has preview pages', () => {
      expect(helper._resolvePreviewType({ name: 'a.docx', has_preview_pages: true }, false, 'a.docx')).toBe('preview_pages');
    });

    it('returns null for unknown type', () => {
      expect(helper._resolvePreviewType({ name: 'a.txt' }, false, 'a.txt')).toBeNull();
    });
  });

  describe('_documentIcon()', () => {
    it('returns svg with provided stroke color', () => {
      const html = helper._documentIcon('#ff0000');
      expect(html).toContain('stroke="#ff0000"');
      expect(html).toContain('<svg');
    });
  });

  describe('_thumbnailOrBadge()', () => {
    it('returns img tag when thumbnailUrl is provided', () => {
      const html = helper._thumbnailOrBadge('/thumb/123', 'alt text', '.jpg', '#000');
      expect(html).toContain('<img');
      expect(html).toContain('/thumb/123');
    });

    it('returns badge div when no thumbnailUrl', () => {
      const html = helper._thumbnailOrBadge(null, 'alt text', '.pdf', '#ea4335');
      expect(html).toContain('[.pdf]');
      expect(html).toContain('#ea4335');
    });
  });

  describe('_renderFileDropdownMenu()', () => {
    it('renders trash menu with restore', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'test.txt' }, true, {
        starUrl: '', starIconFill: '', starIconStroke: '', starActionText: '', downloadUrl: '', deleteUrl: ''
      });
      expect(html).toContain('Restore');
    });

    it('renders normal menu with all actions', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'test.txt' }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Add to Starred', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('Share');
      expect(html).toContain('Download');
      expect(html).toContain('Move to trash');
    });
  });

  describe('_renderItemLocation()', () => {
    it('returns empty string for non-search mode', () => {
      expect(helper._renderItemLocation('my-drive', { location: 'test' })).toBe('');
    });

    it('returns empty string when no location', () => {
      expect(helper._renderItemLocation('search', {})).toBe('');
    });

    it('returns location HTML for search mode with location', () => {
      const html = helper._renderItemLocation('search', { location: 'My Folder' });
      expect(html).toContain('My Folder');
    });
  });

  describe('_renderFileCardHeaderIcon()', () => {
    it('returns globe icon for public items', () => {
      const html = helper._renderFileCardHeaderIcon({ visibility: 'public' }, '<svg>default</svg>');
      expect(html).toContain('#007bff');
    });

    it('returns default icon for non-public items', () => {
      const icon = '<svg>default</svg>';
      const html = helper._renderFileCardHeaderIcon({ visibility: 'private' }, icon);
      expect(html).toBe(icon);
    });
  });

  describe('static stringToColor()', () => {
    it('returns a hex color string', () => {
      const color = GridLayoutHelper.stringToColor('Alice');
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('returns consistent color for same input', () => {
      expect(GridLayoutHelper.stringToColor('Bob')).toBe(GridLayoutHelper.stringToColor('Bob'));
    });

    it('returns different colors for different inputs', () => {
      expect(GridLayoutHelper.stringToColor('Alice')).not.toBe(GridLayoutHelper.stringToColor('Bob'));
    });
  });

  describe('_resolveFileIconAndBody() file type branches', () => {
    it('returns pdf icon for .pdf file', () => {
      const result = helper._resolveFileIconAndBody({ name: 'report.pdf' }, null, '.pdf', false);
      expect(result.icon).toContain('#ea4335');
    });

    it('returns excel icon for .xlsx file', () => {
      const result = helper._resolveFileIconAndBody({ name: 'data.xlsx' }, null, '.xlsx', false);
      expect(result.icon).toContain('#34a853');
    });

    it('returns excel icon for .csv file', () => {
      const result = helper._resolveFileIconAndBody({ name: 'data.csv' }, null, '.csv', false);
      expect(result.icon).toContain('#34a853');
    });

    it('returns word icon for .docx file', () => {
      const result = helper._resolveFileIconAndBody({ name: 'essay.docx' }, null, '.docx', false);
      expect(result.icon).toContain('#4285f4');
    });

    it('returns powerpoint icon for .pptx file', () => {
      const result = helper._resolveFileIconAndBody({ name: 'slides.pptx' }, null, '.pptx', false);
      expect(result.icon).toContain('#f4b400');
    });

    it('returns video icon for .mp4 file', () => {
      const result = helper._resolveFileIconAndBody({ name: 'clip.mp4', document_type: 'video' }, null, '.mp4', false);
      expect(result.icon).toContain('#e83e8c');
    });

    it('returns video icon by extension alone', () => {
      const result = helper._resolveFileIconAndBody({ name: 'clip.webm' }, null, '.webm', false);
      expect(result.icon).toContain('#e83e8c');
    });

    it('returns archive icon for .zip file', () => {
      const result = helper._resolveFileIconAndBody({ name: 'archive.zip' }, null, '.zip', false);
      expect(result.icon).toContain('#9c27b0');
      expect(result.bodyContent).toContain('[.zip]');
    });

    it('returns archive icon for .tar.gz file', () => {
      const result = helper._resolveFileIconAndBody({ name: 'archive.gz' }, null, '.gz', false);
      expect(result.icon).toContain('#9c27b0');
    });

    it('returns default icon for unknown file type', () => {
      const result = helper._resolveFileIconAndBody({ name: 'unknown.abc' }, null, '.abc', false);
      expect(result.icon).toContain('#4285f4');
    });

    it('returns image icon with thumbnail when isImage=true and has thumbnail', () => {
      const result = helper._resolveFileIconAndBody({ name: 'photo.jpg' }, '/thumb/123', '.jpg', true);
      expect(result.icon).toContain('#6f42c1');
      expect(result.bodyContent).toContain('<img');
    });

    it('returns image icon with badge when isImage=true but no thumbnail', () => {
      const result = helper._resolveFileIconAndBody({ name: 'photo.jpg' }, null, '.jpg', true);
      expect(result.icon).toContain('#6f42c1');
      expect(result.bodyContent).toContain('[.jpg]');
    });

    it('returns pdf with thumbnail when available', () => {
      const result = helper._resolveFileIconAndBody({ name: 'report.pdf' }, '/thumb/pdf', '.pdf', false);
      expect(result.bodyContent).toContain('<img');
    });
  });

  describe('_renderFolderDropdownMenu()', () => {
    it('renders trash restore menu for folder', () => {
      const html = helper._renderFolderDropdownMenu({ folder_id: 'f1' }, 'f1', 'Test', false, true, '/del', '/dl');
      expect(html).toContain('Restore');
    });

    it('renders normal folder menu with star and share', () => {
      const html = helper._renderFolderDropdownMenu({ folder_id: 'f1' }, 'f1', 'Test', true, false, '/del', '/dl');
      expect(html).toContain('Star');
      expect(html).toContain('Share');
      expect(html).toContain('Move to trash');
    });

    it('renders public visibility for folder', () => {
      const html = helper._renderFolderDropdownMenu({ folder_id: 'f1', visibility: 'public' }, 'f1', 'Test', false, false, '/del', '/dl');
      expect(html).toContain('Disable public link');
    });
  });

  describe('_renderFileDropdownMenu() visibility', () => {
    it('renders disable public link when file is public', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'test.txt', visibility: 'public' }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Add to Starred', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('Disable public link');
    });
  });

  describe('_renderFolderCard() branches', () => {
    it('renders folder card in starred viewMode (switches to my-drive link)', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me', is_starred: true }];
      const html = helper.render(items, [], [], 'starred', 'grid');
      expect(html).toContain('/my-drive?id=f1');
    });

    it('renders folder card in recent viewMode (switches to my-drive link)', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items, [], [], 'recent', 'grid');
      expect(html).toContain('/my-drive?id=f1');
    });

    it('renders folder card with search location', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me', location: 'Root', location_path: 'Root' }];
      const html = helper.render(items, [], [], 'search', 'grid');
      expect(html).toContain('Root');
    });

    it('renders folder card with created_by instead of owner', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', created_by: 'alice' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('alice');
    });

    it('renders folder card with created_dt when no updated_dt', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me', created_dt: '2025-01-01' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('folder-grid-card');
    });
  });

  describe('_renderFileCard edge cases', () => {
    it('renders file card with null name', () => {
      const items = [{ item_type: 'file', id: 'f1', name: null, owner: 'me' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('file-grid-card');
    });

    it('renders file card with no last_modified', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'test.txt', owner: null }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('file-grid-card');
    });

    it('renders file card with original_filename for extension detection', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'file', original_filename: 'file.pdf', owner: 'me' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('file-grid-card');
    });

    it('renders file card with no extension at all', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'README', owner: 'alice' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('file-grid-card');
      expect(html).toContain('alice');
    });

    it('renders file card with image detected by original_filename', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'img', original_filename: 'photo.png', owner: 'me' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('file-grid-card');
    });

    it('renders file card with video detected by extension only', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'movie.mov', owner: 'me' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('file-grid-card');
    });
  });

  describe('_renderFolderCard edge cases', () => {
    it('renders folder with item.id instead of folder_id', () => {
      const items = [{ item_type: 'folder', id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('folder-grid-card');
    });

    it('renders folder with no date sources', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('-'); // date fallback
    });

    it('renders folder with null name', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: null, owner: 'me' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('folder-grid-card');
    });

    it('renders folder with null layoutMode and viewMode', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items, [], [], null, null);
      expect(html).toContain('folder-grid-card');
    });
  });

  describe('_renderFileDropdownMenu file information', () => {
    it('renders File information menu item for non-trash files', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'report.pdf', content_type: 'application/pdf', size_bytes: 167000 }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Add to Starred', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('File information');
      expect(html).toContain('showFileInfoPanel');
    });

    it('includes data-info attributes with file metadata', () => {
      const html = helper._renderFileDropdownMenu({
        id: 'f1', name: 'report.pdf', content_type: 'application/pdf',
        size_bytes: 167000, created_dt: '2026-03-24T07:01:00Z',
        last_modified: '2026-03-24T07:01:00Z', last_opened: '2026-03-24T10:04:00Z',
        owner: 'alice'
      }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Add to Starred', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('data-info-name="report.pdf"');
      expect(html).toContain('data-info-type="application/pdf"');
      expect(html).toContain('data-info-size="167000"');
      expect(html).toContain('data-info-created="2026-03-24T07:01:00Z"');
      expect(html).toContain('data-info-modified="2026-03-24T07:01:00Z"');
      expect(html).toContain('data-info-opened="2026-03-24T10:04:00Z"');
      expect(html).toContain('data-info-owner="alice"');
    });

    it('does not render File information for trash files', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'test.txt' }, true, {
        starUrl: '', starIconFill: '', starIconStroke: '', starActionText: '', downloadUrl: '', deleteUrl: ''
      });
      expect(html).not.toContain('File information');
    });

    it('defaults owner to me when not provided', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'test.txt' }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Star', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('data-info-owner="me"');
    });

    it('defaults size to 0 when not provided', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'test.txt' }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Star', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('data-info-size="0"');
    });

    it('escapes double quotes in file name', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'file"name.txt' }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Star', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('data-info-name="file&quot;name.txt"');
    });

    it('uses updated_dt as fallback when last_modified is absent', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: 'test.txt', updated_dt: '2026-03-20T12:00:00Z' }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Star', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('data-info-modified="2026-03-20T12:00:00Z"');
    });
  });

  describe('_renderFileDropdownMenu edge cases', () => {
    it('handles file with null name and folder_id', () => {
      const html = helper._renderFileDropdownMenu({ id: 'f1', name: null, folder_id: null }, false, {
        starUrl: '/star', starIconFill: 'none', starIconStroke: 'currentColor',
        starActionText: 'Star', downloadUrl: '/dl', deleteUrl: '/del'
      });
      expect(html).toContain('Share');
    });
  });

  describe('_renderFolderDropdownMenu edge cases', () => {
    it('handles folder with null name and parent_folder_id', () => {
      const html = helper._renderFolderDropdownMenu({ folder_id: 'f1', parent_folder_id: null, visibility: 'private' }, 'f1', null, false, false, '/del', '/dl');
      expect(html).toContain('Star');
    });
  });

  describe('render() additional branches', () => {
    it('handles starred file items', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items, [], ['f1'], 'my-drive', 'grid');
      expect(html).toContain('file-grid-card');
    });

    it('handles starred folder items', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Docs', owner: 'me' }];
      const html = helper.render(items, ['f1'], [], 'my-drive', 'grid');
      expect(html).toContain('folder-grid-card');
    });

    it('handles trash viewMode for folders', () => {
      const items = [{ item_type: 'folder', folder_id: 'f1', name: 'Old', owner: 'me' }];
      const html = helper.render(items, [], [], 'trash', 'grid');
      expect(html).toContain('Restore');
    });

    it('handles trash viewMode for files', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'deleted.txt', owner: 'me' }];
      const html = helper.render(items, [], [], 'trash', 'grid');
      expect(html).toContain('Restore');
    });

    it('handles search viewMode with location on files', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'found.txt', owner: 'me', location: 'Docs', location_path: 'Root / Docs' }];
      const html = helper.render(items, [], [], 'search', 'grid');
      expect(html).toContain('Docs');
    });

    it('handles public visibility on files', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'pub.txt', owner: 'me', visibility: 'public' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('#007bff');
    });

    it('handles items with has_thumbnail', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'photo.jpg', owner: 'me', has_thumbnail: true, document_type: 'image' }];
      const html = helper.render(items, [], [], 'my-drive', 'grid');
      expect(html).toContain('file-grid-card');
    });

    it('handles items with has_preview_pages', () => {
      const items = [{ item_type: 'file', id: 'f1', name: 'report.docx', owner: 'me', has_preview_pages: true }];
      const html = helper.render(items);
      expect(html).toContain('file-grid-card');
    });
  });
});
