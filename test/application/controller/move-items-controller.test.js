const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const MoveItemsController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/move-items-controller'
));

function createController(opts = {}) {
  const ctrl = Object.create(MoveItemsController.prototype);

  const postData = opts.postData || {};
  ctrl.requireIdentity = opts.requireIdentity || (async () => ({ email: 'test@example.com' }));
  ctrl.getRequest = () => ({ getPost: (key) => postData[key] !== undefined ? postData[key] : null });
  ctrl.ok = (data) => data;
  ctrl.handleException = (e) => ({ success: false, error: e.message });

  const moveFileError = opts.moveFileError || null;
  const moveFolderError = opts.moveFolderError || null;

  ctrl.getSm = () => ({
    get: (name) => {
      if (name === 'FileMetadataService') {
        return {
          moveFile: async () => {
            if (moveFileError) throw new Error(moveFileError);
            return true;
          }
        };
      }
      if (name === 'FolderService') {
        return {
          moveFolder: async () => {
            if (moveFolderError) throw new Error(moveFolderError);
            return true;
          }
        };
      }
      return null;
    }
  });

  return ctrl;
}

describe('MoveItemsController', () => {
  describe('postAction()', () => {
    it('moves a single file successfully', async () => {
      const ctrl = createController({
        postData: {
          items: [{ id: 'f1', type: 'file' }],
          targetFolderId: 'dest-folder'
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({ id: 'f1', type: 'file', success: true });
    });

    it('moves a single folder successfully', async () => {
      const ctrl = createController({
        postData: {
          items: [{ id: 'folder1', type: 'folder' }],
          targetFolderId: 'dest-folder'
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results[0]).toEqual({ id: 'folder1', type: 'folder', success: true });
    });

    it('moves mixed files and folders', async () => {
      const ctrl = createController({
        postData: {
          items: [
            { id: 'f1', type: 'file' },
            { id: 'folder1', type: 'folder' },
            { id: 'f2', type: 'file' }
          ],
          targetFolderId: 'dest-folder'
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('returns error when targetFolderId is missing', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'f1', type: 'file' }] }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/target folder/i);
    });

    it('returns error when items array is empty', async () => {
      const ctrl = createController({
        postData: { items: [], targetFolderId: 'dest-folder' }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no items/i);
    });

    it('returns error when items is null', async () => {
      const ctrl = createController({
        postData: { targetFolderId: 'dest-folder' }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no items/i);
    });

    it('records partial failure and continues moving remaining items', async () => {
      let callCount = 0;
      const ctrl = Object.create(MoveItemsController.prototype);
      ctrl.requireIdentity = async () => ({ email: 'test@example.com' });
      ctrl.getRequest = () => ({
        getPost: (key) => key === 'items'
          ? [{ id: 'f1', type: 'file' }, { id: 'f2', type: 'file' }]
          : 'dest-folder'
      });
      ctrl.ok = (data) => data;
      ctrl.handleException = (e) => ({ success: false, error: e.message });
      ctrl.getSm = () => ({
        get: (name) => {
          if (name === 'FileMetadataService') {
            return {
              moveFile: async (fileId) => {
                callCount++;
                if (fileId === 'f1') throw new Error('File not found');
                return true;
              }
            };
          }
          if (name === 'FolderService') return { moveFolder: async () => true };
          return null;
        }
      });

      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({ id: 'f1', type: 'file', success: false, error: 'File not found' });
      expect(result.results[1]).toEqual({ id: 'f2', type: 'file', success: true });
      expect(callCount).toBe(2);
    });

    it('returns auth error when not logged in', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'f1', type: 'file' }], targetFolderId: 'dest' }
      });
      ctrl.requireIdentity = async () => { throw new Error('Login required'); };

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/login required/i);
    });
  });
});
