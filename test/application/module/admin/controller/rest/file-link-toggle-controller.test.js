const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const FileLinkToggleController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/file-link-toggle-controller'
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
  const ctrl = new FileLinkToggleController();
  const mockResponse = createMockResponse();
  const mockFileMetadataService = {
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
      getQuery: jest.fn().mockReturnValue({}),
      getMethod: jest.fn().mockReturnValue('POST'),
      getParam: jest.fn().mockReturnValue(null),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn().mockReturnValue(null) }),
  };
  return { ctrl, mockResponse, mockFileMetadataService };
}

describe('FileLinkToggleController', () => {

  it('should extend AdminRestController', () => {
    expect(new FileLinkToggleController()).toBeInstanceOf(AdminRestController);
  });

  it('should have postAction', () => {
    expect(typeof FileLinkToggleController.prototype.postAction).toBe('function');
  });

  describe('postAction()', () => {
    it('should publish file when state is on', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId, state: 'on' },
      });
      await ctrl.postAction();
      expect(mockFileMetadataService.publishFile).toHaveBeenCalledWith(fileId, 'test@example.com');
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('published');
      expect(body.data.public_key).toBe('public-key-abc');
    });

    it('should unpublish file when state is off', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId, state: 'off' },
      });
      await ctrl.postAction();
      expect(mockFileMetadataService.unpublishFile).toHaveBeenCalledWith(fileId, 'test@example.com');
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('unpublished');
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000', state: 'on' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should return error on invalid state', async () => {
      const { ctrl, mockResponse } = createCtrl({
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000', state: 'invalid' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });
});
