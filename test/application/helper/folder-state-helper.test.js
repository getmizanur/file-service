const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderStateHelper = require(globalThis.applicationPath('/application/helper/folder-state-helper'));

describe('FolderStateHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new FolderStateHelper();
  });

  describe('render()', () => {
    it('returns fallback UUID for null tree', () => {
      expect(helper.render(null)).toBe('a1000000-0000-0000-0000-000000000001');
    });

    it('returns fallback UUID for undefined tree', () => {
      expect(helper.render(undefined)).toBe('a1000000-0000-0000-0000-000000000001');
    });

    it('returns fallback UUID for empty array', () => {
      expect(helper.render([])).toBe('a1000000-0000-0000-0000-000000000001');
    });

    it('returns first item folder_id when tree has items', () => {
      const tree = [
        { folder_id: 'abc-123', name: 'Root' },
        { folder_id: 'def-456', name: 'Child' }
      ];
      expect(helper.render(tree)).toBe('abc-123');
    });

    it('returns first item folder_id for single-item tree', () => {
      const tree = [{ folder_id: 'single-folder-id', name: 'Only' }];
      expect(helper.render(tree)).toBe('single-folder-id');
    });
  });
});
