const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const HomeController = require(path.join(
  projectRoot, 'application/module/admin/controller/home-controller'
));
const BaseController = require(path.join(
  projectRoot, 'library/mvc/controller/base-controller'
));

function createMockRedirectPlugin() {
  return {
    toRoute: jest.fn().mockReturnValue({ isRedirect: () => true }),
    toUrl: jest.fn().mockReturnValue({ isRedirect: () => true }),
  };
}

function createMockFlashPlugin() {
  return {
    addInfoMessage: jest.fn(),
    addErrorMessage: jest.fn(),
    addSuccessMessage: jest.fn(),
  };
}

function createCtrl({ hasIdentity = true, queryData = {} } = {}) {
  const ctrl = new HomeController();
  const mockRedirect = createMockRedirectPlugin();
  const mockFlash = createMockFlashPlugin();
  const mockHeadTitle = { set: jest.fn(), append: jest.fn() };
  const mockLayout = { getTemplate: jest.fn().mockReturnValue('default-template') };

  const identity = { email: 'test@example.com', user_id: 'u1', tenant_id: 't1' };
  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue(identity),
  };
  const listResult = {
    folderTree: [],
    currentFolderId: 'f1',
    rootFolderId: 'root',
    viewMode: 'home',
    layoutMode: 'grid',
    filesList: [],
    subFolders: [],
    starredFileIds: [],
    starredFolderIds: [],
    expandedFolderIds: [],
    searchQuery: '',
    pagination: null,
    mergedItems: [],
    sortMode: 'name',
    folders: [],
  };
  const mockHomeActionService = {
    list: jest.fn().mockResolvedValue(listResult),
  };
  const mockPluginManager = {
    get: jest.fn((name) => {
      if (name === 'redirect') return mockRedirect;
      if (name === 'flashMessenger') return mockFlash;
      if (name === 'layout') return mockLayout;
      if (name === 'url') return { fromRoute: jest.fn().mockReturnValue('/url') };
      return {};
    }),
    setController: jest.fn(),
  };
  const mockViewHelperManager = {
    get: jest.fn((name) => {
      if (name === 'headTitle') return mockHeadTitle;
      return {};
    }),
    syncToViewModel: jest.fn(),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'HomeActionService') return mockHomeActionService;
      if (name === 'PluginManager') return mockPluginManager;
      if (name === 'ViewHelperManager') return mockViewHelperManager;
      return {};
    }),
    has: jest.fn().mockReturnValue(true),
  };
  ctrl.serviceManager = mockSm;
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue({}),
      getQuery: jest.fn().mockReturnValue(queryData),
      getMethod: jest.fn().mockReturnValue('GET'),
      getParam: jest.fn().mockReturnValue(null),
      isPost: jest.fn().mockReturnValue(false),
    }),
    getResponse: jest.fn().mockReturnValue({
      setHeader: jest.fn(),
      redirect: jest.fn(),
    }),
    getRouteMatch: jest.fn().mockReturnValue({
      getParam: jest.fn().mockReturnValue(null),
      getAction: jest.fn().mockReturnValue('listAction'),
      getModule: jest.fn().mockReturnValue('admin'),
      getController: jest.fn().mockReturnValue('home'),
      getRouteName: jest.fn().mockReturnValue('adminHome'),
    }),
  };
  return {
    ctrl, mockRedirect, mockFlash, mockAuthService,
    mockHomeActionService, mockHeadTitle, listResult,
  };
}

describe('HomeController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof HomeController).toBe('function');
    });

    it('should extend BaseController', () => {
      const ctrl = new HomeController();
      expect(ctrl).toBeInstanceOf(BaseController);
    });
  });

  describe('prototype methods', () => {
    const proto = HomeController.prototype;
    it('should have preDispatch', () => { expect(typeof proto.preDispatch).toBe('function'); });
    it('should have indexAction', () => { expect(typeof proto.indexAction).toBe('function'); });
    it('should have listAction', () => { expect(typeof proto.listAction).toBe('function'); });
  });

  describe('preDispatch()', () => {
    it('should redirect to login when not authenticated', () => {
      const { ctrl, mockRedirect, mockFlash } = createCtrl({ hasIdentity: false });
      ctrl.preDispatch();
      expect(mockFlash.addInfoMessage).toHaveBeenCalledWith('Your session has expired. Please log in again.');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminLoginIndex');
    });

    it('should set head title when authenticated', () => {
      const { ctrl, mockHeadTitle } = createCtrl({ hasIdentity: true });
      ctrl.preDispatch();
      expect(mockHeadTitle.set).toHaveBeenCalledWith('Admin');
    });

    it('should return false/falsy when redirect fails', () => {
      const { ctrl, mockRedirect } = createCtrl({ hasIdentity: false });
      mockRedirect.toRoute.mockReturnValue(null);
      const result = ctrl.preDispatch();
      expect(result).toBeFalsy();
    });
  });

  describe('indexAction()', () => {
    it('should delegate to listAction', async () => {
      const { ctrl } = createCtrl();
      const spy = jest.spyOn(ctrl, 'listAction');
      await ctrl.indexAction();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('listAction()', () => {
    it('should call HomeActionService.list with correct params', async () => {
      const { ctrl, mockHomeActionService } = createCtrl({
        queryData: { layout: 'list' },
      });
      await ctrl.listAction();
      expect(mockHomeActionService.list).toHaveBeenCalledWith(expect.objectContaining({
        userEmail: 'test@example.com',
        layoutQuery: 'list',
      }));
    });

    it('should return a view model with all variables set', async () => {
      const { ctrl } = createCtrl();
      const result = await ctrl.listAction();
      expect(result).toBeDefined();
      expect(typeof result.getVariable).toBe('function');
      expect(result.getVariable('viewMode')).toBe('home');
      expect(result.getVariable('layoutMode')).toBe('grid');
      expect(result.getVariable('folderTree')).toEqual([]);
      expect(result.getVariable('filesList')).toEqual([]);
      expect(result.getVariable('mergedItems')).toEqual([]);
      expect(result.getVariable('sortMode')).toBe('name');
      expect(result.getVariable('folders')).toEqual([]);
    });

    it('should handle pagination page param', async () => {
      const { ctrl, mockHomeActionService } = createCtrl({
        queryData: { page: '3' },
      });
      await ctrl.listAction();
      expect(mockHomeActionService.list).toHaveBeenCalledWith(expect.objectContaining({
        page: 3,
      }));
    });

    it('should handle sort param', async () => {
      const { ctrl, mockHomeActionService } = createCtrl({
        queryData: { sort: 'size' },
      });
      await ctrl.listAction();
      expect(mockHomeActionService.list).toHaveBeenCalledWith(expect.objectContaining({
        sortQuery: 'size',
      }));
    });

    it('should handle service error gracefully', async () => {
      const { ctrl, mockHomeActionService } = createCtrl();
      mockHomeActionService.list.mockRejectedValue(new Error('Service error'));
      const result = await ctrl.listAction();
      expect(result).toBeDefined();
      expect(result.getVariable('folderTree')).toEqual([]);
    });
  });
});
