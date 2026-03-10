const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const JsonPlugin = require(globalThis.applicationPath('/application/plugin/json'));

describe('JsonPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new JsonPlugin();
  });

  describe('constructor', () => {
    it('sets default statusCode to 200', () => {
      expect(plugin.statusCode).toBe(200);
    });

    it('accepts options', () => {
      const p = new JsonPlugin({ customOpt: true });
      expect(p.getOptions()).toEqual({ customOpt: true });
    });
  });

  describe('status()', () => {
    it('sets the statusCode', () => {
      plugin.status(404);
      expect(plugin.statusCode).toBe(404);
    });

    it('is chainable', () => {
      const result = plugin.status(201);
      expect(result).toBe(plugin);
    });
  });

  describe('send()', () => {
    let mockExpressRes;
    let mockResponse;
    let mockRequest;
    let mockController;

    beforeEach(() => {
      mockExpressRes = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockResponse = {
        setHeader: jest.fn(),
        setHttpResponseCode: jest.fn()
      };
      mockRequest = {
        getExpressResponse: () => mockExpressRes
      };
      mockController = {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
        getServiceManager: () => ({}),
        plugin: () => ({})
      };

      plugin.setController(mockController);
    });

    it('sends JSON data with default status code 200', () => {
      const data = { message: 'ok' };
      plugin.send(data);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(200);
      expect(mockExpressRes.status).toHaveBeenCalledWith(200);
      expect(mockExpressRes.set).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
      expect(mockExpressRes.json).toHaveBeenCalledWith(data);
    });

    it('sends with custom status code passed to send()', () => {
      plugin.send({ error: 'not found' }, 404);

      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(404);
      expect(mockExpressRes.status).toHaveBeenCalledWith(404);
    });

    it('uses status code set via status() method', () => {
      plugin.status(201);
      plugin.send({ id: 1 });

      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(201);
      expect(mockExpressRes.status).toHaveBeenCalledWith(201);
    });

    it('resets statusCode to 200 after send()', () => {
      plugin.status(404);
      plugin.send({ error: 'not found' });

      expect(plugin.statusCode).toBe(200);
    });

    it('sends empty object by default', () => {
      plugin.send();
      expect(mockExpressRes.json).toHaveBeenCalledWith({});
    });
  });
});
