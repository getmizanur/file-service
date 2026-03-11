const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderStarController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/folder-star-controller'
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
  const ctrl = new FolderStarController();
  const mockResponse = createMockResponse();
  const mockFolderStarService = {
    toggleStarByEmail: jest.fn().mockResolvedValue({ starred: true }),
  };
  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com' }),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'FolderStarService') return mockFolderStarService;
      return {};
    }),
  };
  ctrl.serviceManager = mockSm;
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue(postData),
      getQuery: jest.fn().mockReturnValue({}),
      getMethod: jest.fn().mockReturnValue('POST'),
      getParam: jest.fn(),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn() }),
  };
  return { ctrl, mockResponse, mockFolderStarService, mockAuthService };
}

describe('FolderStarController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FolderStarController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FolderStarController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    it('should have postAction', () => {
      expect(typeof FolderStarController.prototype.postAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FolderStarController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('postAction()', () => {
    it('should toggle star and return result on success', async () => {
      const { ctrl, mockResponse, mockFolderStarService } = createCtrl({
        postData: { folder_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      await ctrl.postAction();
      expect(mockFolderStarService.toggleStarByEmail).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'test@example.com'
      );
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual({ starred: true });
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { folder_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should return error when service throws', async () => {
      const { ctrl, mockResponse, mockFolderStarService } = createCtrl({
        postData: { folder_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      mockFolderStarService.toggleStarByEmail.mockRejectedValue(new Error('DB error'));
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });

    it('should return error when folder_id is missing', async () => {
      const { ctrl, mockResponse } = createCtrl({
        postData: {},
      });
      await ctrl.postAction();
      // validate() will throw 'Invalid request' -> handleException -> 500
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });
});
