const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderStateController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/folder-state-controller'
));
const AdminRestController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/admin-rest-controller'
));
const crypto = require('node:crypto');

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

function createCtrl({ hasIdentity = true, postData = {}, resourceId = null } = {}) {
  const ctrl = new FolderStateController();
  const mockResponse = createMockResponse();
  const mockCache = {
    load: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(true),
  };
  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com' }),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'Cache') return mockCache;
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
      getParam: jest.fn().mockReturnValue(resourceId),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({
      getParam: jest.fn().mockReturnValue(resourceId),
    }),
  };
  return { ctrl, mockResponse, mockCache, mockAuthService };
}

describe('FolderStateController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FolderStateController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FolderStateController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    const proto = FolderStateController.prototype;
    it('should have postAction', () => {
      expect(typeof proto.postAction).toBe('function');
    });
    it('should have indexAction', () => {
      expect(typeof proto.indexAction).toBe('function');
    });
    it('should have getAction', () => {
      expect(typeof proto.getAction).toBe('function');
    });
    it('should have _getCacheKey', () => {
      expect(typeof proto._getCacheKey).toBe('function');
    });
  });

  describe('_getCacheKey()', () => {
    it('should return a string starting with folder_expanded_state_', () => {
      const ctrl = new FolderStateController();
      const key = ctrl._getCacheKey('user@example.com');
      expect(key).toMatch(/^folder_expanded_state_/);
    });

    it('should include MD5 hash of email', () => {
      const ctrl = new FolderStateController();
      const email = 'user@example.com';
      const expectedHash = crypto.createHash('md5').update(email).digest('hex');
      const key = ctrl._getCacheKey(email);
      expect(key).toBe(`folder_expanded_state_${expectedHash}`);
    });

    it('should produce different keys for different emails', () => {
      const ctrl = new FolderStateController();
      const key1 = ctrl._getCacheKey('alice@example.com');
      const key2 = ctrl._getCacheKey('bob@example.com');
      expect(key1).not.toBe(key2);
    });

    it('should produce consistent keys for the same email', () => {
      const ctrl = new FolderStateController();
      const key1 = ctrl._getCacheKey('user@example.com');
      const key2 = ctrl._getCacheKey('user@example.com');
      expect(key1).toBe(key2);
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FolderStateController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('postAction()', () => {
    it('should add folder to expanded list when expanded=true', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl({
        postData: { folderId: 'f1', expanded: 'true' },
      });
      await ctrl.postAction();
      expect(mockCache.save).toHaveBeenCalled();
      const savedFolders = mockCache.save.mock.calls[0][0];
      expect(savedFolders).toContain('f1');
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.expandedFolders).toContain('f1');
    });

    it('should remove folder from expanded list when expanded=false', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl({
        postData: { folderId: 'f1', expanded: 'false' },
      });
      mockCache.load.mockResolvedValue(['f1', 'f2']);
      await ctrl.postAction();
      const savedFolders = mockCache.save.mock.calls[0][0];
      expect(savedFolders).not.toContain('f1');
      expect(savedFolders).toContain('f2');
    });

    it('should not duplicate folder id if already in expanded list', async () => {
      const { ctrl, mockCache } = createCtrl({
        postData: { folderId: 'f1', expanded: 'true' },
      });
      mockCache.load.mockResolvedValue(['f1']);
      await ctrl.postAction();
      const savedFolders = mockCache.save.mock.calls[0][0];
      expect(savedFolders.filter(id => id === 'f1').length).toBe(1);
    });

    it('should handle null cache (fallback to empty array) in postAction', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl({
        postData: { folderId: 'f1', expanded: 'true' },
      });
      mockCache.load.mockResolvedValue(null);
      await ctrl.postAction();
      const savedFolders = mockCache.save.mock.calls[0][0];
      expect(savedFolders).toContain('f1');
    });

    it('should return success:false when folderId is missing', async () => {
      const { ctrl, mockResponse } = createCtrl({
        postData: { expanded: 'true' },
      });
      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Missing folderId');
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { folderId: 'f1', expanded: 'true' },
      });
      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });

    it('should handle cache error gracefully', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl({
        postData: { folderId: 'f1', expanded: 'true' },
      });
      mockCache.load.mockRejectedValue(new Error('Cache error'));
      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });
  });

  describe('indexAction()', () => {
    it('should return all expanded folders', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl();
      mockCache.load.mockResolvedValue(['f1', 'f2', 'f3']);
      await ctrl.indexAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.expandedFolders).toEqual(['f1', 'f2', 'f3']);
    });

    it('should return empty array when cache is empty', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl();
      mockCache.load.mockResolvedValue(null);
      await ctrl.indexAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.expandedFolders).toEqual([]);
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({ hasIdentity: false });
      await ctrl.indexAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });
  });

  describe('getAction()', () => {
    it('should return isExpanded:true when folder is in expanded list', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl({ resourceId: 'f1' });
      mockCache.load.mockResolvedValue(['f1', 'f2']);
      await ctrl.getAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.id).toBe('f1');
      expect(body.isExpanded).toBe(true);
    });

    it('should return isExpanded:false when folder is not in expanded list', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl({ resourceId: 'f3' });
      mockCache.load.mockResolvedValue(['f1', 'f2']);
      await ctrl.getAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.isExpanded).toBe(false);
    });

    it('should handle null cache (fallback to empty array) in getAction', async () => {
      const { ctrl, mockResponse, mockCache } = createCtrl({ resourceId: 'f1' });
      mockCache.load.mockResolvedValue(null);
      await ctrl.getAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.isExpanded).toBe(false);
    });

    it('should return success:false when no id provided', async () => {
      const { ctrl, mockResponse } = createCtrl({ resourceId: null });
      await ctrl.getAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Missing ID');
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({ hasIdentity: false, resourceId: 'f1' });
      await ctrl.getAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });
  });
});
