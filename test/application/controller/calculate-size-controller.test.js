const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const CalculateSizeController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/calculate-size-controller'
));

function createController(opts = {}) {
  const ctrl = Object.create(CalculateSizeController.prototype);

  const postData = opts.postData || {};
  ctrl.requireIdentity = opts.requireIdentity || (async () => ({ email: 'test@example.com' }));
  ctrl.getRequest = () => ({ getPost: (key) => postData[key] !== undefined ? postData[key] : null });
  ctrl.ok = (data) => data;
  ctrl.handleException = (e) => ({ success: false, error: e.message });

  const sizeResult = opts.sizeResult || { total_bytes: 0, file_count: 0 };
  const sizeError  = opts.sizeError  || null;

  ctrl.getSm = () => ({
    get: (name) => {
      if (name === 'FileMetadataService') {
        return {
          calculateSize: async () => {
            if (sizeError) throw new Error(sizeError);
            return sizeResult;
          }
        };
      }
      return null;
    }
  });

  return ctrl;
}

describe('CalculateSizeController', () => {
  describe('postAction()', () => {
    it('returns total_bytes, file_count and formatted size', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'f1', type: 'file' }] },
        sizeResult: { total_bytes: 2048, file_count: 1 }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.total_bytes).toBe(2048);
      expect(result.file_count).toBe(1);
      expect(result.formatted).toBe('2 KB');
    });

    it('handles mixed files and folders', async () => {
      const ctrl = createController({
        postData: {
          items: [
            { id: 'f1', type: 'file' },
            { id: 'folder1', type: 'folder' }
          ]
        },
        sizeResult: { total_bytes: 5242880, file_count: 10 }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.total_bytes).toBe(5242880);
      expect(result.file_count).toBe(10);
      expect(result.formatted).toBe('5 MB');
    });

    it('returns zero size for empty folders', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'folder1', type: 'folder' }] },
        sizeResult: { total_bytes: 0, file_count: 0 }
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.total_bytes).toBe(0);
      expect(result.formatted).toBe('0 B');
    });

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

    it('handles exception from service', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'f1', type: 'file' }] },
        sizeError: 'DB error'
      });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/DB error/);
    });

    it('returns auth error when not logged in', async () => {
      const ctrl = createController({
        postData: { items: [{ id: 'f1', type: 'file' }] }
      });
      ctrl.requireIdentity = async () => { throw new Error('Login required'); };

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/login required/i);
    });
  });

  describe('formatBytes()', () => {
    it('formats 0 bytes', () => {
      expect(CalculateSizeController.formatBytes(0)).toBe('0 B');
    });

    it('formats bytes', () => {
      expect(CalculateSizeController.formatBytes(500)).toBe('500 B');
    });

    it('formats exact kilobytes', () => {
      expect(CalculateSizeController.formatBytes(1024)).toBe('1 KB');
    });

    it('formats exact megabytes', () => {
      expect(CalculateSizeController.formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('formats exact gigabytes', () => {
      expect(CalculateSizeController.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('formats fractional MB with 2 decimal places', () => {
      expect(CalculateSizeController.formatBytes(1572864)).toBe('1.50 MB');
    });
  });
});
