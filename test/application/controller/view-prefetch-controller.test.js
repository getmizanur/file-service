const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const ViewPrefetchController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/view-prefetch-controller'
));

function createController(opts = {}) {
  const ctrl = Object.create(ViewPrefetchController.prototype);

  const postData = opts.postData || {};
  ctrl.requireUserContext = opts.requireUserContext || (async () => ({ email: 'test@example.com', user_id: 'u1' }));
  ctrl.getRequest = () => ({ getPost: (key) => postData[key] !== undefined ? postData[key] : null });
  ctrl.ok = (data) => data;

  const listError = opts.listError || null;

  const serviceStub = {
    list: async (params) => {
      if (listError) throw new Error(listError);
      return { folders: [], files: [] };
    }
  };
  ctrl.getSm = () => ({
    get: () => serviceStub
  });

  return ctrl;
}

describe('ViewPrefetchController', () => {
  describe('postAction()', () => {
    it('returns success for a valid prefetchable view', async () => {
      const ctrl = createController({ postData: { view: 'my-drive' } });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
    });

    it('returns success false for an invalid view name', async () => {
      const ctrl = createController({ postData: { view: 'invalid-view' } });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
    });

    it('returns success false when view is not provided', async () => {
      const ctrl = createController({ postData: {} });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
    });

    it('returns success false when view is null', async () => {
      const ctrl = createController({ postData: { view: null } });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
    });

    it('accepts all prefetchable view values', async () => {
      const views = ['home', 'my-drive', 'shared-with-me', 'recent', 'starred', 'trash'];
      for (const view of views) {
        const ctrl = createController({ postData: { view } });
        const result = await ctrl.postAction();
        expect(result.success).toBe(true);
      }
    });

    it('calls the correct action service with correct params', async () => {
      let capturedParams = null;
      let capturedServiceName = null;
      const ctrl = Object.create(ViewPrefetchController.prototype);
      ctrl.requireUserContext = async () => ({ email: 'user@test.com', user_id: 'u99' });
      ctrl.getRequest = () => ({ getPost: (key) => key === 'view' ? 'starred' : null });
      ctrl.ok = (data) => data;
      ctrl.getSm = () => ({
        get: (name) => {
          capturedServiceName = name;
          return {
            list: async (params) => { capturedParams = params; return {}; }
          };
        }
      });

      await ctrl.postAction();

      expect(capturedServiceName).toBe('StarredActionService');
      expect(capturedParams).toMatchObject({
        userEmail: 'user@test.com',
        identity: { email: 'user@test.com', user_id: 'u99' },
      });
    });

    it('silently returns success false when service throws', async () => {
      const ctrl = createController({
        postData: { view: 'trash' },
        listError: 'Service unavailable'
      });

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
    });

    it('silently returns success false when requireUserContext throws', async () => {
      const ctrl = createController({
        postData: { view: 'home' },
        requireUserContext: async () => { throw new Error('Not authenticated'); }
      });

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
    });
  });
});
