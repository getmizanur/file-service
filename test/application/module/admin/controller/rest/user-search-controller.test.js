const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const UserSearchController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/user-search-controller'
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

function createCtrl({ hasIdentity = true, queryTerm = 'test' } = {}) {
  const ctrl = new UserSearchController();
  const mockResponse = createMockResponse();
  const mockAppUserTable = {
    searchByTerm: jest.fn().mockResolvedValue([
      { user_id: 'u1', email: 'alice@test.com', display_name: 'Alice' },
      { user_id: 'u2', email: 'bob@test.com', display_name: 'Bob' },
    ]),
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
      if (name === 'FolderService') return mockFolderService;
      if (name === 'AppUserTable') return mockAppUserTable;
      return {};
    }),
  };
  ctrl.serviceManager = mockSm;
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue({}),
      getQuery: jest.fn((key) => {
        if (key === 'q') return queryTerm;
        return null;
      }),
      getMethod: jest.fn().mockReturnValue('GET'),
      getParam: jest.fn().mockReturnValue(null),
    }),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn().mockReturnValue(null) }),
  };
  return { ctrl, mockResponse, mockAppUserTable, mockAuthService };
}

describe('UserSearchController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof UserSearchController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new UserSearchController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    it('should have indexAction', () => {
      expect(typeof UserSearchController.prototype.indexAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new UserSearchController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('indexAction()', () => {
    it('should return mapped user results on success', async () => {
      const { ctrl, mockResponse, mockAppUserTable } = createCtrl({ queryTerm: 'alice' });
      await ctrl.indexAction();
      expect(mockAppUserTable.searchByTerm).toHaveBeenCalledWith('alice', 't1');
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual([
        { id: 'u1', email: 'alice@test.com', name: 'Alice' },
        { id: 'u2', email: 'bob@test.com', name: 'Bob' },
      ]);
    });

    it('should return empty array when term is too short', async () => {
      const { ctrl, mockResponse } = createCtrl({ queryTerm: 'a' });
      await ctrl.indexAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual([]);
    });

    it('should return empty array when term is null', async () => {
      const { ctrl, mockResponse } = createCtrl({ queryTerm: null });
      await ctrl.indexAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual([]);
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({ hasIdentity: false });
      await ctrl.indexAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should return error when service throws', async () => {
      const { ctrl, mockResponse, mockAppUserTable } = createCtrl();
      mockAppUserTable.searchByTerm.mockRejectedValue(new Error('DB error'));
      await ctrl.indexAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });
  });
});
