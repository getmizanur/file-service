const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const TrashItemsController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/trash-items-controller'
));

function createController(opts = {}) {
  const ctrl = Object.create(TrashItemsController.prototype);

  const postData = opts.postData || {};
  ctrl.requireIdentity = opts.requireIdentity || (async () => ({ email: 'test@example.com' }));
  ctrl.getRequest = () => ({ getPost: (key) => postData[key] !== undefined ? postData[key] : null });
  ctrl.ok = (data) => data;
  ctrl.handleException = (e) => ({ success: false, error: e.message });

  const deleteFileError = opts.deleteFileError || null;
  const trashFolderError = opts.trashFolderError || null;

  ctrl.getSm = () => ({
    get: (name) => {
      if (name === 'FileMetadataService') {
        return {
          deleteFile: async (fileId) => {
            if (deleteFileError) throw new Error(deleteFileError);
            return true;
          }
        };
      }
      if (name === 'FolderService') {
        return {
          trashFolder: async (folderId) => {
            if (trashFolderError) throw new Error(trashFolderError);
            return true;
          }
        };
      }
      return null;
    }
  });

  return ctrl;
}

describe('TrashItemsController', () => {
  describe('postAction()', () => {
    it('trashes a single file successfully', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'f1', type: 'file' }] }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({ id: 'f1', type: 'file', success: true });
    });

    it('trashes a single folder successfully', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'folder1', type: 'folder' }] }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results[0]).toEqual({ id: 'folder1', type: 'folder', success: true });
    });

    it('trashes mixed files and folders', async () => {
      const ctrl = createController({
        postData: {
          items: [
            { id: 'f1', type: 'file' },
            { id: 'folder1', type: 'folder' },
            { id: 'f2', type: 'file' }
          ]
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('returns error when no items provided', async () => {
      const ctrl = createController({ postData: { items: [] } });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no items/i);
    });

    it('returns error when items is null', async () => {
      const ctrl = createController({ postData: {} });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no items/i);
    });

    it('records partial failure when one item fails', async () => {
      let callCount = 0;
      const ctrl = Object.create(TrashItemsController.prototype);
      ctrl.requireIdentity = async () => ({ email: 'test@example.com' });
      ctrl.getRequest = () => ({
        getPost: (key) => key === 'items'
          ? [{ id: 'f1', type: 'file' }, { id: 'f2', type: 'file' }]
          : null
      });
      ctrl.ok = (data) => data;
      ctrl.handleException = (e) => ({ success: false, error: e.message });
      ctrl.getSm = () => ({
        get: (name) => {
          if (name === 'FileMetadataService') {
            return {
              deleteFile: async (fileId) => {
                callCount++;
                if (fileId === 'f1') throw new Error('File not found');
                return true;
              }
            };
          }
          if (name === 'FolderService') return { trashFolder: async () => true };
          return null;
        }
      });

      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({ id: 'f1', type: 'file', success: false, error: 'File not found' });
      expect(result.results[1]).toEqual({ id: 'f2', type: 'file', success: true });
      expect(callCount).toBe(2); // continued after first failure
    });

    it('returns auth error when not logged in', async () => {
      const ctrl = createController({});
      ctrl.requireIdentity = async () => { throw new Error('Login required'); };
      ctrl.postData = { items: [{ id: 'f1', type: 'file' }] };

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/login required/i);
    });
  });
});
