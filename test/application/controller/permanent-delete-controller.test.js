const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const PermanentDeleteController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/permanent-delete-controller'
));

function createController(opts = {}) {
  const ctrl = Object.create(PermanentDeleteController.prototype);

  const postData = opts.postData || {};
  ctrl.requireIdentity = opts.requireIdentity || (async () => ({ email: 'test@example.com' }));
  ctrl.getRequest = () => ({ getPost: (key) => postData[key] !== undefined ? postData[key] : null });
  ctrl.ok = (data) => data;
  ctrl.handleException = (e) => ({ success: false, error: e.message });

  const deleteFileError = opts.deleteFileError || null;
  const deleteFolderError = opts.deleteFolderError || null;

  ctrl.getSm = () => ({
    get: (name) => {
      if (name === 'FileMetadataService') {
        return {
          permanentDeleteFile: async (id, email) => {
            if (deleteFileError) throw new Error(deleteFileError);
            return true;
          }
        };
      }
      if (name === 'FolderService') {
        return {
          permanentDeleteFolder: async (id, email) => {
            if (deleteFolderError) throw new Error(deleteFolderError);
            return true;
          }
        };
      }
      return null;
    }
  });

  return ctrl;
}

describe('PermanentDeleteController', () => {
  describe('postAction()', () => {
    it('returns error when items array is empty', async () => {
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

    it('permanently deletes a file successfully', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'f1', type: 'file' }] }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({ id: 'f1', type: 'file', success: true });
    });

    it('permanently deletes a folder successfully', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'fold1', type: 'folder' }] }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({ id: 'fold1', type: 'folder', success: true });
    });

    it('permanently deletes mixed files and folders', async () => {
      const ctrl = createController({
        postData: {
          items: [
            { id: 'f1', type: 'file' },
            { id: 'fold1', type: 'folder' },
            { id: 'f2', type: 'file' }
          ]
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('records partial failure when a file delete throws', async () => {
      let callCount = 0;
      const ctrl = Object.create(PermanentDeleteController.prototype);
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
              permanentDeleteFile: async (id) => {
                callCount++;
                if (id === 'f1') throw new Error('File not in trash');
                return true;
              }
            };
          }
          if (name === 'FolderService') return { permanentDeleteFolder: async () => true };
          return null;
        }
      });

      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({ id: 'f1', type: 'file', success: false, error: 'File not in trash' });
      expect(result.results[1]).toEqual({ id: 'f2', type: 'file', success: true });
      expect(callCount).toBe(2);
    });

    it('records partial failure when a folder delete throws', async () => {
      const ctrl = Object.create(PermanentDeleteController.prototype);
      ctrl.requireIdentity = async () => ({ email: 'test@example.com' });
      ctrl.getRequest = () => ({
        getPost: (key) => key === 'items'
          ? [{ id: 'fold1', type: 'folder' }]
          : null
      });
      ctrl.ok = (data) => data;
      ctrl.handleException = (e) => ({ success: false, error: e.message });
      ctrl.getSm = () => ({
        get: (name) => {
          if (name === 'FileMetadataService') return { permanentDeleteFile: async () => true };
          if (name === 'FolderService') {
            return {
              permanentDeleteFolder: async () => { throw new Error('Cannot delete root'); }
            };
          }
          return null;
        }
      });

      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results[0]).toEqual({ id: 'fold1', type: 'folder', success: false, error: 'Cannot delete root' });
    });

    it('skips items with unknown type', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'x1', type: 'unknown' }] }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it('returns auth error when requireIdentity throws', async () => {
      const ctrl = createController({
        requireIdentity: async () => { throw new Error('Unauthorized'); }
      });
      ctrl.getRequest = () => ({ getPost: () => [{ id: 'f1', type: 'file' }] });

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/unauthorized/i);
    });
  });
});
