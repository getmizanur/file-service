const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileUpdateController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/file-update-controller'
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
  const ctrl = new FileUpdateController();
  const mockResponse = createMockResponse();
  const mockFileMetadataService = {
    updateFile: jest.fn().mockResolvedValue(true),
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
      getMethod: jest.fn().mockReturnValue('PUT'),
      getParam: jest.fn().mockReturnValue(null),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn().mockReturnValue(null) }),
  };
  return { ctrl, mockResponse, mockFileMetadataService, mockAuthService };
}

describe('FileUpdateController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FileUpdateController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FileUpdateController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    it('should have putAction', () => {
      expect(typeof FileUpdateController.prototype.putAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FileUpdateController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('putAction()', () => {
    it('should rename file and return success', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId, name: 'New File Name.txt' },
      });
      await ctrl.putAction();
      expect(mockFileMetadataService.updateFile).toHaveBeenCalledWith(fileId, 'New File Name.txt', 'test@example.com');
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual({ success: true, message: 'File renamed successfully' });
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000', name: 'name' },
      });
      await ctrl.putAction();
      // requireIdentity throws -> caught -> ok({ success: false, message })
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });

    it('should return failure when validation fails (missing name)', async () => {
      const { ctrl, mockResponse } = createCtrl({
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      await ctrl.putAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
    });

    it('should return failure when service throws', async () => {
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000', name: 'name' },
      });
      mockFileMetadataService.updateFile.mockRejectedValue(new Error('DB error'));
      await ctrl.putAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(false);
      expect(body.message).toBe('DB error');
    });

    it('should merge post and query data for validation', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId },
        queryData: { name: 'From Query' },
      });
      await ctrl.putAction();
      expect(mockFileMetadataService.updateFile).toHaveBeenCalledWith(fileId, 'From Query', 'test@example.com');
    });
  });
});
