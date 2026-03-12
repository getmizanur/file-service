const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileListHelper = require(globalThis.applicationPath('/application/helper/file-list-helper'));

describe('FileListHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new FileListHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(FileListHelper);
  });

  describe('render()', () => {
    it('returns empty message when items is null', () => {
      const html = helper.render(null);
      expect(html).toContain('No files or folders found');
    });

    it('returns empty message when items is empty array', () => {
      const html = helper.render([]);
      expect(html).toContain('No files or folders found');
    });

    it('renders a file row for a file item', () => {
      const items = [{ id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('<tr');
      expect(html).toContain('test.txt');
      expect(html).toContain('file-row');
    });

    it('strips Nunjucks context from args', () => {
      const items = [{ id: 'f1', name: 'test.txt' }];
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(items, [], 'my-drive', 'list', ctx);
      expect(html).toContain('test.txt');
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

    it('handles string input', () => {
      expect(helper._formatSize('1024')).toBe('1.0 KB');
    });
  });

  describe('_resolveIcon()', () => {
    it('returns folder icon for folder type', () => {
      const html = helper._resolveIcon({ item_type: 'folder', name: 'docs' });
      expect(html).toContain('stroke="#5f6368"');
    });

    it('returns image icon for image type', () => {
      const html = helper._resolveIcon({ document_type: 'image', name: 'photo.jpg' });
      expect(html).toContain('#6f42c1');
    });

    it('returns video icon for video type', () => {
      const html = helper._resolveIcon({ document_type: 'video', name: 'clip.mp4' });
      expect(html).toContain('#e83e8c');
    });

    it('returns pdf icon for .pdf file', () => {
      const html = helper._resolveIcon({ name: 'report.pdf' });
      expect(html).toContain('#ea4335');
    });

    it('returns xlsx icon for .xlsx file', () => {
      const html = helper._resolveIcon({ name: 'data.xlsx' });
      expect(html).toContain('stroke="currentColor"');
    });

    it('returns generic icon for unknown type', () => {
      const html = helper._resolveIcon({ name: 'readme.txt' });
      expect(html).toContain('#007bff');
    });
  });

  describe('_resolvePreviewType()', () => {
    it('returns null for folder', () => {
      expect(helper._resolvePreviewType({ item_type: 'folder', name: 'docs' })).toBeNull();
    });

    it('returns image for image document type', () => {
      expect(helper._resolvePreviewType({ document_type: 'image', name: 'photo.png' })).toBe('image');
    });

    it('returns pdf for .pdf file', () => {
      expect(helper._resolvePreviewType({ name: 'doc.pdf' })).toBe('pdf');
    });

    it('returns video for video document type', () => {
      expect(helper._resolvePreviewType({ document_type: 'video', name: 'clip.mp4' })).toBe('video');
    });

    it('returns null for unknown type', () => {
      expect(helper._resolvePreviewType({ name: 'file.txt' })).toBeNull();
    });
  });

  describe('_renderPreviewPopup()', () => {
    it('returns empty string for null thumbnail', () => {
      expect(helper._renderPreviewPopup(null)).toBe('');
    });

    it('returns popup HTML with thumbnail URL', () => {
      const html = helper._renderPreviewPopup('/thumb/123');
      expect(html).toContain('file-preview-popup');
      expect(html).toContain('/thumb/123');
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
    it('renders restore button for trash items', () => {
      const html = helper._renderQuickActions({ id: 'f1', name: 'test.txt' }, true, false, '', '');
      expect(html).toContain('Restore');
    });

    it('renders action buttons for non-trash items', () => {
      const html = helper._renderQuickActions(
        { id: 'f1', name: 'test.txt' }, false, false, '/star', '/del'
      );
      expect(html).toContain('Share');
      expect(html).toContain('Download');
    });

    it('renders starred icon for starred items', () => {
      const html = helper._renderQuickActions(
        { id: 'f1', name: 'test.txt' }, false, true, '/star', '/del'
      );
      expect(html).toContain('#fbbc04');
      expect(html).toContain('Remove from Starred');
    });

    it('renders public link icon for public items', () => {
      const html = helper._renderQuickActions(
        { id: 'f1', name: 'test.txt', visibility: 'public' }, false, false, '/star', '/del'
      );
      expect(html).toContain('Public Link Active');
    });
  });

  describe('render() additional branches', () => {
    it('renders with starred file IDs', () => {
      const items = [{ id: 'f1', name: 'star.txt', owner: 'me' }];
      const html = helper.render(items, ['f1']);
      expect(html).toContain('#fbbc04');
    });

    it('renders trash view items', () => {
      const items = [{ id: 'f1', name: 'deleted.txt', owner: 'me' }];
      const html = helper.render(items, [], 'trash');
      expect(html).toContain('Restore');
    });

    it('renders search view with location', () => {
      const items = [{ id: 'f1', name: 'found.txt', owner: 'me', location: 'Docs', location_path: 'Root / Docs' }];
      const html = helper.render(items, [], 'search');
      expect(html).toContain('location-cell');
      expect(html).toContain('Docs');
    });

    it('renders items with thumbnails and preview popups', () => {
      const items = [{ id: 'f1', name: 'photo.jpg', owner: 'me', has_thumbnail: true, item_type: 'file' }];
      const html = helper.render(items, [], 'my-drive');
      expect(html).toContain('file-preview-popup');
    });

    it('renders folder items in file list', () => {
      const items = [{ id: 'fold1', name: 'Folder', owner: 'me', item_type: 'folder' }];
      const html = helper.render(items);
      expect(html).toContain('Folder');
    });
  });

  describe('_renderLocationCell() with path', () => {
    it('renders location with tooltip for search mode', () => {
      const html = helper._renderLocationCell(
        { location: 'Child', location_path: 'Root / Child' }, 'search'
      );
      expect(html).toContain('location-tooltip-popup');
      expect(html).toContain('Root');
    });

    it('renders location without tooltip when empty path', () => {
      const html = helper._renderLocationCell(
        { location: '', location_path: '' }, 'search'
      );
      expect(html).toContain('location-cell');
    });
  });
});
