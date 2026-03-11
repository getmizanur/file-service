const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

// Mock archiver before requiring controller
const mockArchive = {
  pipe: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn().mockResolvedValue(true),
};
jest.mock('archiver', () => jest.fn().mockReturnValue(mockArchive));

const FolderController = require(path.join(
  projectRoot, 'application/module/admin/controller/folder-controller'
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

function createCtrl({ hasIdentity = true, postData = {}, queryData = {} } = {}) {
  const ctrl = new FolderController();
  const mockRedirect = createMockRedirectPlugin();
  const mockFlash = createMockFlashPlugin();
  const mockLayout = { getTemplate: jest.fn().mockReturnValue('default-template') };

  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com' }),
  };
  const mockFolderActionService = {
    createFolder: jest.fn().mockResolvedValue({ folder_id: 'new-f1' }),
    deleteFolder: jest.fn().mockResolvedValue({ parentFolderId: 'parent-f1' }),
    prepareDownload: jest.fn().mockResolvedValue({
      folder: { name: 'TestFolder' },
      fileEntries: [],
    }),
    restoreFolder: jest.fn().mockResolvedValue(true),
    moveFolder: jest.fn().mockResolvedValue(true),
  };
  const mockPluginManager = {
    get: jest.fn((name) => {
      if (name === 'redirect') return mockRedirect;
      if (name === 'flashMessenger') return mockFlash;
      if (name === 'layout') return mockLayout;
      return {};
    }),
    setController: jest.fn(),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'FolderActionService') return mockFolderActionService;
      if (name === 'PluginManager') return mockPluginManager;
      return {};
    }),
    has: jest.fn().mockReturnValue(true),
  };
  ctrl.serviceManager = mockSm;
  const mockExpressRequest = {
    get: jest.fn().mockReturnValue(null),
  };
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue(postData),
      getQuery: jest.fn().mockReturnValue(queryData),
      getMethod: jest.fn().mockReturnValue('GET'),
      getParam: jest.fn().mockReturnValue(null),
      getExpressRequest: jest.fn().mockReturnValue(mockExpressRequest),
      getExpressResponse: jest.fn().mockReturnValue({
        setHeader: jest.fn(),
        pipe: jest.fn(),
      }),
    }),
    getResponse: jest.fn().mockReturnValue({
      setHeader: jest.fn(),
      redirect: jest.fn(),
    }),
    getRouteMatch: jest.fn().mockReturnValue({
      getParam: jest.fn().mockReturnValue(null),
      getAction: jest.fn().mockReturnValue('createAction'),
      getModule: jest.fn().mockReturnValue('admin'),
      getController: jest.fn().mockReturnValue('folder'),
      getRouteName: jest.fn().mockReturnValue('adminFolderCreate'),
    }),
  };
  return {
    ctrl, mockRedirect, mockFlash, mockAuthService,
    mockFolderActionService, mockExpressRequest,
  };
}

