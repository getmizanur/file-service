const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const ListLayoutHelper = require(globalThis.applicationPath('/application/helper/list-layout-helper'));

describe('ListLayoutHelper - Checkbox Feature', () => {
  let helper;

  beforeEach(() => {
    helper = new ListLayoutHelper();
  });

  const folderItem = {
    folder_id: 'folder-1', name: 'Documents', item_type: 'folder',
    owner: 'me', created_dt: '2024-01-01'
  };

  const fileItem = {
    id: 'file-1', name: 'report.pdf', item_type: 'file',
    owner: 'me', last_modified: '2024-01-01', size_bytes: 1024
  };

  describe('render() table header', () => {
    it('renders a select-all checkbox in the header', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      expect(html).toContain('id="select-all-checkbox"');
      expect(html).toContain('checkbox-cell');
      expect(html).toContain('list-checkbox');
    });

    it('adds id to the table element', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      expect(html).toContain('id="file-list-table"');
    });

    it('renders checkbox header before Name header', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      const checkboxPos = html.indexOf('select-all-checkbox');
      const namePos = html.indexOf('>Name</th>');
      expect(checkboxPos).toBeLessThan(namePos);
    });
  });

  describe('folder row checkbox', () => {
    it('renders a checkbox in folder rows', () => {
      const html = helper.render([folderItem], [], [], 'my-drive', 'list');
      expect(html).toContain('row-checkbox');
      expect(html).toContain('data-item-type="folder"');
      expect(html).toContain('data-item-id="folder-1"');
    });

    it('includes folder name in data attribute', () => {
      const html = helper.render([folderItem], [], [], 'my-drive', 'list');
      expect(html).toContain('data-item-name="Documents"');
    });

    it('stops propagation on checkbox cell click', () => {
      const html = helper.render([folderItem], [], [], 'my-drive', 'list');
      expect(html).toContain('onclick="event.stopPropagation();"');
    });

    it('adds data-item-id and data-item-type to tr', () => {
      const html = helper.render([folderItem], [], [], 'my-drive', 'list');
      expect(html).toContain('data-item-id="folder-1"');
      expect(html).toContain('data-item-type="folder"');
    });
  });

  describe('file row checkbox', () => {
    it('renders a checkbox in file rows', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      expect(html).toContain('row-checkbox');
      expect(html).toContain('data-item-type="file"');
      expect(html).toContain('data-item-id="file-1"');
    });

    it('includes file name in data attribute', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      expect(html).toContain('data-item-name="report.pdf"');
    });

    it('adds data-item-id and data-item-type to tr', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      expect(html).toContain('data-item-id="file-1"');
      expect(html).toContain('data-item-type="file"');
    });
  });

  describe('mixed items', () => {
    it('renders checkboxes for both folders and files', () => {
      const items = [
        { ...folderItem },
        { ...fileItem }
      ];
      const html = helper.render(items, [], [], 'my-drive', 'list');
      const checkboxCount = (html.match(/row-checkbox/g) || []).length;
      expect(checkboxCount).toBe(2);
    });

    it('checkbox cell is the first td in each row', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      // The first <td> after <tr> should be the checkbox cell
      const trMatch = html.match(/<tr[^>]*class="list-row file-row"[^>]*>\s*<td[^>]*class="[^"]*checkbox-cell/);
      expect(trMatch).not.toBeNull();
    });
  });

  describe('checkbox with special characters in name', () => {
    it('escapes double quotes in folder name', () => {
      const item = { ...folderItem, name: 'My "Special" Folder' };
      const html = helper.render([item], [], [], 'my-drive', 'list');
      expect(html).toContain('data-item-name="My &quot;Special&quot; Folder"');
    });

    it('escapes double quotes in file name', () => {
      const item = { ...fileItem, name: 'file "test".pdf' };
      const html = helper.render([item], [], [], 'my-drive', 'list');
      expect(html).toContain('data-item-name="file &quot;test&quot;.pdf"');
    });
  });

  describe('checkbox rendering across view modes', () => {
    const viewModes = ['my-drive', 'starred', 'recent', 'trash', 'shared-with-me', 'search'];

    viewModes.forEach(mode => {
      it(`renders checkboxes in ${mode} view`, () => {
        const html = helper.render([fileItem], [], [], mode, 'list');
        expect(html).toContain('select-all-checkbox');
        expect(html).toContain('row-checkbox');
      });
    });
  });

  describe('custom checkbox styling', () => {
    it('uses custom checkbox label and span', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      expect(html).toContain('list-checkbox-label');
      expect(html).toContain('list-checkbox-custom');
    });

    it('hides native checkbox input', () => {
      const html = helper.render([fileItem], [], [], 'my-drive', 'list');
      // The input should have the list-checkbox class (styled to be hidden via CSS)
      expect(html).toContain('class="list-checkbox row-checkbox"');
    });
  });
});
