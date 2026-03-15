const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const FileLinkPublishController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/file-link-publish-controller'
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
  const ctrl = new FileLinkPublishController();
  const mockResponse = createMockResponse();
  const mockFileMetadataService = {
    publishFile: jest.fn().mockResolvedValue('public-key-abc'),
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

describe('FileLinkPublishController', () => {

  it('should extend AdminRestController', () => {
    expect(new FileLinkPublishController()).toBeInstanceOf(AdminRestController);
  });

  it('should have postAction', () => {
    expect(typeof FileLinkPublishController.prototype.postAction).toBe('function');
  });

  describe('postAction()', () => {
    it('should publish file and return public link', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: fileId },
      });
      await ctrl.postAction();
      expect(mockFileMetadataService.publishFile).toHaveBeenCalledWith(fileId, 'test@example.com');
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.success).toBe(true);
      expect(body.data.public_key).toBe('public-key-abc');
      expect(body.data.link).toContain('/p/public-key-abc');
    });

    it('should include BASE_URL in link when env is set', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const origBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com/';
      try {
        const { ctrl, mockResponse } = createCtrl({ postData: { file_id: fileId } });
        await ctrl.postAction();
        const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
        expect(body.data.link).toBe('https://example.com/p/public-key-abc');
      } finally {
        if (origBaseUrl === undefined) delete process.env.BASE_URL;
        else process.env.BASE_URL = origBaseUrl;
      }
    });

    it('should return error on service failure', async () => {
      const { ctrl, mockResponse, mockFileMetadataService } = createCtrl({
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      mockFileMetadataService.publishFile.mockRejectedValue(new Error('publish error'));
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { file_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });
  });
});
