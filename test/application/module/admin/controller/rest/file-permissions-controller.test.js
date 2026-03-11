const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FilePermissionsController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/file-permissions-controller'
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

function createCtrl({ hasIdentity = true, queryData = {}, paramId = null } = {}) {
  const ctrl = new FilePermissionsController();
  const mockResponse = createMockResponse();
  const permissions = [{ user_id: 'u1', role: 'viewer' }];
  const shareStatus = {
    general_access: 'public',
    token_hash: 'abc',
    role: 'viewer',
    expires_dt: null,
    revoked_dt: null,
    share_id: 's1',
  };
  const mockFileMetadataService = {
    getFilePermissions: jest.fn().mockResolvedValue(permissions),
    getFileSharingStatus: jest.fn().mockResolvedValue(shareStatus),
  };
  const mockUserService = {
    getUserWithTenantByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' }),
  };
  const mockFolderService = {
    getRootFolderByUserEmail: jest.fn().mockResolvedValue({ getTenantId: () => 't1' }),
  };
  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com' }),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'FileMetadataService') return mockFileMetadataService;
      if (name === 'UserService') return mockUserService;
      if (name === 'FolderService') return mockFolderService;
      return {};
    }),
  };
  ctrl.serviceManager = mockSm;
  const mockGetQuery = jest.fn((key) => {
    if (key) return queryData[key] || null;
    return queryData;
  });
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue({}),
      getQuery: mockGetQuery,
      getMethod: jest.fn().mockReturnValue('GET'),
      getParam: jest.fn().mockReturnValue(paramId),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({
      getParam: jest.fn().mockReturnValue(paramId),
    }),
  };
  return { ctrl, mockResponse, mockFileMetadataService, mockAuthService, mockUserService };
}

describe('FilePermissionsController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FilePermissionsController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FilePermissionsController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    it('should have getAction', () => {
      expect(typeof FilePermissionsController.prototype.getAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FilePermissionsController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('getAction()', () => {
    it('should return permissions and share status on success', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        paramId: fileId,
        queryData: { id: fileId },
      });
      await ctrl.getAction();
      expect(mockFileMetadataService.getFilePermissions).toHaveBeenCalledWith(fileId, 't1');
      expect(mockFileMetadataService.getFileSharingStatus).toHaveBeenCalledWith(fileId);
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.data.permissions).toEqual([{ user_id: 'u1', role: 'viewer' }]);
      expect(body.data.currentUserId).toBe('u1');
      expect(body.data.publicLink.general_access).toBe('public');
      expect(body.data.publicLink.isActive).toBe(true);
    });

    it('should return default publicLink when no share status', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        paramId: fileId,
        queryData: { id: fileId },
      });
      mockFileMetadataService.getFileSharingStatus.mockResolvedValue(null);
      await ctrl.getAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.data.publicLink.general_access).toBe('restricted');
      expect(body.data.publicLink.isActive).toBe(false);
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({ hasIdentity: false });
      await ctrl.getAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should use query id when route param is not set', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        paramId: null, // no route param
        queryData: { id: fileId },
      });
      await ctrl.getAction();
      expect(mockFileMetadataService.getFilePermissions).toHaveBeenCalledWith(fileId, 't1');
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
    });

    it('should return error when user not found', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        paramId: fileId,
        queryData: { id: fileId },
      });
      // Make requireUserContext fail
      ctrl.serviceManager.get('UserService').getUserWithTenantByEmail.mockResolvedValue(null);
      await ctrl.getAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });
});
