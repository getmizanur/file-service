const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const LoginController = require(path.join(
  projectRoot, 'application/module/admin/controller/login-controller'
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

function createCtrl({ hasIdentity = false, isPost = false, postData = {}, actionName = 'indexAction' } = {}) {
  const ctrl = new LoginController();
  const mockRedirect = createMockRedirectPlugin();
  const mockFlash = createMockFlashPlugin();
  const mockLayout = { getTemplate: jest.fn().mockReturnValue('default-template') };
  const mockUrlPlugin = { fromRoute: jest.fn().mockReturnValue('/login') };

  const authStorage = { write: jest.fn() };
  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com' }),
    getStorage: jest.fn().mockReturnValue(authStorage),
  };
  const mockLoginActionService = {
    authenticate: jest.fn().mockResolvedValue({ success: false }),
  };
  const mockPluginManager = {
    get: jest.fn((name) => {
      if (name === 'redirect') return mockRedirect;
      if (name === 'flashMessenger') return mockFlash;
      if (name === 'layout') return mockLayout;
      if (name === 'url') return mockUrlPlugin;
      return {};
    }),
    setController: jest.fn(),
  };
  const mockViewHelperManager = {
    get: jest.fn((name) => {
      if (name === 'headTitle') return { set: jest.fn(), append: jest.fn() };
      return {};
    }),
    syncToViewModel: jest.fn(),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'LoginActionService') return mockLoginActionService;
      if (name === 'PluginManager') return mockPluginManager;
      if (name === 'ViewHelperManager') return mockViewHelperManager;
      return {};
    }),
    has: jest.fn().mockReturnValue(true),
  };
  ctrl.serviceManager = mockSm;
  const mockSession = { save: jest.fn((cb) => cb(null)), destroy: jest.fn((cb) => cb(null)) };
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue(postData),
      getQuery: jest.fn().mockReturnValue({}),
      getMethod: jest.fn().mockReturnValue(isPost ? 'POST' : 'GET'),
      getParam: jest.fn().mockReturnValue(null),
      isPost: jest.fn().mockReturnValue(isPost),
      getSession: jest.fn().mockReturnValue(mockSession),
      getExpressRequest: jest.fn().mockReturnValue({ session: mockSession }),
    }),
    getResponse: jest.fn().mockReturnValue({
      setHeader: jest.fn(),
      redirect: jest.fn(),
    }),
    getRouteMatch: jest.fn().mockReturnValue({
      getParam: jest.fn().mockReturnValue(null),
      getAction: jest.fn().mockReturnValue(actionName),
      getModule: jest.fn().mockReturnValue('admin'),
      getController: jest.fn().mockReturnValue('login'),
      getRouteName: jest.fn().mockReturnValue('adminLoginIndex'),
    }),
  };
  return {
    ctrl, mockRedirect, mockFlash, mockAuthService,
    mockLoginActionService, authStorage, mockSession,
  };
}

