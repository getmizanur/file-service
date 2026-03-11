const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderListController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/folder-list-controller'
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

function createCtrl({ hasIdentity = true } = {}) {
  const ctrl = new FolderListController();
  const mockResponse = createMockResponse();
  const tree = [
    {
      folder_id: 'f1',
      name: 'Root',
      children: [
        { folder_id: 'f2', name: 'SubFolder', children: [] },
        { folder_id: 'f3', name: 'SubFolder2', children: [
          { folder_id: 'f4', name: 'Deep', children: [] }
        ] },
      ],
    },
  ];
  const mockFolderService = {
    getFolderTreeByTenant: jest.fn().mockResolvedValue(tree),
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
      if (name === 'FolderService') return mockFolderService;
      if (name === 'UserService') return mockUserService;
      return {};
    }),
  };
  ctrl.serviceManager = mockSm;
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue({}),
      getQuery: jest.fn().mockReturnValue({}),
      getMethod: jest.fn().mockReturnValue('GET'),
      getParam: jest.fn().mockReturnValue(null),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn().mockReturnValue(null) }),
  };
  return { ctrl, mockResponse, mockFolderService, mockAuthService };
}

describe('FolderListController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FolderListController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FolderListController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    it('should have indexAction', () => {
      expect(typeof FolderListController.prototype.indexAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FolderListController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('indexAction()', () => {
    it('should return flattened folder tree with depth info', async () => {
      const { ctrl, mockResponse, mockFolderService } = createCtrl();
      await ctrl.indexAction();
      expect(mockFolderService.getFolderTreeByTenant).toHaveBeenCalledWith('t1');
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual([
        { id: 'f1', name: 'Root', depth: 0 },
        { id: 'f2', name: 'SubFolder', depth: 1 },
        { id: 'f3', name: 'SubFolder2', depth: 1 },
        { id: 'f4', name: 'Deep', depth: 2 },
      ]);
    });

    it('should return empty array for empty tree', async () => {
      const { ctrl, mockResponse, mockFolderService } = createCtrl();
      mockFolderService.getFolderTreeByTenant.mockResolvedValue([]);
      await ctrl.indexAction();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual([]);
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({ hasIdentity: false });
      await ctrl.indexAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should return error when service throws', async () => {
      const { ctrl, mockResponse, mockFolderService } = createCtrl();
      mockFolderService.getFolderTreeByTenant.mockRejectedValue(new Error('DB error'));
      await ctrl.indexAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });
});
