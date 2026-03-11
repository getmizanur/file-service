const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileShareController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/file-share-controller'
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

function createCtrl({ hasIdentity = true, postData = {}, queryData = {} } = {}) {
  const ctrl = new FileShareController();
  const mockResponse = createMockResponse();
  const mockFileMetadataService = {
    shareFileWithUser: jest.fn().mockResolvedValue(true),
    removeUserAccess: jest.fn().mockResolvedValue(true),
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
      if (name === 'FileMetadataService') return mockFileMetadataService;
      if (name === 'UserService') return mockUserService;
      return {};
    }),
  };
  ctrl.serviceManager = mockSm;
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue(postData),
      getQuery: jest.fn().mockReturnValue(queryData),
      getMethod: jest.fn().mockReturnValue('POST'),
      getParam: jest.fn().mockReturnValue(null),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn().mockReturnValue(null) }),
  };
  return { ctrl, mockResponse, mockFileMetadataService, mockAuthService };
}

describe('FileShareController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FileShareController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FileShareController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    const proto = FileShareController.prototype;
    it('should have postAction', () => {
      expect(typeof proto.postAction).toBe('function');
    });
    it('should have deleteAction', () => {
      expect(typeof proto.deleteAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FileShareController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('postAction()', () => {
    it('should share file with user and return success', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId, email: 'user@test.com', role: 'editor' },
      });
      await ctrl.postAction();
      expect(mockFileMetadataService.shareFileWithUser).toHaveBeenCalledWith(
        fileId, 'user@test.com', 'editor', 'u1', 't1'
      );
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
    });

    it('should use viewer as default role when not provided', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId, email: 'user@test.com' },
      });
      await ctrl.postAction();
      expect(mockFileMetadataService.shareFileWithUser).toHaveBeenCalledWith(
        fileId, 'user@test.com', 'viewer', 'u1', 't1'
      );
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000', email: 'u@t.com' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should return error when validation fails', async () => {
      const { ctrl, mockResponse } = createCtrl({ postData: {} });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });

    it('should return error when service throws', async () => {
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000', email: 'u@t.com' },
      });
      mockFileMetadataService.shareFileWithUser.mockRejectedValue(new Error('Permission denied'));
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAction()', () => {
    it('should remove user access and return success', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const targetUserId = '660e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId, user_id: targetUserId },
      });
      await ctrl.deleteAction();
      expect(mockFileMetadataService.removeUserAccess).toHaveBeenCalledWith(
        fileId, targetUserId, 'test@example.com'
      );
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
    });

    it('should merge post and query data for validation', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const targetUserId = '660e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId },
        queryData: { user_id: targetUserId },
      });
      await ctrl.deleteAction();
      expect(mockFileMetadataService.removeUserAccess).toHaveBeenCalledWith(
        fileId, targetUserId, 'test@example.com'
      );
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({ hasIdentity: false });
      await ctrl.deleteAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should return error when service throws', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const targetUserId = '660e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId, user_id: targetUserId },
      });
      mockFileMetadataService.removeUserAccess.mockRejectedValue(new Error('Not found'));
      await ctrl.deleteAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });
});