describe('FolderController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FolderController).toBe('function');
    });

    it('should extend BaseController', () => {
      const ctrl = new FolderController();
      expect(ctrl).toBeInstanceOf(BaseController);
    });
  });

  describe('prototype methods', () => {
    const proto = FolderController.prototype;
    it('should have preDispatch', () => { expect(typeof proto.preDispatch).toBe('function'); });
    it('should have createAction', () => { expect(typeof proto.createAction).toBe('function'); });
    it('should have deleteAction', () => { expect(typeof proto.deleteAction).toBe('function'); });
    it('should have downloadAction', () => { expect(typeof proto.downloadAction).toBe('function'); });
    it('should have restoreAction', () => { expect(typeof proto.restoreAction).toBe('function'); });
    it('should have moveAction', () => { expect(typeof proto.moveAction).toBe('function'); });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FolderController();
      expect(ctrl).toBeDefined();
      expect(ctrl.container).toBeNull();
      expect(ctrl.serviceManager).toBeNull();
    });

    it('should accept options', () => {
      const sm = { setController: jest.fn() };
      const ctrl = new FolderController({ serviceManager: sm });
      expect(ctrl.serviceManager).toBe(sm);
    });
  });

  describe('preDispatch()', () => {
    it('should redirect to login when not authenticated', () => {
      const { ctrl, mockRedirect, mockFlash } = createCtrl({ hasIdentity: false });
      ctrl.preDispatch();
      expect(mockFlash.addInfoMessage).toHaveBeenCalledWith('Your session has expired. Please log in again.');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminLoginIndex');
    });

    it('should not redirect when authenticated', () => {
      const { ctrl, mockRedirect } = createCtrl({ hasIdentity: true });
      ctrl.preDispatch();
      expect(mockRedirect.toRoute).not.toHaveBeenCalled();
    });
  });

  describe('createAction()', () => {
    it('should create folder and redirect to parent', async () => {
      const parentId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        postData: { parent_folder_id: parentId, name: 'New Folder' },
      });
      await ctrl.createAction();
      expect(mockFolderActionService.createFolder).toHaveBeenCalledWith(parentId, 'New Folder', 'test@example.com');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { id: parentId } });
    });

    it('should create folder with null parent when not provided', async () => {
      const { ctrl, mockFolderActionService } = createCtrl({
        postData: { name: 'Root Level Folder' },
      });
      await ctrl.createAction();
      expect(mockFolderActionService.createFolder).toHaveBeenCalledWith(null, 'Root Level Folder', 'test@example.com');
    });

    it('should redirect when validation fails (missing name)', async () => {
      const { ctrl, mockRedirect } = createCtrl({
        postData: { parent_folder_id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      await ctrl.createAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });

    it('should still redirect to parent even if service throws', async () => {
      const parentId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        postData: { parent_folder_id: parentId, name: 'New Folder' },
      });
      mockFolderActionService.createFolder.mockRejectedValue(new Error('DB error'));
      await ctrl.createAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { id: parentId } });
    });
  });

  describe('deleteAction()', () => {
    it('should delete folder and redirect to parent', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        queryData: { id: folderId },
      });
      await ctrl.deleteAction();
      expect(mockFolderActionService.deleteFolder).toHaveBeenCalledWith(folderId, 'test@example.com');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { id: 'parent-f1' } });
    });

    it('should redirect with null parent when service fails', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        queryData: { id: folderId },
      });
      mockFolderActionService.deleteFolder.mockRejectedValue(new Error('Not found'));
      await ctrl.deleteAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { id: null } });
    });

    it('should redirect when validation fails (no id)', async () => {
      const { ctrl, mockRedirect } = createCtrl({
        queryData: {},
      });
      await ctrl.deleteAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });
  });

  describe('restoreAction()', () => {
    it('should restore folder and redirect to trash view', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        queryData: { id: folderId },
      });
      await ctrl.restoreAction();
      expect(mockFolderActionService.restoreFolder).toHaveBeenCalledWith(folderId, 'test@example.com');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { view: 'trash' } });
    });

    it('should redirect to trash even on error', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        queryData: { id: folderId },
      });
      mockFolderActionService.restoreFolder.mockRejectedValue(new Error('err'));
      await ctrl.restoreAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { view: 'trash' } });
    });

    it('should redirect to trash when validation fails', async () => {
      const { ctrl, mockRedirect } = createCtrl({ queryData: {} });
      await ctrl.restoreAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { view: 'trash' } });
    });
  });

  describe('moveAction()', () => {
    it('should move folder and redirect to target', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const targetId = '660e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService, mockFlash } = createCtrl({
        postData: { folder_id: folderId, target_folder_id: targetId },
      });
      await ctrl.moveAction();
      expect(mockFolderActionService.moveFolder).toHaveBeenCalledWith(folderId, targetId, 'test@example.com');
      expect(mockFlash.addSuccessMessage).toHaveBeenCalledWith('Folder moved successfully');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { id: targetId } });
    });

    it('should redirect to index list when no target', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        postData: { folder_id: folderId },
      });
      await ctrl.moveAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: {} });
    });

    it('should show error and redirect to referrer on service failure', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const targetId = '660e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFlash, mockFolderActionService, mockExpressRequest } = createCtrl({
        postData: { folder_id: folderId, target_folder_id: targetId },
      });
      mockFolderActionService.moveFolder.mockRejectedValue(new Error('Access denied'));
      mockExpressRequest.get.mockReturnValue('http://localhost/referrer');
      await ctrl.moveAction();
      expect(mockFlash.addErrorMessage).toHaveBeenCalledWith('Failed to move folder: Access denied');
      expect(mockRedirect.toUrl).toHaveBeenCalledWith('http://localhost/referrer');
    });

    it('should redirect to index when no referrer on error', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        postData: { folder_id: folderId, target_folder_id: '660e8400-e29b-41d4-a716-446655440000' },
      });
      mockFolderActionService.moveFolder.mockRejectedValue(new Error('Error'));
      await ctrl.moveAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });

    it('should redirect when validation fails', async () => {
      const { ctrl, mockRedirect, mockFlash } = createCtrl({ postData: {} });
      await ctrl.moveAction();
      expect(mockFlash.addErrorMessage).toHaveBeenCalledWith('Invalid request');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });
  });

  describe('downloadAction()', () => {
    beforeEach(() => {
      mockArchive.pipe.mockClear();
      mockArchive.append.mockClear();
      mockArchive.finalize.mockClear();
    });

    it('should redirect when validation fails', async () => {
      const { ctrl, mockRedirect } = createCtrl({ queryData: {} });
      await ctrl.downloadAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });

    it('should redirect on service error', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFolderActionService } = createCtrl({
        queryData: { id: folderId },
      });
      mockFolderActionService.prepareDownload.mockRejectedValue(new Error('err'));
      await ctrl.downloadAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });

    it('should prepare and stream zip download on success', async () => {
      const folderId = '550e8400-e29b-41d4-a716-446655440000';
      const fileEntries = [
        { stream: { pipe: jest.fn() }, filename: 'file1.txt' },
        { stream: { pipe: jest.fn() }, filename: 'file2.txt' },
      ];
      const mockExpressResponse = {
        setHeader: jest.fn(),
        pipe: jest.fn(),
      };
      const { ctrl, mockFolderActionService } = createCtrl({
        queryData: { id: folderId },
      });
      mockFolderActionService.prepareDownload.mockResolvedValue({
        folder: { name: 'MyFolder' },
        fileEntries,
      });
      // Override getExpressResponse
      ctrl.event.getRequest().getExpressResponse = jest.fn().mockReturnValue(mockExpressResponse);
      await ctrl.downloadAction();
      expect(mockFolderActionService.prepareDownload).toHaveBeenCalledWith(folderId, 'test@example.com');
      expect(mockExpressResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(mockExpressResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition', 'attachment; filename="MyFolder.zip"'
      );
      expect(mockArchive.pipe).toHaveBeenCalledWith(mockExpressResponse);
      expect(mockArchive.append).toHaveBeenCalledTimes(2);
      expect(mockArchive.finalize).toHaveBeenCalled();
    });
  });
});
