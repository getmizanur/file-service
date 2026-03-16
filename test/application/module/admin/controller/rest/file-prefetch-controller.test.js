const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FilePrefetchController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/file-prefetch-controller'
));
const AdminRestController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/admin-rest-controller'
));

function createMockResponse() {
  return {
    setHeader: jest.fn(),
    getHeader: jest.fn().mockReturnValue(null),
    setHttpResponseCode: jest.fn(),
    setBody: jest.fn(),
    canSendHeaders: jest.fn(),
    hasBody: false,
  };
}

function createCtrl({ hasIdentity = true, postData = {} } = {}) {
  const ctrl = new FilePrefetchController();
  const mockResponse = createMockResponse();
  const mockQcs = {
    cacheThrough: jest.fn().mockImplementation(async (key, fn, opts) => {
      return fn();
    }),
    emailHash: jest.fn().mockReturnValue('emailhash123'),
  };
  const mockFileMetadataTable = {
    fetchById: jest.fn().mockResolvedValue({
      toObject: jest.fn().mockReturnValue({ file_id: 'file1', title: 'test.pdf' }),
    }),
  };
  const mockDerivativeTable = {
    fetchByFileId: jest.fn().mockResolvedValue([]),
  };
  const mockUserService = {
    getUserWithTenantByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' }),
  };
  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com' }),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'QueryCacheService') return mockQcs;
      if (name === 'FileMetadataTable') return mockFileMetadataTable;
      if (name === 'FileDerivativeTable') return mockDerivativeTable;
      if (name === 'UserService') return mockUserService;
      return {};
    }),
  };
  ctrl.serviceManager = mockSm;
  const mockGetPost = jest.fn((key) => {
    if (key) return postData[key] || null;
    return postData;
  });
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: mockGetPost,
      getQuery: jest.fn().mockReturnValue({}),
      getMethod: jest.fn().mockReturnValue('POST'),
      getParam: jest.fn().mockReturnValue(null),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn().mockReturnValue(null) }),
  };
  return { ctrl, mockResponse, mockQcs, mockAuthService, mockFileMetadataTable, mockDerivativeTable };
}

describe('FilePrefetchController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FilePrefetchController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FilePrefetchController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    it('should have postAction', () => {
      expect(typeof FilePrefetchController.prototype.postAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FilePrefetchController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('postAction()', () => {
    it('should warm cache and return success when fileId provided', async () => {
      const { ctrl, mockResponse, mockQcs } = createCtrl({
        postData: { fileId: 'file1' },
      });
      await ctrl.postAction();
      expect(mockQcs.cacheThrough).toHaveBeenCalledTimes(2);
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
    });

    it('should return success:false when fileId not provided', async () => {
      const { ctrl, mockResponse } = createCtrl({
        postData: {},
      });
      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });

    it('should return success:false on auth error (best-effort)', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { fileId: 'file1' },
      });
      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });

    it('should use correct cache keys with file id', async () => {
      const { ctrl, mockQcs } = createCtrl({
        postData: { fileId: 'file1' },
      });
      await ctrl.postAction();
      const cacheKeys = mockQcs.cacheThrough.mock.calls.map(c => c[0]);
      expect(cacheKeys[0]).toBe('file:meta:file1');
      expect(cacheKeys[1]).toBe('file:derivs:file1');
    });

    it('should handle cache error gracefully', async () => {
      const { ctrl, mockResponse, mockQcs } = createCtrl({
        postData: { fileId: 'file1' },
      });
      mockQcs.cacheThrough.mockRejectedValue(new Error('Cache down'));
      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });

    it('should return success:false when file not found', async () => {
      const { ctrl, mockResponse, mockQcs } = createCtrl({
        postData: { fileId: 'nonexistent' },
      });
      // First cacheThrough call (file metadata) returns null
      let callIndex = 0;
      mockQcs.cacheThrough.mockImplementation(async (key, fn) => {
        callIndex++;
        if (callIndex === 1) return null; // file not found
        return fn();
      });
      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
      // Should not call cacheThrough a second time for derivatives
      expect(mockQcs.cacheThrough).toHaveBeenCalledTimes(1);
    });

    it('should call toObject on file entity that has toObject', async () => {
      const fileEntity = { toObject: jest.fn().mockReturnValue({ file_id: 'file1', title: 'test.pdf' }) };
      const derivEntity = { toObject: jest.fn().mockReturnValue({ derivative_id: 'd1', kind: 'thumbnail' }) };
      const { ctrl, mockQcs, mockFileMetadataTable, mockDerivativeTable } = createCtrl({
        postData: { fileId: 'file1' },
      });
      mockFileMetadataTable.fetchById.mockResolvedValue(fileEntity);
      mockDerivativeTable.fetchByFileId.mockResolvedValue([derivEntity]);

      await ctrl.postAction();
      expect(fileEntity.toObject).toHaveBeenCalled();
      expect(derivEntity.toObject).toHaveBeenCalled();
    });

    it('should handle file entity without toObject (plain object)', async () => {
      const plainFile = { file_id: 'file1', title: 'test.pdf' };
      const plainDeriv = { derivative_id: 'd1', kind: 'thumbnail' };
      const { ctrl, mockResponse, mockFileMetadataTable, mockDerivativeTable } = createCtrl({
        postData: { fileId: 'file1' },
      });
      mockFileMetadataTable.fetchById.mockResolvedValue(plainFile);
      mockDerivativeTable.fetchByFileId.mockResolvedValue([plainDeriv]);

      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
    });

    it('should use tenant registry for cache invalidation', async () => {
      const { ctrl, mockQcs } = createCtrl({
        postData: { fileId: 'file1' },
      });
      await ctrl.postAction();
      const opts1 = mockQcs.cacheThrough.mock.calls[0][2];
      const opts2 = mockQcs.cacheThrough.mock.calls[1][2];
      expect(opts1.registries).toEqual(['registry:tenant:t1']);
      expect(opts1.ttl).toBe(120);
      expect(opts2.registries).toEqual(['registry:tenant:t1']);
      expect(opts2.ttl).toBe(120);
    });
  });
});
