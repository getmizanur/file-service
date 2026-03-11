const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const RestController = require(path.join(projectRoot, 'library/mvc/controller/rest-controller'));
const BaseController = require(path.join(projectRoot, 'library/mvc/controller/base-controller'));

function createMockRequest(method = 'GET', params = {}) {
  return {
    getMethod: jest.fn().mockReturnValue(method),
    getParam: jest.fn((name, def) => params[name] !== undefined ? params[name] : def),
    getParams: jest.fn().mockReturnValue(params),
    params
  };
}

function createMockResponse() {
  return {
    hasBody: false,
    body: null,
    headers: {},
    statusCode: 200,
    setHeader: jest.fn(function (k, v) { this.headers[k] = v; }),
    getHeader: jest.fn(function (name) { return this.headers[name] || null; }),
    setHttpResponseCode: jest.fn(function (code) { this.statusCode = code; }),
    setBody: jest.fn(function (body) { this.body = body; this.hasBody = true; }),
    clearBody: jest.fn(function () { this.body = null; this.hasBody = false; }),
    canSendHeaders: jest.fn()
  };
}

function createMockEvent(method = 'GET', params = {}) {
  const req = createMockRequest(method, params);
  const res = createMockResponse();
  return {
    getRequest: jest.fn().mockReturnValue(req),
    getResponse: jest.fn().mockReturnValue(res),
    getRouteMatch: jest.fn().mockReturnValue(null),
    req,
    res
  };
}

function createController(method = 'GET', params = {}, handlerOverrides = {}) {
  const event = createMockEvent(method, params);
  const sm = {
    get: jest.fn((name) => {
      if (name === 'AuthenticationService') {
        return { hasIdentity: () => false, getIdentity: () => null };
      }
      throw new Error(`Service ${name} not found`);
    }),
    has: jest.fn().mockReturnValue(false)
  };

  const ctrl = new RestController({ serviceManager: sm });
  ctrl.setEvent(event);

  // Apply handler overrides
  for (const [name, fn] of Object.entries(handlerOverrides)) {
    ctrl[name] = fn;
  }

  return { ctrl, event, sm };
}

