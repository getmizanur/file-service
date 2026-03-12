const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const EmptyTrashController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/empty-trash-controller'
));

function createController(opts = {}) {
  const ctrl = Object.create(EmptyTrashController.prototype);

  ctrl.requireIdentity = opts.requireIdentity || (async () => ({ email: 'test@example.com' }));
  ctrl.ok = (data) => data;
  ctrl.handleException = (e) => ({ success: false, error: e.message });

  const emptyTrashError = opts.emptyTrashError || null;

  ctrl.getSm = () => ({
    get: (name) => {
      if (name === 'FileMetadataService') {
        return {
          emptyTrash: async (email) => {
            if (emptyTrashError) throw new Error(emptyTrashError);
            return true;
          }
        };
      }
      return null;
    }
  });

  return ctrl;
}

describe('EmptyTrashController', () => {
  describe('postAction()', () => {
    it('empties trash successfully and returns success', async () => {
      const ctrl = createController();
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
    });

    it('calls emptyTrash with the user email', async () => {
      let capturedEmail = null;
      const ctrl = Object.create(EmptyTrashController.prototype);
      ctrl.requireIdentity = async () => ({ email: 'user@test.com' });
      ctrl.ok = (data) => data;
      ctrl.handleException = (e) => ({ success: false, error: e.message });
      ctrl.getSm = () => ({
        get: () => ({
          emptyTrash: async (email) => { capturedEmail = email; return true; }
        })
      });

      await ctrl.postAction();
      expect(capturedEmail).toBe('user@test.com');
    });

    it('returns auth error when requireIdentity throws', async () => {
      const ctrl = createController({
        requireIdentity: async () => { throw new Error('Unauthorized'); }
      });

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/unauthorized/i);
    });

    it('returns error when service throws', async () => {
      const ctrl = createController({ emptyTrashError: 'Database error' });

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
