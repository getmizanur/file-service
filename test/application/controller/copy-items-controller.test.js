const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const CopyItemsController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/copy-items-controller'
));

function createController(opts = {}) {
  const ctrl = Object.create(CopyItemsController.prototype);

  const postData = opts.postData || {};
  ctrl.requireIdentity = async () => ({ email: opts.email || 'test@example.com' });

  ctrl.getRequest = () => ({
    getPost: (key) => postData[key] !== undefined ? postData[key] : null
  });

  ctrl.ok = (data) => data;
  ctrl.handleException = (e) => ({ success: false, error: e.message });

  const copyFileResults = opts.copyFileResults || {};
  const copyFolderResults = opts.copyFolderResults || {};
  const copyFileError = opts.copyFileError || null;
  const copyFolderError = opts.copyFolderError || null;

  ctrl.getSm = () => ({
    get: (name) => {
      if (name === 'FileMetadataService') {
        return {
          copyFile: async (fileId, targetFolderId, email) => {
            if (copyFileError) throw new Error(copyFileError);
            return copyFileResults[fileId] || { file_id: 'new-file-' + fileId };
          }
        };
      }
      if (name === 'FolderService') {
        return {
          copyFolder: async (folderId, targetParentId, email) => {
            if (copyFolderError) throw new Error(copyFolderError);
            return copyFolderResults[folderId] || 'new-folder-' + folderId;
          }
        };
      }
      return null;
    }
  });

  return ctrl;
}

describe('CopyItemsController', () => {
  describe('postAction()', () => {
    it('copies files successfully', async () => {
      const ctrl = createController({
        postData: {
          items: [{ id: 'f1', type: 'file' }],
          targetFolderId: 'dest-folder'
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].type).toBe('file');
      expect(result.results[0].newId).toBe('new-file-f1');
    });

    it('copies folders successfully', async () => {
      const ctrl = createController({
        postData: {
          items: [{ id: 'folder1', type: 'folder' }],
          targetFolderId: 'dest-folder'
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].type).toBe('folder');
      expect(result.results[0].newId).toBe('new-folder-folder1');
    });

    it('copies mixed files and folders', async () => {
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
      expect(result.results[0].type).toBe('file');
      expect(result.results[1].type).toBe('folder');
      expect(result.results[2].type).toBe('file');
    });

    it('returns error when targetFolderId is missing', async () => {
      const ctrl = createController({
        postData: {
          items: [{ id: 'f1', type: 'file' }],
          targetFolderId: null
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Target folder is required');
    });

    it('returns error when items array is empty', async () => {
      const ctrl = createController({
        postData: {
          items: [],
          targetFolderId: 'dest-folder'
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No items selected');
    });

    it('returns error when items is not an array', async () => {
      const ctrl = createController({
        postData: {
          items: null,
          targetFolderId: 'dest-folder'
        }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No items selected');
    });

    it('handles partial failures gracefully', async () => {
      const ctrl = createController({
        postData: {
          items: [
            { id: 'f1', type: 'file' },
            { id: 'f2', type: 'file' }
          ],
          targetFolderId: 'dest-folder'
        },
        copyFileError: 'File not found'
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('File not found');
    });

    it('handles authentication failure', async () => {
      const ctrl = createController({
        postData: {
          items: [{ id: 'f1', type: 'file' }],
          targetFolderId: 'dest-folder'
        }
      });
      ctrl.requireIdentity = async () => { throw new Error('Login required'); };
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Login required');
    });
  });
});