describe('RestController', () => {

  describe('constructor', () => {
    it('should extend BaseController', () => {
      const ctrl = new RestController();
      expect(ctrl).toBeInstanceOf(BaseController);
    });

    it('should set noRender to true by default', () => {
      const ctrl = new RestController();
      expect(ctrl.isNoRender()).toBe(true);
    });
  });

  describe('restAction - method routing', () => {
    it('should call indexAction for GET without id', async () => {
      const indexAction = jest.fn().mockReturnValue([{ id: 1 }]);
      const { ctrl } = createController('GET', {}, { indexAction });
      await ctrl.restAction();
      expect(indexAction).toHaveBeenCalled();
    });

    it('should call getAction for GET with id', async () => {
      const getAction = jest.fn().mockReturnValue({ id: 1 });
      const { ctrl } = createController('GET', { id: '123' }, { getAction });
      await ctrl.restAction();
      expect(getAction).toHaveBeenCalled();
    });

    it('should call getAction for HEAD with id', async () => {
      const getAction = jest.fn().mockReturnValue({ id: 1 });
      const { ctrl } = createController('HEAD', { id: '123' }, { getAction });
      await ctrl.restAction();
      expect(getAction).toHaveBeenCalled();
    });

    it('should call indexAction for HEAD without id', async () => {
      const indexAction = jest.fn().mockReturnValue([]);
      const { ctrl } = createController('HEAD', {}, { indexAction });
      await ctrl.restAction();
      expect(indexAction).toHaveBeenCalled();
    });

    it('should call postAction for POST', async () => {
      const postAction = jest.fn().mockReturnValue({ created: true });
      const { ctrl } = createController('POST', {}, { postAction });
      await ctrl.restAction();
      expect(postAction).toHaveBeenCalled();
    });

    it('should call putAction for PUT', async () => {
      const putAction = jest.fn().mockReturnValue({ updated: true });
      const { ctrl } = createController('PUT', {}, { putAction });
      await ctrl.restAction();
      expect(putAction).toHaveBeenCalled();
    });

    it('should call patchAction for PATCH', async () => {
      const patchAction = jest.fn().mockReturnValue({ patched: true });
      const { ctrl } = createController('PATCH', {}, { patchAction });
      await ctrl.restAction();
      expect(patchAction).toHaveBeenCalled();
    });

    it('should call deleteAction for DELETE', async () => {
      const deleteAction = jest.fn().mockResolvedValue(undefined);
      const { ctrl } = createController('DELETE', {}, { deleteAction });
      await ctrl.restAction();
      expect(deleteAction).toHaveBeenCalled();
    });

    it('should call optionsAction for OPTIONS if defined', async () => {
      const optionsAction = jest.fn().mockReturnValue(undefined);
      const { ctrl } = createController('OPTIONS', {}, { optionsAction });
      await ctrl.restAction();
      expect(optionsAction).toHaveBeenCalled();
    });

    it('should call default options() for OPTIONS if optionsAction not defined', async () => {
      const { ctrl, event } = createController('OPTIONS', {});
      // options() calls noContent which needs response
      await ctrl.restAction();
      // Should set 204 status
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(204);
    });

    it('should return methodNotAllowed for unsupported handler', async () => {
      const { ctrl, event } = createController('PUT', {});
      // No putAction defined
      await ctrl.restAction();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(405);
    });

    it('should default to GET when request has no getMethod', async () => {
      const indexAction = jest.fn().mockReturnValue([]);
      const { ctrl, event } = createController('GET', {}, { indexAction });
      event.req.getMethod = undefined;
      await ctrl.restAction();
      expect(indexAction).toHaveBeenCalled();
    });
  });

  describe('restAction - response handling', () => {
    it('should call ok() when handler returns a value and no body written', async () => {
      const indexAction = jest.fn().mockReturnValue([{ id: 1 }]);
      const { ctrl, event } = createController('GET', {}, { indexAction });
      await ctrl.restAction();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(200);
    });

    it('should not call ok() when handler returns undefined', async () => {
      const postAction = jest.fn().mockReturnValue(undefined);
      const { ctrl } = createController('POST', {}, { postAction });
      const result = await ctrl.restAction();
      expect(result).toBeUndefined();
    });

    it('should handle exceptions from action handler', async () => {
      const err = new Error('Test error');
      err.statusCode = 422;
      const postAction = jest.fn().mockRejectedValue(err);
      const { ctrl, event } = createController('POST', {}, { postAction });
      await ctrl.restAction();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(422);
    });
  });

  describe('getResourceId', () => {
    it('should return id param', () => {
      const { ctrl } = createController('GET', { id: '42' });
      expect(ctrl.getResourceId()).toBe('42');
    });

    it('should return null when no id param', () => {
      const { ctrl } = createController('GET', {});
      expect(ctrl.getResourceId()).toBeNull();
    });
  });

  describe('send', () => {
    it('should set status and JSON content-type for objects', () => {
      const { ctrl, event } = createController('GET');
      ctrl.send({ foo: 'bar' }, { status: 201 });
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(201);
      expect(event.res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8', true);
    });

    it('should set custom headers', () => {
      const { ctrl, event } = createController('GET');
      ctrl.send('ok', { headers: { 'X-Custom': 'test' } });
      expect(event.res.setHeader).toHaveBeenCalledWith('X-Custom', 'test', true);
    });

    it('should set custom contentType', () => {
      const { ctrl, event } = createController('GET');
      ctrl.send('<html>', { contentType: 'text/html' });
      expect(event.res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html', true);
    });

    it('should pass string payload as-is', () => {
      const { ctrl, event } = createController('GET');
      ctrl.send('plain text');
      expect(event.res.setBody).toHaveBeenCalledWith('plain text');
    });

    it('should JSON.stringify objects', () => {
      const { ctrl, event } = createController('GET');
      ctrl.send({ a: 1 });
      expect(event.res.setBody).toHaveBeenCalledWith('{"a":1}');
    });

    it('should handle null payload as empty body', () => {
      const { ctrl, event } = createController('GET');
      ctrl.send(null);
      expect(event.res.setBody).toHaveBeenCalledWith('');
    });

    it('should handle undefined payload as empty body', () => {
      const { ctrl, event } = createController('GET');
      ctrl.send(undefined);
      expect(event.res.setBody).toHaveBeenCalledWith('');
    });

    it('should clear body for HEAD requests', () => {
      const { ctrl, event } = createController('HEAD');
      ctrl.send({ data: 'test' });
      expect(event.res.clearBody).toHaveBeenCalled();
    });

    it('should handle Buffer payload', () => {
      const { ctrl, event } = createController('GET');
      const buf = Buffer.from('hello');
      ctrl.send(buf);
      expect(event.res.setBody).toHaveBeenCalledWith(buf);
    });
  });

  describe('response helpers', () => {
    it('ok() should send with status 200', () => {
      const { ctrl, event } = createController('GET');
      ctrl.ok({ result: true });
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(200);
    });

    it('created() should send with status 201', () => {
      const { ctrl, event } = createController('GET');
      ctrl.created({ id: 1 }, '/resource/1');
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(201);
      expect(event.res.setHeader).toHaveBeenCalledWith('Location', '/resource/1', true);
    });

    it('created() without location', () => {
      const { ctrl, event } = createController('GET');
      ctrl.created({ id: 1 });
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(201);
    });

    it('noContent() should send 204 with no body', () => {
      const { ctrl, event } = createController('GET');
      ctrl.noContent();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(204);
      expect(event.res.clearBody).toHaveBeenCalled();
    });

    it('noContent() with custom headers', () => {
      const { ctrl, event } = createController('GET');
      ctrl.noContent({ 'X-Test': 'yes' });
      expect(event.res.setHeader).toHaveBeenCalledWith('X-Test', 'yes', true);
    });

    it('badRequest() should send 400', () => {
      const { ctrl, event } = createController('GET');
      ctrl.badRequest('Validation failed', { field: 'name' });
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(400);
    });

    it('badRequest() with default message', () => {
      const { ctrl, event } = createController('GET');
      ctrl.badRequest();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(400);
    });

    it('unauthorized() should send 401', () => {
      const { ctrl, event } = createController('GET');
      ctrl.unauthorized();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(401);
    });

    it('forbidden() should send 403', () => {
      const { ctrl, event } = createController('GET');
      ctrl.forbidden();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(403);
    });

    it('notFound() should send 404', () => {
      const { ctrl, event } = createController('GET');
      ctrl.notFound();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(404);
    });

    it('conflict() should send 409', () => {
      const { ctrl, event } = createController('GET');
      ctrl.conflict();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(409);
    });

    it('methodNotAllowed() should send 405 with Allow header', () => {
      const { ctrl, event } = createController('GET');
      ctrl.methodNotAllowed('PATCH');
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(405);
    });

    it('options() should send 204 with Allow header', () => {
      const { ctrl, event } = createController('GET');
      ctrl.options();
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(204);
    });
  });

  describe('getAllowedMethods', () => {
    it('should always include OPTIONS', () => {
      const { ctrl } = createController();
      expect(ctrl.getAllowedMethods()).toContain('OPTIONS');
    });

    it('should include GET/HEAD when indexAction is defined', () => {
      const { ctrl } = createController('GET', {}, { indexAction: jest.fn() });
      const allowed = ctrl.getAllowedMethods();
      expect(allowed).toContain('GET');
      expect(allowed).toContain('HEAD');
    });

    it('should include GET/HEAD when getAction is defined', () => {
      const { ctrl } = createController('GET', {}, { getAction: jest.fn() });
      const allowed = ctrl.getAllowedMethods();
      expect(allowed).toContain('GET');
      expect(allowed).toContain('HEAD');
    });

    it('should include POST when postAction defined', () => {
      const { ctrl } = createController('GET', {}, { postAction: jest.fn() });
      expect(ctrl.getAllowedMethods()).toContain('POST');
    });

    it('should include PUT when putAction defined', () => {
      const { ctrl } = createController('GET', {}, { putAction: jest.fn() });
      expect(ctrl.getAllowedMethods()).toContain('PUT');
    });

    it('should include PATCH when patchAction defined', () => {
      const { ctrl } = createController('GET', {}, { patchAction: jest.fn() });
      expect(ctrl.getAllowedMethods()).toContain('PATCH');
    });

    it('should include DELETE when deleteAction defined', () => {
      const { ctrl } = createController('GET', {}, { deleteAction: jest.fn() });
      expect(ctrl.getAllowedMethods()).toContain('DELETE');
    });
  });

  describe('handleException', () => {
    it('should use err.statusCode if available', () => {
      const { ctrl, event } = createController('GET');
      const err = new Error('Unprocessable');
      err.statusCode = 422;
      ctrl.handleException(err);
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(422);
    });

    it('should use err.status if statusCode not available', () => {
      const { ctrl, event } = createController('GET');
      const err = new Error('Bad');
      err.status = 400;
      ctrl.handleException(err);
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(400);
    });

    it('should default to 500', () => {
      const { ctrl, event } = createController('GET');
      ctrl.handleException(new Error('Internal'));
      expect(event.res.setHttpResponseCode).toHaveBeenCalledWith(500);
    });

    it('should include stack in development', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const { ctrl, event } = createController('GET');
      const err = new Error('dev error');
      ctrl.handleException(err);
      const bodyArg = event.res.setBody.mock.calls[0][0];
      const parsed = JSON.parse(bodyArg);
      expect(parsed.stack).toBeDefined();
      process.env.NODE_ENV = origEnv;
    });

    it('should not include stack in production', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const { ctrl, event } = createController('GET');
      ctrl.handleException(new Error('prod error'));
      const bodyArg = event.res.setBody.mock.calls[0][0];
      const parsed = JSON.parse(bodyArg);
      expect(parsed.stack).toBeUndefined();
      process.env.NODE_ENV = origEnv;
    });
  });

  describe('send/noContent without clearBody on response', () => {
    it('HEAD request should set body=null and hasBody=false when clearBody is absent', () => {
      const { ctrl, event } = createController('HEAD');
      // Remove clearBody from response to trigger fallback
      delete event.res.clearBody;
      ctrl.send({ data: 'test' });
      expect(event.res.body).toBeNull();
      expect(event.res.hasBody).toBe(false);
    });

    it('noContent should set body=null when clearBody is absent', () => {
      const { ctrl, event } = createController('GET');
      delete event.res.clearBody;
      ctrl.noContent();
      expect(event.res.body).toBeNull();
      expect(event.res.hasBody).toBe(false);
    });
  });

  describe('getUser', () => {
    it('should return identity when authenticated', () => {
      const identity = { id: 1, name: 'Admin' };
      const { ctrl, sm } = createController('GET');
      sm.get.mockImplementation((name) => {
        if (name === 'AuthenticationService') {
          return { hasIdentity: () => true, getIdentity: () => identity };
        }
        throw new Error(`Service ${name} not found`);
      });
      expect(ctrl.getUser()).toBe(identity);
    });

    it('should return null when not authenticated', () => {
      const { ctrl } = createController('GET');
      expect(ctrl.getUser()).toBeNull();
    });

    it('should return null when auth service throws', () => {
      const { ctrl, sm } = createController('GET');
      sm.get.mockImplementation(() => { throw new Error('not found'); });
      expect(ctrl.getUser()).toBeNull();
    });
  });
});
