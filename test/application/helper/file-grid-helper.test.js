const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileGridHelper = require(globalThis.applicationPath('/application/helper/file-grid-helper'));

describe('FileGridHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new FileGridHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(FileGridHelper);
  });

  describe('render()', () => {
    it('returns empty message when items is null', () => {
      const html = helper.render(null);
      expect(html).toContain('No files in this location');
    });

    it('returns empty message when items is empty array', () => {
      const html = helper.render([]);
      expect(html).toContain('No files in this location');
    });

    it('renders a file card with row wrapper by default', () => {
      const items = [{ id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('row mb-4');
      expect(html).toContain('file-grid-card');
      expect(html).toContain('test.txt');
    });

    it('omits row wrapper when wrapInRow is false', () => {
      const items = [{ id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items, [], 'my-drive', 'grid', false);
      expect(html).not.toMatch(/^<div class="row mb-4">/);
      expect(html).toContain('file-grid-card');
    });

    it('strips Nunjucks context from args', () => {
      const items = [{ id: 'f1', name: 'doc.pdf', owner: 'me' }];
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(items, [], 'my-drive', 'grid', true, ctx);
      expect(html).toContain('doc.pdf');
    });
  });

  describe('_resolveIconAndBody()', () => {
    it('returns image icon for image type', () => {
      const item = { name: 'photo.jpg', document_type: 'image' };
      const result = helper._resolveIconAndBody(item, null, '.jpg', true);
      expect(result.icon).toContain('#6f42c1');
    });

    it('returns pdf icon for .pdf file', () => {
      const item = { name: 'report.pdf' };
      const result = helper._resolveIconAndBody(item, null, '.pdf', false);
      expect(result.icon).toContain('#ea4335');
    });

    it('returns spreadsheet icon for .xlsx file', () => {
      const item = { name: 'data.xlsx' };
      const result = helper._resolveIconAndBody(item, null, '.xlsx', false);
      expect(result.icon).toContain('#34a853');
    });

    it('returns word icon for .docx file', () => {
      const item = { name: 'letter.docx' };
      const result = helper._resolveIconAndBody(item, null, '.docx', false);
      expect(result.icon).toContain('#4285f4');
    });

    it('returns ppt icon for .pptx file', () => {
      const item = { name: 'slides.pptx' };
      const result = helper._resolveIconAndBody(item, null, '.pptx', false);
      expect(result.icon).toContain('#f4b400');
    });

    it('returns video icon for video type', () => {
      const item = { name: 'clip.mp4', document_type: 'video' };
      const result = helper._resolveIconAndBody(item, null, '.mp4', false);
      expect(result.icon).toContain('#e83e8c');
    });

    it('returns archive icon for .zip file', () => {
      const item = { name: 'archive.zip' };
      const result = helper._resolveIconAndBody(item, null, '.zip', false);
      expect(result.icon).toContain('#9c27b0');
    });

    it('returns generic icon for unknown file type', () => {
      const item = { name: 'readme.txt' };
      const result = helper._resolveIconAndBody(item, null, '.txt', false);
      expect(result.icon).toContain('#4285f4');
    });

    it('renders thumbnail img when thumbnailUrl provided', () => {
      const item = { name: 'photo.jpg', document_type: 'image' };
      const result = helper._resolveIconAndBody(item, '/thumb/123', '.jpg', true);
      expect(result.bodyContent).toContain('<img');
      expect(result.bodyContent).toContain('/thumb/123');
    });
  });

  describe('_resolvePreviewType()', () => {
    it('returns image for image items', () => {
      expect(helper._resolvePreviewType({ name: 'a.jpg', document_type: 'image' }, true, 'a.jpg')).toBe('image');
    });

    it('returns pdf for pdf items', () => {
      expect(helper._resolvePreviewType({ name: 'a.pdf' }, false, 'a.pdf')).toBe('pdf');
    });

    it('returns video for video items', () => {
      expect(helper._resolvePreviewType({ name: 'a.mp4', document_type: 'video' }, false, 'a.mp4')).toBe('video');
    });

    it('returns null for unknown type', () => {
      expect(helper._resolvePreviewType({ name: 'a.txt' }, false, 'a.txt')).toBeNull();
    });
  });

  describe('_renderDropdownMenu()', () => {
    it('renders trash menu with restore option', () => {
      const html = helper._renderDropdownMenu({ id: 'f1', name: 'test.txt' }, true, {
        downloadUrl: '', deleteUrl: '', starUrl: '', starActionText: '', starIconFill: '', starIconStroke: ''
      });
      expect(html).toContain('Restore');
      expect(html).not.toContain('Share');
    });

    it('renders normal menu with share, download, delete options', () => {
      const html = helper._renderDropdownMenu({ id: 'f1', name: 'test.txt' }, false, {
        downloadUrl: '/dl', deleteUrl: '/del', starUrl: '/star',
        starActionText: 'Add to Starred', starIconFill: 'none', starIconStroke: 'currentColor'
      });
      expect(html).toContain('Share');
      expect(html).toContain('Download');
      expect(html).toContain('Move to trash');
      expect(html).toContain('Rename');
    });
  });

  describe('static _stringToColor()', () => {
    it('returns a hex color string', () => {
      const color = FileGridHelper._stringToColor('Alice');
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('returns consistent color for same input', () => {
      const c1 = FileGridHelper._stringToColor('Bob');
      const c2 = FileGridHelper._stringToColor('Bob');
      expect(c1).toBe(c2);
    });

    it('returns different colors for different inputs', () => {
      const c1 = FileGridHelper._stringToColor('Alice');
      const c2 = FileGridHelper._stringToColor('Bob');
      expect(c1).not.toBe(c2);
    });
  });

  describe('render() additional branches', () => {
    it('renders starred file cards', () => {
      const items = [{ id: 'f1', name: 'starred.txt', owner: 'me' }];
      const html = helper.render(items, ['f1']);
      expect(html).toContain('#fbbc04');
    });

    it('renders trash view with restore', () => {
      const items = [{ id: 'f1', name: 'old.txt', owner: 'me' }];
      const html = helper.render(items, [], 'trash');
      expect(html).toContain('Restore');
    });

    it('renders search view with location', () => {
      const items = [{ id: 'f1', name: 'found.txt', owner: 'me', location: 'Docs', location_path: 'Root / Docs' }];
      const html = helper.render(items, [], 'search');
      expect(html).toContain('Docs');
    });

    it('renders public visibility items', () => {
      const items = [{ id: 'f1', name: 'pub.txt', owner: 'me', visibility: 'public' }];
      const html = helper.render(items, [], 'my-drive');
      expect(html).toContain('file-grid-card');
    });

    it('renders items with thumbnails', () => {
      const items = [{ id: 'f1', name: 'photo.jpg', owner: 'me', has_thumbnail: true, document_type: 'image' }];
      const html = helper.render(items, [], 'my-drive');
      expect(html).toContain('file-grid-card');
    });

    it('renders items with preview pages', () => {
      const items = [{ id: 'f1', name: 'doc.docx', owner: 'me', has_preview_pages: true }];
      const html = helper.render(items, [], 'my-drive');
      expect(html).toContain('file-grid-card');
    });
  });

  describe('render() null property branches', () => {
    it('renders with null viewMode and layoutMode', () => {
      const items = [{ id: 'f1', name: 'test.txt', owner: 'me' }];
      const html = helper.render(items, [], null, null);
      expect(html).toContain('file-grid-card');
    });

    it('renders with empty name', () => {
      const items = [{ id: 'f1', name: '', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('file-grid-card');
    });

    it('renders with original_filename and empty name', () => {
      const items = [{ id: 'f1', name: '', original_filename: 'file.pdf', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('file-grid-card');
    });

    it('renders file with no owner', () => {
      const items = [{ id: 'f1', name: 'test.txt' }];
      const html = helper.render(items);
      expect(html).toContain('file-grid-card');
    });

    it('renders file with video by extension only', () => {
      const items = [{ id: 'f1', name: 'clip.webm', owner: 'me' }];
      const html = helper.render(items);
      expect(html).toContain('file-grid-card');
    });

    it('renders file with public visibility and disable link', () => {
      const items = [{ id: 'f1', name: 'pub.txt', owner: 'me', visibility: 'public' }];
      const html = helper.render(items, [], 'my-drive', 'grid');
      expect(html).toContain('Disable public link');
    });

    it('renders file in search viewMode', () => {
      const items = [{ id: 'f1', name: 'found.txt', owner: 'me', location: 'Docs', location_path: 'Root / Docs' }];
      const html = helper.render(items, [], 'search', 'grid');
      expect(html).toContain('Docs');
    });
  });

  describe('_resolveIconAndBody() additional', () => {
    it('handles archive extensions (.tar.gz)', () => {
      const item = { name: 'backup.tar.gz' };
      const result = helper._resolveIconAndBody(item, null, '.gz', false);
      expect(result.icon).toBeDefined();
    });
  });
});
