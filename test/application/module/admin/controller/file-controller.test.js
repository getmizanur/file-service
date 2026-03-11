const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

// Mock node:stream pipeline to avoid real streaming
jest.mock('node:stream', () => ({
  pipeline: jest.fn((src, dest, cb) => { if (cb) cb(null); }),
}));
jest.mock('node:util', () => ({
  promisify: jest.fn((fn) => jest.fn().mockResolvedValue(undefined)),
}));

const FileController = require(path.join(
  projectRoot, 'application/module/admin/controller/file-controller'
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

function createCtrl({
  hasIdentity = true,
  postData = {},
  queryData = {},
  actionName = 'deleteAction',
  params = {},
} = {}) {
  const ctrl = new FileController();
  const mockRedirect = createMockRedirectPlugin();
  const mockFlash = createMockFlashPlugin();
  const mockLayout = { getTemplate: jest.fn().mockReturnValue('default-template') };

  const mockAuthService = {
    hasIdentity: jest.fn().mockReturnValue(hasIdentity),
    getIdentity: jest.fn().mockReturnValue({ email: 'test@example.com', user_id: 'u1' }),
  };
  const mockFileActionService = {
    deleteFile: jest.fn().mockResolvedValue({ parentFolderId: 'parent-f1' }),
    starFile: jest.fn().mockResolvedValue({ parentFolderId: 'parent-f1' }),
    streamDownload: jest.fn().mockResolvedValue({
      file: {
        getContentType: () => 'text/plain',
        getOriginalFilename: () => 'test.txt',
        getTenantId: () => 't1',
        getSizeBytes: () => 1024,
      },
      stream: { pipe: jest.fn() },
    }),
    streamView: jest.fn().mockResolvedValue({
      file: {
        getContentType: () => 'image/png',
        getOriginalFilename: () => 'image.png',
        getTenantId: () => 't1',
        getSizeBytes: () => 2048,
      },
      stream: { pipe: jest.fn() },
    }),
    moveFile: jest.fn().mockResolvedValue(true),
    restoreFile: jest.fn().mockResolvedValue(true),
    resolvePublicLink: jest.fn().mockResolvedValue({
      file: { name: 'test.txt' },
      shareLink: { token: 'abc123' },
    }),
    streamPublicDownload: jest.fn().mockResolvedValue({
      file: {
        getContentType: () => 'text/plain',
        getOriginalFilename: () => 'test.txt',
        getTenantId: () => 't1',
        getSizeBytes: () => 512,
      },
      stream: { pipe: jest.fn() },
    }),
    streamPublicServe: jest.fn().mockResolvedValue({
      file: {
        getContentType: () => 'text/plain',
        getOriginalFilename: () => 'test.txt',
        getTenantId: () => 't1',
        getSizeBytes: () => 512,
      },
      stream: { pipe: jest.fn() },
    }),
  };
  const mockUsageDailyService = {
    recordDownload: jest.fn().mockResolvedValue(true),
  };
  const mockFileMetadataService = {
    getTable: jest.fn().mockReturnValue({
      fetchById: jest.fn().mockResolvedValue({
        getCreatedBy: () => 'u1',
        getTenantId: () => 't1',
      }),
    }),
  };
  const mockFilePermissionService = {
    hasAccess: jest.fn().mockResolvedValue(true),
  };
  const mockFileDerivativeTable = {
    fetchByFileIdAndKind: jest.fn().mockResolvedValue(null),
    fetchByFileIdKindSize: jest.fn().mockResolvedValue(null),
  };
  const mockStorageService = {
    getBackend: jest.fn().mockResolvedValue({}),
    read: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
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
  const mockViewManager = {
    createErrorViewModel: jest.fn().mockReturnValue({
      template: 'error-404.njk',
      variables: { statusCode: 404, message: 'Not Found' },
    }),
  };
  const mockSm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') return mockAuthService;
      if (name === 'FileActionService') return mockFileActionService;
      if (name === 'UsageDailyService') return mockUsageDailyService;
      if (name === 'PluginManager') return mockPluginManager;
      if (name === 'ViewManager') return mockViewManager;
      if (name === 'FileMetadataService') return mockFileMetadataService;
      if (name === 'FilePermissionService') return mockFilePermissionService;
      if (name === 'FileDerivativeTable') return mockFileDerivativeTable;
      if (name === 'StorageService') return mockStorageService;
      return {};
    }),
    has: jest.fn().mockReturnValue(true),
  };
  ctrl.serviceManager = mockSm;
  const rawRes = {
    setHeader: jest.fn(),
    removeHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
    headersSent: false,
  };
  const rawReq = { get: jest.fn().mockReturnValue(null) };
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue({
      getPost: jest.fn().mockReturnValue(postData),
      getQuery: jest.fn().mockReturnValue(queryData),
      getMethod: jest.fn().mockReturnValue('GET'),
      getParam: jest.fn((name) => params[name] || null),
      getExpressRequest: jest.fn().mockReturnValue(rawReq),
      res: jest.fn().mockReturnValue(rawRes),
      req: jest.fn().mockReturnValue(rawReq),
      getUri: jest.fn().mockReturnValue('/current-uri'),
    }),
    getResponse: jest.fn().mockReturnValue({
      setHeader: jest.fn(),
      redirect: jest.fn(),
    }),
    getRouteMatch: jest.fn().mockReturnValue({
      getParam: jest.fn().mockReturnValue(null),
      getAction: jest.fn().mockReturnValue(actionName),
      getModule: jest.fn().mockReturnValue('admin'),
      getController: jest.fn().mockReturnValue('file'),
      getRouteName: jest.fn().mockReturnValue('adminFileDelete'),
    }),
  };
  return {
    ctrl, mockRedirect, mockFlash, mockAuthService,
    mockFileActionService, mockUsageDailyService, rawRes,
    mockViewManager, mockFileMetadataService, mockFileDerivativeTable,
    mockStorageService, mockFilePermissionService, rawReq,
  };
}

