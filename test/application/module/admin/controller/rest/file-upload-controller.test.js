const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileUploadController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/file-upload-controller'
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

function createCtrl({ hasIdentity = true, queryData = {}, headers = {} } = {}) {
  const ctrl = new FileUploadController();
  const mockResponse = createMockResponse();
  const mockBackend = {
    getStorageBackendId: jest.fn().mockReturnValue('sb1'),
  };
  const mockStorageService = {
    resolveBackendForTenant: jest.fn().mockResolvedValue({
      backend: mockBackend,
      keyTemplate: '{tenant_id}/{folder_id}/{file_id}/{sanitized_filename}',
    }),
    getMaxUploadBytes: jest.fn().mockReturnValue(100 * 1024 * 1024),
    interpolateKeyTemplate: jest.fn().mockReturnValue('t1/f1/file-id/test.txt'),
    buildStorageUri: jest.fn().mockReturnValue('s3://bucket/t1/f1/file-id/test.txt'),
    write: jest.fn().mockResolvedValue({ size: 1024 }),
  };
  const mockFileMetadataService = {
    prepareUpload: jest.fn().mockResolvedValue(true),
    finalizeUpload: jest.fn().mockResolvedValue(true),
    failUpload: jest.fn().mockResolvedValue(true),
  };
  const mockDerivativeService = {
    generateDerivatives: jest.fn().mockResolvedValue(true),
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
      if (name === 'UserService') return mockUserService;
      if (name === 'StorageService') return mockStorageService;
      if (name === 'FileMetadataService') return mockFileMetadataService;
      if (name === 'DerivativeService') return mockDerivativeService;
      return {};
    }),
  };
  ctrl.serviceManager = mockSm;
  const mockRequest = {
    getPost: jest.fn().mockReturnValue({}),
    getQuery: jest.fn().mockReturnValue(queryData),
    getMethod: jest.fn().mockReturnValue('POST'),
    getParam: jest.fn().mockReturnValue(null),
    getHeader: jest.fn((h) => headers[h] || null),
  };
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue(mockRequest),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn().mockReturnValue(null) }),
  };
  return {
    ctrl, mockResponse, mockStorageService, mockFileMetadataService,
    mockDerivativeService, mockAuthService, mockBackend, mockRequest,
  };
}

describe('FileUploadController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof FileUploadController).toBe('function');
    });

    it('should extend AdminRestController', () => {
      const ctrl = new FileUploadController();
      expect(ctrl).toBeInstanceOf(AdminRestController);
    });
  });

  describe('prototype methods', () => {
    it('should have postAction', () => {
      expect(typeof FileUploadController.prototype.postAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new FileUploadController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('postAction()', () => {
    it('should upload file successfully', async () => {
      const { ctrl, mockResponse, mockFileMetadataService, mockStorageService, mockDerivativeService } = createCtrl({
        queryData: { folder_id: 'f1', filename: 'test.txt', content_type: 'text/plain', size: '1024' },
      });
      await ctrl.postAction();
      expect(mockFileMetadataService.prepareUpload).toHaveBeenCalled();
      expect(mockStorageService.write).toHaveBeenCalled();
      expect(mockFileMetadataService.finalizeUpload).toHaveBeenCalled();
      expect(mockDerivativeService.generateDerivatives).toHaveBeenCalled();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.status).toBe('success');
      expect(body.data.size).toBe(1024);
    });

    it('should return error when folder_id is missing', async () => {
      const { ctrl, mockResponse } = createCtrl({
        queryData: { filename: 'test.txt' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.error).toContain('Folder ID is required');
    });

    it('should return error when filename is missing', async () => {
      const { ctrl, mockResponse } = createCtrl({
        queryData: { folder_id: 'f1' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body.error).toContain('Filename is required');
    });

    it('should return error when not authenticated', async () => {
      const { ctrl, mockResponse } = createCtrl({
        hasIdentity: false,
        queryData: { folder_id: 'f1', filename: 'test.txt' },
      });
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('should return 413 when file is too large', async () => {
      const { ctrl, mockResponse, mockStorageService } = createCtrl({
        queryData: { folder_id: 'f1', filename: 'test.txt', size: '999999999' },
      });
      mockStorageService.getMaxUploadBytes.mockReturnValue(1024);
      await ctrl.postAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(413);
    });

    it('should fail upload on write error and mark as failed', async () => {
      const { ctrl, mockResponse, mockStorageService, mockFileMetadataService } = createCtrl({
        queryData: { folder_id: 'f1', filename: 'test.txt', size: '1024' },
      });
      mockStorageService.write.mockRejectedValue(new Error('Storage error'));
      await ctrl.postAction();
      expect(mockFileMetadataService.failUpload).toHaveBeenCalled();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(500);
    });

    it('should use content-type from header if not in query', async () => {
      const { ctrl, mockFileMetadataService } = createCtrl({
        queryData: { folder_id: 'f1', filename: 'test.txt', size: '1024' },
        headers: { 'content-type': 'application/pdf' },
      });
      await ctrl.postAction();
      const prepareCall = mockFileMetadataService.prepareUpload.mock.calls[0][0];
      expect(prepareCall.content_type).toBe('application/pdf');
    });

    it('should sanitize filename for object key', async () => {
      const { ctrl, mockStorageService } = createCtrl({
        queryData: { folder_id: 'f1', filename: 'my file (1).txt', size: '1024' },
      });
      await ctrl.postAction();
      const interpolateCall = mockStorageService.interpolateKeyTemplate.mock.calls[0];
      expect(interpolateCall[1].sanitized_filename).toBe('my_file__1_.txt');
    });

    it('should log derivative generation error via .catch callback', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const { ctrl, mockResponse } = createCtrl({
        queryData: { folder_id: 'f1', filename: 'test.txt', size: '1024' },
      });
      // Make generateDerivatives reject to trigger the .catch callback on line 97-99
      const mockSm = ctrl.serviceManager;
      const origGet = mockSm.get;
      mockSm.get = jest.fn((name) => {
        if (name === 'DerivativeService') {
          return {
            generateDerivatives: jest.fn().mockRejectedValue(new Error('derivative fail')),
          };
        }
        return origGet(name);
      });
      await ctrl.postAction();
      // The derivative .catch fires asynchronously; give it a tick
      await new Promise(r => setTimeout(r, 10));
      expect(spy).toHaveBeenCalledWith(
        '[FileUploadController] Derivative generation error:',
        expect.any(Error)
      );
      spy.mockRestore();
    });

    it('should use default content-type when neither query nor header provides one', async () => {
      const { ctrl, mockFileMetadataService } = createCtrl({
        queryData: { folder_id: 'f1', filename: 'test.bin', size: '1024' },
        headers: {},
      });
      await ctrl.postAction();
      const prepareCall = mockFileMetadataService.prepareUpload.mock.calls[0][0];
      expect(prepareCall.content_type).toBe('application/octet-stream');
    });

    it('should use content-length header as size when size not in query', async () => {
      const { ctrl, mockFileMetadataService } = createCtrl({
        queryData: { folder_id: 'f1', filename: 'test.txt' },
        headers: { 'content-length': '2048' },
      });
      await ctrl.postAction();
      const prepareCall = mockFileMetadataService.prepareUpload.mock.calls[0][0];
      expect(prepareCall.size_bytes).toBe(2048);
    });
  });
});
