const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const NewButtonHelper = require(globalThis.applicationPath('/application/helper/new-button-helper'));

describe('NewButtonHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new NewButtonHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(NewButtonHelper);
  });

  describe('render()', () => {
    it('renders with default folder ID when no args', () => {
      const html = helper.render();
      expect(html).toContain('new-btn');
      expect(html).toContain('New');
      expect(html).toContain('a1000000-0000-0000-0000-000000000001');
    });

    it('renders with null folder ID using default', () => {
      const html = helper.render(null);
      expect(html).toContain('a1000000-0000-0000-0000-000000000001');
    });

    it('renders with provided folder ID', () => {
      const html = helper.render('custom-folder-id');
      expect(html).toContain('custom-folder-id');
    });

    it('contains New folder dropdown item', () => {
      const html = helper.render();
      expect(html).toContain('New folder');
      expect(html).toContain('btnNewFolder');
    });

    it('contains File upload dropdown item', () => {
      const html = helper.render();
      expect(html).toContain('File upload');
      expect(html).toContain('fileUploadInput');
    });

    it('contains new folder modal', () => {
      const html = helper.render();
      expect(html).toContain('newFolderModal');
      expect(html).toContain('newFolderName');
      expect(html).toContain('Create');
      expect(html).toContain('Cancel');
    });

    it('sets parent_folder_id hidden input to current folder', () => {
      const html = helper.render('my-folder-id');
      expect(html).toContain('name="parent_folder_id"');
      expect(html).toContain('value="my-folder-id"');
    });

    it('strips Nunjucks context from args', () => {
      const ctx = { ctx: {}, env: {} };
      const html = helper.render('folder-123', ctx);
      expect(html).toContain('folder-123');
    });
  });
});
