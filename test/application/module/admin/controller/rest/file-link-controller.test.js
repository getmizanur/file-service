const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileLinkController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/file-link-controller'
));
const AdminRestController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/admin-rest-controller'
));
const RestController = require(path.join(
  projectRoot, 'library/mvc/controller/rest-controller'
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
  const ctrl = new FileLinkController();
  const mockResponse = createMockResponse();
  const mockFileMetadataService = {
    createPublicLink: jest.fn().mockResolvedValue('abc123token'),
    revokePublicLink: jest.fn().mockResolvedValue(true),
    generateRestrictedLink: jest.fn().mockResolvedValue('restricted-token'),
    publishFile: jest.fn().mockResolvedValue('public-key-abc'),
    unpublishFile: jest.fn().mockResolvedValue(true),
  };
  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com' }),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'FileMetadataService') return mockFileMetadataService;
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

describe('FileLinkController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FileLinkController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FileLinkController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });

    it('should extend RestController', () => {
      const ctrl = new FileLinkController();
      expect(ctrl).toBeInstanceOf(RestController);
    });
  });

  describe('prototype methods', () => {
    const proto = FileLinkController.prototype;
    it('should have postAction', () => { expect(typeof proto.postAction).toBe('function'); });
    it('should have deleteAction', () => { expect(typeof proto.deleteAction).toBe('function'); });
    it('should have putAction', () => { expect(typeof proto.putAction).toBe('function'); });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FileLinkController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('postAction()', () => {
    it('should create public link and return token', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId, role: 'viewer' },
      });
      await ctrl.postAction();
      expect(mockFileMetadataService.createPublicLink).toHaveBeenCalledWith(
        fileId, 'test@example.com', { role: 'viewer' }
      );
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.data.link).toBe('/s/abc123token');
      expect(body.data.token).toBe('abc123token');
    });

    it('should return null link when token is falsy', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId },
      });
      mockFileMetadataService.createPublicLink.mockResolvedValue(null);
      await ctrl.postAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.data.link).toBeNull();
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should handle service errors', async () => {
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      mockFileMetadataService.createPublicLink.mockRejectedValue(new Error('DB error'));
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAction()', () => {
    it('should revoke public link and return success', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId },
      });
      await ctrl.deleteAction();
      expect(mockFileMetadataService.revokePublicLink).toHaveBeenCalledWith(fileId, 'test@example.com');
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
    });

    it('should merge post and query data', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockFileMetadataService } = createCtrl({
        queryData: { file_id: fileId },
      });
      await ctrl.deleteAction();
      expect(mockFileMetadataService.revokePublicLink).toHaveBeenCalledWith(fileId, 'test@example.com');
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({ hasIdentity: false });
      await ctrl.deleteAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });
  });

  describe('putAction()', () => {
    it('should generate restricted link token', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId },
      });
      await ctrl.putAction();
      expect(mockFileMetadataService.generateRestrictedLink).toHaveBeenCalledWith(fileId, 'test@example.com');
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.data.token).toBe('restricted-token');
    });

    it('should return error on service failure', async () => {
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      mockFileMetadataService.generateRestrictedLink.mockRejectedValue(new Error('err'));
      await ctrl.putAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });

});
