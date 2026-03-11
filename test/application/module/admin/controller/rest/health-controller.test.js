const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const HealthController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/health-controller'
));
const RestController = require(path.join(
  projectRoot, 'library/mvc/controller/rest-controller'
));
const BaseController = require(path.join(
  projectRoot, 'library/mvc/controller/base-controller'
));

function createCtrl() {
  const ctrl = new HealthController();
  const mockResponse = {
    setHeader: jest.fn(),
    getHeader: jest.fn().mockReturnValue(null),
    setHttpResponseCode: jest.fn(),
    setBody: jest.fn(),
    canSendHeaders: jest.fn(),
    hasBody: false,
  };
  const mockRequest = {
    getMethod: jest.fn().mockReturnValue('GET'),
  };
  ctrl.event = {
    getRequest: jest.fn().mockReturnValue(mockRequest),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRouteMatch: jest.fn().mockReturnValue({ getParam: jest.fn() }),
  };
  return { ctrl, mockResponse };
}

describe('HealthController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof HealthController).toBe('function');
    });

    it('should extend RestController', () => {
      const ctrl = new HealthController();
      expect(ctrl).toBeInstanceOf(RestController);
    });

    it('should extend BaseController', () => {
      const ctrl = new HealthController();
      expect(ctrl).toBeInstanceOf(BaseController);
    });
  });

  describe('prototype methods', () => {
    it('should have indexAction', () => {
      expect(typeof HealthController.prototype.indexAction).toBe('function');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new HealthController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });
  });

  describe('indexAction()', () => {
    it('should return ok with status ok', async () => {
      const { ctrl, mockResponse } = createCtrl();
      const result = await ctrl.indexAction();
      expect(mockResponse.setBody).toHaveBeenCalled();
      const body = JSON.parse(mockResponse.setBody.mock.calls[0][0]);
      expect(body).toEqual({ status: 'ok' });
    });

    it('should set status 200', async () => {
      const { ctrl, mockResponse } = createCtrl();
      await ctrl.indexAction();
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
    });

    it('should set Content-Type to application/json', async () => {
      const { ctrl, mockResponse } = createCtrl();
      await ctrl.indexAction();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type', 'application/json; charset=utf-8', true
      );
    });
  });
});
