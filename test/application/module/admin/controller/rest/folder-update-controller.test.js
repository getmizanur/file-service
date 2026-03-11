const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderUpdateController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/folder-update-controller'
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
  const ctrl = new FolderUpdateController();
  const mockResponse = createMockResponse();
  const mockFolderService = {
    updateFolder: jest.fn().mockResolvedValue(true),
  };
  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com' }),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'FolderService') return mockFolderService;
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
  return { ctrl, mockResponse, mockFolderService, mockAuthService };
}

describe('FolderUpdateController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FolderUpdateController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FolderUpdateController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    it('should have postAction', () => {
      expect(typeof FolderUpdateController.prototype.postAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FolderUpdateController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('postAction()', () => {
    it('should rename folder and return success', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockResponse, mockFolderService } = createCtrl({
        postData: { folder_id: folderId, name: 'New Name' },
      });
      await ctrl.postAction();
      expect(mockFolderService.updateFolder).toHaveBeenCalledWith(folderId, 'New Name', 'test@example.com');
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual({ success: true, message: 'Folder renamed successfully' });
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        postData: { folder_id: '550e8400-e29b-41d4-a716-446655440000', name: 'New Name' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should return error when validation fails (missing name)', async () => {
      const { ctrl, mockResponse } = createCtrl({
        postData: { folder_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });

    it('should return error when service throws', async () => {
      const { ctrl, mockResponse, mockFolderService } = createCtrl({
        postData: { folder_id: '550e8400-e29b-41d4-a716-446655440000', name: 'New Name' },
      });
      mockFolderService.updateFolder.mockRejectedValue(new Error('DB error'));
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });

    it('should trim and strip tags from folder name', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockFolderService } = createCtrl({
        postData: { folder_id: folderId, name: '  Clean Name  ' },
      });
      await ctrl.postAction();
      expect(mockFolderService.updateFolder).toHaveBeenCalledWith(folderId, 'Clean Name', 'test@example.com');
    });
  });
});