describe('FileController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FileController).toBe('function');
    });

    it('should extend BaseController', () => {
      const ctrl = new FileController();
      expect(ctrl).toBeInstanceOf(BaseController);
    });
  });

  describe('prototype methods', () => {
    const proto = FileController.prototype;
    it('should have preDispatch', () => { expect(typeof proto.preDispatch).toBe('function'); });
    it('should have deleteAction', () => { expect(typeof proto.deleteAction).toBe('function'); });
    it('should have starAction', () => { expect(typeof proto.starAction).toBe('function'); });
    it('should have downloadAction', () => { expect(typeof proto.downloadAction).toBe('function'); });
    it('should have viewAction', () => { expect(typeof proto.viewAction).toBe('function'); });
    it('should have derivativeAction', () => { expect(typeof proto.derivativeAction).toBe('function'); });
    it('should have moveAction', () => { expect(typeof proto.moveAction).toBe('function'); });
    it('should have restoreAction', () => { expect(typeof proto.restoreAction).toBe('function'); });
    it('should have publicLinkAction', () => { expect(typeof proto.publicLinkAction).toBe('function'); });
    it('should have publicDownloadAction', () => { expect(typeof proto.publicDownloadAction).toBe('function'); });
    it('should have publicServeAction', () => { expect(typeof proto.publicServeAction).toBe('function'); });
  });

  describe('static _mimeFromFilename', () => {
    it('should return null for null/undefined input', () => {
      expect(FileController._mimeFromFilename(null)).toBeNull();
      expect(FileController._mimeFromFilename(undefined)).toBeNull();
      expect(FileController._mimeFromFilename('')).toBeNull();
    });

    it('should return correct MIME for common image extensions', () => {
      expect(FileController._mimeFromFilename('photo.jpg')).toBe('image/jpeg');
      expect(FileController._mimeFromFilename('photo.png')).toBe('image/png');
      expect(FileController._mimeFromFilename('photo.gif')).toBe('image/gif');
      expect(FileController._mimeFromFilename('photo.webp')).toBe('image/webp');
    });

    it('should return correct MIME for document extensions', () => {
      expect(FileController._mimeFromFilename('doc.pdf')).toBe('application/pdf');
    });

    it('should return null for unknown extensions', () => {
      expect(FileController._mimeFromFilename('file.xyz')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(FileController._mimeFromFilename('photo.JPG')).toBe('image/jpeg');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FileController();
      expect(ctrl).toBeDefined();
      expect(ctrl.container).toBeNull();
      expect(ctrl.serviceManager).toBeNull();
    });

    it('should accept options', () => {
      const sm = { setController: jest.fn() };
      const ctrl = new FileController({ serviceManager: sm });
      expect(ctrl.serviceManager).toBe(sm);
    });
  });

  describe('preDispatch()', () => {
    it('should skip auth check for publicLinkAction', () => {
      const { ctrl, mockRedirect, mockAuthService } = createCtrl({
        hasIdentity: false,
        actionName: 'publicLinkAction',
      });
      ctrl.preDispatch();
      expect(mockRedirect.toRoute).not.toHaveBeenCalled();
    });

    it('should skip auth check for publicDownloadAction', () => {
      const { ctrl, mockRedirect } = createCtrl({
        hasIdentity: false,
        actionName: 'publicDownloadAction',
      });
      ctrl.preDispatch();
      expect(mockRedirect.toRoute).not.toHaveBeenCalled();
    });

    it('should skip auth check for publicServeAction', () => {
      const { ctrl, mockRedirect } = createCtrl({
        hasIdentity: false,
        actionName: 'publicServeAction',
      });
      ctrl.preDispatch();
      expect(mockRedirect.toRoute).not.toHaveBeenCalled();
    });

    it('should redirect to login for non-public actions when not authenticated', () => {
      const { ctrl, mockRedirect, mockFlash } = createCtrl({
        hasIdentity: false,
        actionName: 'deleteAction',
      });
      ctrl.preDispatch();
      expect(mockFlash.addInfoMessage).toHaveBeenCalledWith('Your session has expired. Please log in again.');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminLoginIndex');
    });

    it('should not redirect when authenticated', () => {
      const { ctrl, mockRedirect } = createCtrl({
        hasIdentity: true,
        actionName: 'deleteAction',
      });
      ctrl.preDispatch();
      expect(mockRedirect.toRoute).not.toHaveBeenCalled();
    });

    it('should return false when redirect returns falsy', () => {
      const { ctrl, mockRedirect } = createCtrl({
        hasIdentity: false,
        actionName: 'deleteAction',
      });
      mockRedirect.toRoute.mockReturnValue(null);
      const result = ctrl.preDispatch();
      expect(result).toBe(false);
    });
  });

  describe('deleteAction()', () => {
    it('should delete file and redirect to parent folder', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      await ctrl.deleteAction();
      expect(mockFileActionService.deleteFile).toHaveBeenCalledWith(fileId, 'test@example.com');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, {
        query: { id: 'parent-f1' },
      });
    });

    it('should redirect without parentFolderId in query when star result has no parentFolderId', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileActionService.deleteFile.mockResolvedValue({ parentFolderId: null });
      await ctrl.deleteAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: {} });
    });

    it('should redirect without parent on error', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileActionService.deleteFile.mockRejectedValue(new Error('err'));
      await ctrl.deleteAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: {} });
    });

    it('should redirect when validation fails', async () => {
      const { ctrl, mockRedirect } = createCtrl({ queryData: {} });
      await ctrl.deleteAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });
  });

  describe('starAction()', () => {
    it('should star file and redirect with parent folder id', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      await ctrl.starAction();
      expect(mockFileActionService.starFile).toHaveBeenCalledWith(fileId, 'test@example.com');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, {
        query: { id: 'parent-f1' },
      });
    });

    it('should include view and layout in redirect query', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect } = createCtrl({
        queryData: { id: fileId, view: 'starred', layout: 'list' },
      });
      await ctrl.starAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, {
        query: { view: 'starred', layout: 'list', id: 'parent-f1' },
      });
    });

    it('should redirect with fallback params on error', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const folderId = '660e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId, view: 'starred', folder_id: folderId },
      });
      mockFileActionService.starFile.mockRejectedValue(new Error('err'));
      await ctrl.starAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, {
        query: { view: 'starred' },
      });
    });

    it('should redirect with folder_id as fallback when no view on error', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const folderId = '660e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId, folder_id: folderId },
      });
      mockFileActionService.starFile.mockRejectedValue(new Error('err'));
      await ctrl.starAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, {
        query: { id: folderId },
      });
    });

    it('should redirect when validation fails', async () => {
      const { ctrl, mockRedirect } = createCtrl({ queryData: {} });
      await ctrl.starAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });
  });

  describe('moveAction()', () => {
    it('should move file and redirect to target folder', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const targetId = '660e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService, mockFlash } = createCtrl({
        postData: { file_id: fileId, target_folder_id: targetId },
      });
      await ctrl.moveAction();
      expect(mockFileActionService.moveFile).toHaveBeenCalledWith(fileId, targetId, 'test@example.com');
      expect(mockFlash.addSuccessMessage).toHaveBeenCalledWith('File moved successfully');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { id: targetId } });
    });

    it('should redirect to referrer on error', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFlash, mockFileActionService, rawReq } = createCtrl({
        postData: { file_id: fileId, target_folder_id: '660e8400-e29b-41d4-a716-446655440000' },
      });
      mockFileActionService.moveFile.mockRejectedValue(new Error('Access denied'));
      // req() returns rawReq which has get()
      const reqFn = ctrl.event.getRequest().req;
      reqFn.mockReturnValue({ get: jest.fn().mockReturnValue('http://referrer') });
      await ctrl.moveAction();
      expect(mockFlash.addErrorMessage).toHaveBeenCalledWith('Failed to move file: Access denied');
      expect(mockRedirect.toUrl).toHaveBeenCalledWith('http://referrer');
    });

    it('should redirect to index when no referrer on error', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        postData: { file_id: fileId, target_folder_id: '660e8400-e29b-41d4-a716-446655440000' },
      });
      mockFileActionService.moveFile.mockRejectedValue(new Error('Error'));
      await ctrl.moveAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });

    it('should redirect with empty query when targetFolderId is null', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService, mockFlash } = createCtrl({
        postData: { file_id: fileId },
      });
      await ctrl.moveAction();
      expect(mockFlash.addSuccessMessage).toHaveBeenCalledWith('File moved successfully');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: {} });
    });

    it('should redirect when validation fails', async () => {
      const { ctrl, mockRedirect, mockFlash } = createCtrl({ postData: {} });
      await ctrl.moveAction();
      expect(mockFlash.addErrorMessage).toHaveBeenCalledWith('Invalid request');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });
  });

  describe('restoreAction()', () => {
    it('should restore file and redirect to trash', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      await ctrl.restoreAction();
      expect(mockFileActionService.restoreFile).toHaveBeenCalledWith(fileId, 'test@example.com');
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { view: 'trash' } });
    });

    it('should redirect to trash on error', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileActionService.restoreFile.mockRejectedValue(new Error('err'));
      await ctrl.restoreAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { view: 'trash' } });
    });

    it('should redirect to trash when validation fails', async () => {
      const { ctrl, mockRedirect } = createCtrl({ queryData: {} });
      await ctrl.restoreAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList', null, { query: { view: 'trash' } });
    });
  });

  describe('viewAction()', () => {
    it('should return 400 when input is invalid', async () => {
      const { ctrl, rawRes } = createCtrl({ queryData: {} });
      await ctrl.viewAction();
      expect(rawRes.status).toHaveBeenCalledWith(400);
      expect(rawRes.send).toHaveBeenCalledWith('Invalid request');
    });

    it('should stream file view on success', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileActionService, mockUsageDailyService } = createCtrl({
        queryData: { id: fileId },
      });
      await ctrl.viewAction();
      expect(mockFileActionService.streamView).toHaveBeenCalledWith(fileId, 'u1');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="image.png"');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=3600');
      expect(mockUsageDailyService.recordDownload).toHaveBeenCalledWith('t1', 2048);
    });

    it('should fallback to octet-stream when both contentType and mimeFromFilename are null', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileActionService.streamView.mockResolvedValue({
        file: {
          getContentType: () => null,
          getOriginalFilename: () => 'file.unknownext',
          getTenantId: () => 't1',
          getSizeBytes: () => 100,
        },
        stream: { pipe: jest.fn() },
      });
      await ctrl.viewAction();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });

    it('should fallback to mime from filename when contentType is null', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileActionService.streamView.mockResolvedValue({
        file: {
          getContentType: () => null,
          getOriginalFilename: () => 'document.pdf',
          getTenantId: () => 't1',
          getSizeBytes: () => 100,
        },
        stream: { pipe: jest.fn() },
      });
      await ctrl.viewAction();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should return 404 on error when headers not sent', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileActionService.streamView.mockRejectedValue(new Error('Not found'));
      await ctrl.viewAction();
      expect(rawRes.status).toHaveBeenCalledWith(404);
      expect(rawRes.send).toHaveBeenCalledWith('File not found or access denied');
    });

    it('should end response on error when headers already sent', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      rawRes.headersSent = true;
      mockFileActionService.streamView.mockRejectedValue(new Error('Stream error'));
      await ctrl.viewAction();
      expect(rawRes.end).toHaveBeenCalled();
    });
  });

  describe('downloadAction()', () => {
    it('should redirect when validation fails', async () => {
      const { ctrl, mockRedirect } = createCtrl({ queryData: {} });
      await ctrl.downloadAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });

    it('should stream file download on success', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileActionService, mockUsageDailyService } = createCtrl({
        queryData: { id: fileId },
      });
      await ctrl.downloadAction();
      expect(mockFileActionService.streamDownload).toHaveBeenCalledWith(fileId, 'u1');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.txt"');
      expect(mockUsageDailyService.recordDownload).toHaveBeenCalledWith('t1', 1024);
    });

    it('should fallback to application/octet-stream when contentType is null', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileActionService.streamDownload.mockResolvedValue({
        file: {
          getContentType: () => null,
          getOriginalFilename: () => 'file.bin',
          getTenantId: () => 't1',
          getSizeBytes: () => 100,
        },
        stream: { pipe: jest.fn() },
      });
      await ctrl.downloadAction();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });

    it('should redirect on error when headers not sent', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileActionService.streamDownload.mockRejectedValue(new Error('err'));
      await ctrl.downloadAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminIndexList');
    });

    it('should end response on error when headers already sent', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        queryData: { id: fileId },
      });
      rawRes.headersSent = true;
      mockFileActionService.streamDownload.mockRejectedValue(new Error('err'));
      await ctrl.downloadAction();
      expect(rawRes.end).toHaveBeenCalled();
    });
  });

  describe('derivativeAction()', () => {
    it('should return 400 when input is invalid', async () => {
      const { ctrl, rawRes } = createCtrl({ queryData: {} });
      await ctrl.derivativeAction();
      expect(rawRes.status).toHaveBeenCalledWith(400);
      expect(rawRes.send).toHaveBeenCalledWith('Invalid request');
    });

    it('should return 404 when file not found', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileMetadataService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileMetadataService.getTable.mockReturnValue({
        fetchById: jest.fn().mockResolvedValue(null),
      });
      await ctrl.derivativeAction();
      expect(rawRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user has no access', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileMetadataService, mockFilePermissionService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileMetadataService.getTable.mockReturnValue({
        fetchById: jest.fn().mockResolvedValue({
          getCreatedBy: () => 'other-user',
          getTenantId: () => 't1',
        }),
      });
      mockFilePermissionService.hasAccess.mockResolvedValue(false);
      await ctrl.derivativeAction();
      expect(rawRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when derivative not found for thumbnail', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileDerivativeTable } = createCtrl({
        queryData: { id: fileId, kind: 'thumbnail', size: '256' },
      });
      mockFileDerivativeTable.fetchByFileIdKindSize.mockResolvedValue(null);
      await ctrl.derivativeAction();
      expect(rawRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 for preview_pages when not ready', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileDerivativeTable } = createCtrl({
        queryData: { id: fileId, kind: 'preview_pages' },
      });
      mockFileDerivativeTable.fetchByFileIdAndKind.mockResolvedValue({
        getStatus: () => 'pending',
      });
      await ctrl.derivativeAction();
      expect(rawRes.status).toHaveBeenCalledWith(404);
    });

    it('should return manifest JSON for preview_pages without page param', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const manifest = { pages: [{ page: 1, object_key: 'key1' }] };
      const { ctrl, rawRes, mockFileDerivativeTable } = createCtrl({
        queryData: { id: fileId, kind: 'preview_pages' },
      });
      mockFileDerivativeTable.fetchByFileIdAndKind.mockResolvedValue({
        getStatus: () => 'ready',
        getManifest: () => manifest,
        getStorageBackendId: () => 'sb1',
      });
      await ctrl.derivativeAction();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(rawRes.json).toHaveBeenCalledWith(manifest);
    });

    it('should return 404 when page not found in manifest', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const manifest = { pages: [{ page: 1, object_key: 'key1' }] };
      const { ctrl, rawRes, mockFileDerivativeTable } = createCtrl({
        queryData: { id: fileId, kind: 'preview_pages', page: '5' },
      });
      mockFileDerivativeTable.fetchByFileIdAndKind.mockResolvedValue({
        getStatus: () => 'ready',
        getManifest: () => manifest,
        getStorageBackendId: () => 'sb1',
      });
      await ctrl.derivativeAction();
      expect(rawRes.status).toHaveBeenCalledWith(404);
      expect(rawRes.send).toHaveBeenCalledWith('Page not found');
    });

    it('should stream thumbnail on success', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileDerivativeTable, mockStorageService } = createCtrl({
        queryData: { id: fileId, kind: 'thumbnail', size: '256' },
      });
      mockFileDerivativeTable.fetchByFileIdKindSize.mockResolvedValue({
        getStorageBackendId: () => 'sb1',
        getObjectKey: () => 'obj/key',
      });
      await ctrl.derivativeAction();
      expect(mockStorageService.getBackend).toHaveBeenCalledWith('sb1');
      expect(mockStorageService.read).toHaveBeenCalled();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=86400');
    });

    it('should stream page image for preview_pages with page param', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const manifest = { pages: [{ page: 1, object_key: 'page1.webp' }] };
      const { ctrl, rawRes, mockFileDerivativeTable, mockStorageService } = createCtrl({
        queryData: { id: fileId, kind: 'preview_pages', page: '1' },
      });
      mockFileDerivativeTable.fetchByFileIdAndKind.mockResolvedValue({
        getStatus: () => 'ready',
        getManifest: () => manifest,
        getStorageBackendId: () => 'sb1',
      });
      await ctrl.derivativeAction();
      expect(mockStorageService.getBackend).toHaveBeenCalledWith('sb1');
      expect(mockStorageService.read).toHaveBeenCalled();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
    });

    it('should check permission for non-owner files', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileMetadataService, mockFilePermissionService, mockFileDerivativeTable } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileMetadataService.getTable.mockReturnValue({
        fetchById: jest.fn().mockResolvedValue({
          getCreatedBy: () => 'other-user',
          getTenantId: () => 't1',
        }),
      });
      mockFilePermissionService.hasAccess.mockResolvedValue(true);
      mockFileDerivativeTable.fetchByFileIdKindSize.mockResolvedValue(null);
      await ctrl.derivativeAction();
      expect(mockFilePermissionService.hasAccess).toHaveBeenCalledWith('t1', fileId, 'u1');
      // Derivative not found since fetchByFileIdKindSize returns null
      expect(rawRes.status).toHaveBeenCalledWith(404);
    });

    it('should end response on error when headers already sent (derivative)', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileMetadataService } = createCtrl({
        queryData: { id: fileId },
      });
      rawRes.headersSent = true;
      mockFileMetadataService.getTable.mockReturnValue({
        fetchById: jest.fn().mockRejectedValue(new Error('DB error')),
      });
      await ctrl.derivativeAction();
      expect(rawRes.end).toHaveBeenCalled();
    });

    it('should handle error gracefully', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440000';
      const { ctrl, rawRes, mockFileMetadataService } = createCtrl({
        queryData: { id: fileId },
      });
      mockFileMetadataService.getTable.mockReturnValue({
        fetchById: jest.fn().mockRejectedValue(new Error('DB error')),
      });
      await ctrl.derivativeAction();
      expect(rawRes.status).toHaveBeenCalledWith(404);
      expect(rawRes.send).toHaveBeenCalledWith('Derivative not found');
    });
  });

  describe('publicLinkAction()', () => {
    it('should return 404 view when token is invalid', async () => {
      const { ctrl, mockViewManager } = createCtrl({
        actionName: 'publicLinkAction',
        params: { token: 'invalid' },
      });
      const result = await ctrl.publicLinkAction();
      expect(mockViewManager.createErrorViewModel).toHaveBeenCalledWith(404, null, null);
    });

    it('should redirect to login when error contains Login required', async () => {
      const validToken = 'a'.repeat(64);
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        actionName: 'publicLinkAction',
        params: { token: validToken },
      });
      mockFileActionService.resolvePublicLink.mockRejectedValue(new Error('Login required'));
      await ctrl.publicLinkAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminLoginIndex', null, {
        query: { return_url: '/current-uri' },
      });
    });

    it('should return 404 on other errors', async () => {
      const validToken = 'a'.repeat(64);
      const { ctrl, mockViewManager, mockFileActionService } = createCtrl({
        actionName: 'publicLinkAction',
        params: { token: validToken },
      });
      mockFileActionService.resolvePublicLink.mockRejectedValue(new Error('Not found'));
      await ctrl.publicLinkAction();
      expect(mockViewManager.createErrorViewModel).toHaveBeenCalled();
    });

    it('should return view model with file info on success', async () => {
      const validToken = 'a'.repeat(64);
      const { ctrl, mockFileActionService } = createCtrl({
        actionName: 'publicLinkAction',
        params: { token: validToken },
      });
      const result = await ctrl.publicLinkAction();
      expect(result).toBeDefined();
      expect(result.getVariable('file')).toEqual({ name: 'test.txt' });
      expect(result.getVariable('token')).toBe(validToken);
      expect(result.getVariable('downloadUrl')).toBe(`/s/${validToken}/download`);
    });
  });

  describe('publicDownloadAction()', () => {
    it('should return 404 view for invalid token', async () => {
      const { ctrl, mockViewManager } = createCtrl({
        actionName: 'publicDownloadAction',
        params: { token: 'bad' },
      });
      await ctrl.publicDownloadAction();
      expect(mockViewManager.createErrorViewModel).toHaveBeenCalled();
    });

    it('should stream file on valid token', async () => {
      const validToken = 'b'.repeat(64);
      const { ctrl, rawRes, mockUsageDailyService } = createCtrl({
        actionName: 'publicDownloadAction',
        params: { token: validToken },
      });
      await ctrl.publicDownloadAction();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="test.txt"');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      expect(rawRes.removeHeader).toHaveBeenCalledWith('Set-Cookie');
      expect(mockUsageDailyService.recordDownload).toHaveBeenCalledWith('t1', 512);
    });

    it('should fallback to octet-stream when contentType is null (publicDownload)', async () => {
      const validToken = 'b'.repeat(64);
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        actionName: 'publicDownloadAction',
        params: { token: validToken },
      });
      mockFileActionService.streamPublicDownload.mockResolvedValue({
        file: {
          getContentType: () => null,
          getOriginalFilename: () => 'file.bin',
          getTenantId: () => 't1',
          getSizeBytes: () => 100,
        },
        stream: { pipe: jest.fn() },
      });
      await ctrl.publicDownloadAction();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });

    it('should redirect to login on Login required error', async () => {
      const validToken = 'b'.repeat(64);
      const { ctrl, mockRedirect, mockFileActionService } = createCtrl({
        actionName: 'publicDownloadAction',
        params: { token: validToken },
      });
      mockFileActionService.streamPublicDownload.mockRejectedValue(new Error('Login required'));
      await ctrl.publicDownloadAction();
      expect(mockRedirect.toRoute).toHaveBeenCalledWith('adminLoginIndex', null, {
        query: { return_url: '/current-uri' },
      });
    });

    it('should return notFound on other errors', async () => {
      const validToken = 'b'.repeat(64);
      const { ctrl, mockViewManager, mockFileActionService } = createCtrl({
        actionName: 'publicDownloadAction',
        params: { token: validToken },
      });
      mockFileActionService.streamPublicDownload.mockRejectedValue(new Error('Not found'));
      await ctrl.publicDownloadAction();
      expect(mockViewManager.createErrorViewModel).toHaveBeenCalled();
    });

    it('should end response on error when headers already sent', async () => {
      const validToken = 'b'.repeat(64);
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        actionName: 'publicDownloadAction',
        params: { token: validToken },
      });
      rawRes.headersSent = true;
      mockFileActionService.streamPublicDownload.mockRejectedValue(new Error('Stream error'));
      await ctrl.publicDownloadAction();
      expect(rawRes.end).toHaveBeenCalled();
    });
  });

  describe('publicServeAction()', () => {
    it('should return 404 view for invalid public key', async () => {
      const { ctrl, mockViewManager } = createCtrl({
        actionName: 'publicServeAction',
        params: { public_key: 'bad' },
      });
      await ctrl.publicServeAction();
      expect(mockViewManager.createErrorViewModel).toHaveBeenCalled();
    });

    it('should stream file on valid public key', async () => {
      const validKey = 'c'.repeat(32);
      const { ctrl, rawRes, mockUsageDailyService } = createCtrl({
        actionName: 'publicServeAction',
        params: { public_key: validKey },
      });
      await ctrl.publicServeAction();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="test.txt"');
      expect(rawRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      expect(rawRes.removeHeader).toHaveBeenCalledWith('Set-Cookie');
      expect(mockUsageDailyService.recordDownload).toHaveBeenCalledWith('t1', 512);
    });

    it('should fallback to octet-stream when contentType is null (publicServe)', async () => {
      const validKey = 'c'.repeat(32);
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        actionName: 'publicServeAction',
        params: { public_key: validKey },
      });
      mockFileActionService.streamPublicServe.mockResolvedValue({
        file: {
          getContentType: () => null,
          getOriginalFilename: () => 'file.bin',
          getTenantId: () => 't1',
          getSizeBytes: () => 100,
        },
        stream: { pipe: jest.fn() },
      });
      await ctrl.publicServeAction();
      expect(rawRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });

    it('should return 404 on error when headers not sent', async () => {
      const validKey = 'c'.repeat(32);
      const { ctrl, mockViewManager, mockFileActionService } = createCtrl({
        actionName: 'publicServeAction',
        params: { public_key: validKey },
      });
      mockFileActionService.streamPublicServe.mockRejectedValue(new Error('Not found'));
      await ctrl.publicServeAction();
      expect(mockViewManager.createErrorViewModel).toHaveBeenCalled();
    });

    it('should end response on error when headers already sent', async () => {
      const validKey = 'c'.repeat(32);
      const { ctrl, rawRes, mockFileActionService } = createCtrl({
        actionName: 'publicServeAction',
        params: { public_key: validKey },
      });
      rawRes.headersSent = true;
      mockFileActionService.streamPublicServe.mockRejectedValue(new Error('err'));
      await ctrl.publicServeAction();
      expect(rawRes.end).toHaveBeenCalled();
    });
  });

  describe('_recordDownload()', () => {
    it('should record download usage', () => {
      const { ctrl, mockUsageDailyService } = createCtrl();
      const file = {
        getTenantId: () => 't1',
        getSizeBytes: () => 1024,
      };
      ctrl._recordDownload(file);
      expect(mockUsageDailyService.recordDownload).toHaveBeenCalledWith('t1', 1024);
    });

    it('should skip recording when tenantId is null', () => {
      const { ctrl, mockUsageDailyService } = createCtrl();
      const file = {
        getTenantId: () => null,
        getSizeBytes: () => 1024,
      };
      ctrl._recordDownload(file);
      expect(mockUsageDailyService.recordDownload).not.toHaveBeenCalled();
    });

    it('should use 0 for size when getSizeBytes is not available', () => {
      const { ctrl, mockUsageDailyService } = createCtrl();
      const file = {
        getTenantId: () => 't1',
      };
      ctrl._recordDownload(file);
      expect(mockUsageDailyService.recordDownload).toHaveBeenCalledWith('t1', 0);
    });
  });
});
