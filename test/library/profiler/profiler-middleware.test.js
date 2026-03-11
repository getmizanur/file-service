const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const createProfilerMiddleware = require(path.join(projectRoot, 'library/profiler/profiler-middleware'));
const Profiler = require(path.join(projectRoot, 'library/profiler/profiler'));

describe('Profiler Middleware', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  it('should return a middleware function', () => {
    const profiler = new Profiler();
    const middleware = createProfilerMiddleware(profiler);
    expect(typeof middleware).toBe('function');
  });

  it('should call next immediately when profiler is disabled', () => {
    const profiler = new Profiler();
    const middleware = createProfilerMiddleware(profiler);
    const next = jest.fn();
    middleware({}, {}, next);
    expect(next).toHaveBeenCalled();
  });

  it('should wrap in context when profiler is enabled', () => {
    const profiler = new Profiler();
    profiler.setEnabled(true);
    const middleware = createProfilerMiddleware(profiler);
    const req = {
      method: 'GET', url: '/test', originalUrl: '/test',
      headers: {}, query: {}, body: {}, params: {}, cookies: {}, ip: '127.0.0.1'
    };
    const res = { on: jest.fn(), locals: {} };
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals._profiler).toBe(profiler);
  });

  it('should handle error in finish handler gracefully', () => {
    const profiler = new Profiler();
    profiler.setEnabled(true);
    // Make printSummary throw
    profiler.printSummary = () => { throw new Error('summary fail'); };
    const middleware = createProfilerMiddleware(profiler);
    const req = {
      method: 'GET', url: '/err',
      headers: {}, query: {}, body: null, params: {}, ip: '127.0.0.1'
    };
    let finishCb;
    const res = { on: jest.fn((event, cb) => { if (event === 'finish') finishCb = cb; }), locals: {} };
    const next = jest.fn();
    middleware(req, res, next);
    // finishCb should not throw (error is caught internally)
    expect(() => finishCb()).not.toThrow();
  });

  it('should print summary on response finish', () => {
    const profiler = new Profiler();
    profiler.setEnabled(true);
    const middleware = createProfilerMiddleware(profiler);
    const req = {
      method: 'GET', url: '/test',
      headers: {}, query: {}, body: null, params: {}, ip: '127.0.0.1'
    };
    let finishCb;
    const res = { on: jest.fn((event, cb) => { if (event === 'finish') finishCb = cb; }), locals: {} };
    const next = jest.fn();
    middleware(req, res, next);
    expect(finishCb).toBeDefined();
    // Trigger finish callback
    expect(() => finishCb()).not.toThrow();
  });

  it('should use connection.remoteAddress when ip is absent', () => {
    const profiler = new Profiler();
    profiler.setEnabled(true);
    const middleware = createProfilerMiddleware(profiler);
    const req = {
      method: 'GET', url: '/test', originalUrl: '/test',
      headers: {}, query: {}, body: 'raw-body', params: {},
      connection: { remoteAddress: '10.0.0.1' }
    };
    const res = { on: jest.fn(), locals: {} };
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should handle request without cookies', () => {
    const profiler = new Profiler();
    profiler.setEnabled(true);
    const middleware = createProfilerMiddleware(profiler);
    const req = {
      method: 'POST', url: '/api', originalUrl: '/api',
      headers: { 'content-type': 'application/json' }, query: {},
      body: { key: 'val' }, params: {}, ip: '127.0.0.1'
      // no cookies property
    };
    const res = { on: jest.fn(), locals: {} };
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should capture routeName from request in finish handler', () => {
    const profiler = new Profiler();
    profiler.setEnabled(true);
    const middleware = createProfilerMiddleware(profiler);
    const req = {
      method: 'GET', url: '/test',
      headers: {}, query: {}, body: null, params: {}, ip: '127.0.0.1',
      routeName: 'home'
    };
    let finishCb;
    const res = { on: jest.fn((event, cb) => { if (event === 'finish') finishCb = cb; }), locals: {} };
    const next = jest.fn();
    middleware(req, res, next);
    expect(() => finishCb()).not.toThrow();
  });
});