describe('LoginController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof LoginController).toBe('function');
    });

    it('should extend BaseController', () => {
      const ctrl = new LoginController();
      expect(ctrl).toBeInstanceOf(BaseController);
    });
  });

  describe('prototype methods', () => {
    const proto = LoginController.prototype;
    it('should have preDispatch', () => { expect(typeof proto.preDispatch).toBe('function'); });
    it('should have indexAction', () => { expect(typeof proto.indexAction).toBe('function'); });
    it('should have logoutAction', () => { expect(typeof proto.logoutAction).toBe('function'); });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new LoginController();
      expect(ctrl).toBeDefined();
      expect(ctrl.container).toBeNull();
      expect(ctrl.serviceManager).toBeNull();
    });

    it('should accept options', () => {
      const sm = { setController: jest.fn() };
      const ctrl = new LoginController({ serviceManager: sm });
      expect(ctrl.serviceManager).toBe(sm);
    });
  });

  describe('preDispatch()', () => {
    it('should skip auth check for indexAction', () => {
      const { ctrl, mockRedirect } = createCtrl({ actionName: 'indexAction' });
      ctrl.preDispatch();
      expect(mockRedirect.toRoute).not.toHaveBeenCalled();
    });

    it('should skip auth check for loginAction', () => {
      const { ctrl, mockRedirect } = createCtrl({ actionName: 'loginAction' });
      ctrl.preDispatch();
      expect(mockRedirect.toRoute).not.toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated for other actions', () => {
      const { ctrl, mockRedirect, mockFlash } = createCtrl({
        hasIdentity: false,
        actionName: 'logoutAction',
      });
      ctrl.preDispatch();
      expect(mockFlash.addInfoMessage).toHaveBeenCalledWith('Your session has expired. Please log in again.');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminLoginIndex');
    });

    it('should not redirect when authenticated for other actions', () => {
      const { ctrl, mockRedirect } = createCtrl({
        hasIdentity: true,
        actionName: 'logoutAction',
      });
      ctrl.preDispatch();
      expect(mockRedirect.toRoute).not.toHaveBeenCalled();
    });

    it('should return false when redirect returns falsy', () => {
      const { ctrl, mockRedirect } = createCtrl({
        hasIdentity: false,
        actionName: 'logoutAction',
      });
      mockRedirect.toRoute.mockReturnValue(null);
      const result = ctrl.preDispatch();
      expect(result).toBe(false);
    });
  });

  describe('indexAction()', () => {
    it('should redirect to dashboard when already authenticated', async () => {
      const { ctrl, mockRedirect } = createCtrl({ hasIdentity: true });
      await ctrl.indexAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminDashboardIndex');
    });

    it('should return view with login form on GET when not authenticated', async () => {
      const { ctrl } = createCtrl({ hasIdentity: false, isPost: false });
      const result = await ctrl.indexAction();
      expect(result).toBeDefined();
      expect(result.getVariable('loginForm')).toBeDefined();
    });

    it('should authenticate on valid POST and redirect on success', async () => {
      const { ctrl, mockLoginActionService, mockRedirect, authStorage, mockFlash } = createCtrl({
        hasIdentity: false,
        isPost: true,
        postData: { username: 'test@example.com', password: 'password123' },
      });
      mockLoginActionService.authenticate.mockResolvedValue({
        success: true,
        identity: { email: 'test@example.com', user_id: 'u1' },
      });
      await ctrl.indexAction();
      expect(mockLoginActionService.authenticate).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
      });
      expect(authStorage.write).toHaveBeenCalledWith({ email: 'test@example.com', user_id: 'u1' });
      expect(mockFlash.addSuccessMessage).toHaveBeenCalledWith('Login successful');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });

    it('should show error message on failed authentication', async () => {
      const { ctrl, mockFlash } = createCtrl({
        hasIdentity: false,
        isPost: true,
        postData: { username: 'test@example.com', password: 'wrongpassword' },
      });
      await ctrl.indexAction();
      expect(mockFlash.addErrorMessage).toHaveBeenCalledWith('Authentication unsuccessful');
    });

    it('should show validation errors for invalid input', async () => {
      const { ctrl, mockFlash } = createCtrl({
        hasIdentity: false,
        isPost: true,
        postData: { username: '', password: '' },
      });
      const result = await ctrl.indexAction();
      // Flash should have been called with validation messages
      expect(mockFlash.addErrorMessage).toHaveBeenCalled();
      // Should return view with form
      expect(result.getVariable('loginForm')).toBeDefined();
    });

    it('should show validation error for invalid email format', async () => {
      const { ctrl, mockFlash } = createCtrl({
        hasIdentity: false,
        isPost: true,
        postData: { username: 'not-an-email', password: 'password123' },
      });
      await ctrl.indexAction();
      expect(mockFlash.addErrorMessage).toHaveBeenCalled();
    });

    it('should handle session.save error on successful login', async () => {
      const { ctrl, mockLoginActionService, mockSession } = createCtrl({
        hasIdentity: false,
        isPost: true,
        postData: { username: 'test@example.com', password: 'password123' },
      });
      mockLoginActionService.authenticate.mockResolvedValue({
        success: true,
        identity: { email: 'test@example.com', user_id: 'u1' },
      });
      mockSession.save.mockImplementation((cb) => cb(new Error('Session save failed')));
      await expect(ctrl.indexAction()).rejects.toThrow('Session save failed');
    });

    it('should skip form.has for fields not in form', async () => {
      // This test ensures the form.has(fieldName) false branch is covered
      // by submitting data with a field name that the form doesn't have
      const { ctrl, mockFlash } = createCtrl({
        hasIdentity: false,
        isPost: true,
        postData: { username: '', password: '', unknown_field: 'val' },
      });
      const result = await ctrl.indexAction();
      expect(mockFlash.addErrorMessage).toHaveBeenCalled();
      expect(result.getVariable('loginForm')).toBeDefined();
    });
  });

  describe('logoutAction()', () => {
    it('should destroy session and redirect to login', async () => {
      const { ctrl, mockRedirect, mockSession } = createCtrl();
      await ctrl.logoutAction();
      expect(mockSession.destroy).toHaveBeenCalled();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminLoginIndex');
    });

    it('should handle session destroy error', async () => {
      const { ctrl, mockSession } = createCtrl();
      mockSession.destroy.mockImplementation((cb) => cb(new Error('Session error')));
      await expect(ctrl.logoutAction()).rejects.toThrow('Session error');
    });
  });
});
