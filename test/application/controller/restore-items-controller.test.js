const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const RestoreItemsController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/restore-items-controller'
));

function createController(opts = {}) {
  const ctrl = Object.create(RestoreItemsController.prototype);

  const postData = opts.postData || {};
  ctrl.requireIdentity = opts.requireIdentity || (async () => ({ email: 'test@example.com' }));
  ctrl.getRequest = () => ({ getPost: (key) => postData[key] !== undefined ? postData[key] : null });
  ctrl.ok = (data) => data;
  ctrl.handleException = (e) => ({ success: false, error: e.message });

  const restoreFileError = opts.restoreFileError || null;
  const restoreFolderError = opts.restoreFolderError || null;

  ctrl.getSm = () => ({
    get: (name) => {
      if (name === 'FileMetadataService') {
        return {
          restoreFile: async (id, email) => {
            if (restoreFileError) throw new Error(restoreFileError);
            return true;
          }
        };
      }
      if (name === 'FolderService') {
        return {
          restoreFolder: async (id, email) => {
            if (restoreFolderError) throw new Error(restoreFolderError);
            return true;
          }
        };
      }
      return null;
    }
  });

  return ctrl;
}

describe('RestoreItemsController', () => {
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

    it('restores a file successfully', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'f1', type: 'file' }] }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({ id: 'f1', type: 'file', success: true });
    });

    it('restores a folder successfully', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'fold1', type: 'folder' }] }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({ id: 'fold1', type: 'folder', success: true });
    });

    it('restores mixed files and folders', async () => {
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

    it('records partial failure when a file restore throws', async () => {
      let callCount = 0;
      const ctrl = Object.create(RestoreItemsController.prototype);
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
              restoreFile: async (id) => {
                callCount++;
                if (id === 'f1') throw new Error('File not found');
                return true;
              }
            };
          }
          if (name === 'FolderService') return { restoreFolder: async () => true };
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

    it('records partial failure when a folder restore throws', async () => {
      const ctrl = Object.create(RestoreItemsController.prototype);
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
          if (name === 'FileMetadataService') return { restoreFile: async () => true };
          if (name === 'FolderService') {
            return {
              restoreFolder: async () => { throw new Error('Parent folder deleted'); }
            };
          }
          return null;
        }
      });

      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results[0]).toEqual({ id: 'fold1', type: 'folder', success: false, error: 'Parent folder deleted' });
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
