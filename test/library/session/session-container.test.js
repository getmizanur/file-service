const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
const SessionContainer = require(path.join(projectRoot, 'library/session/session-container'));

describe('SessionContainer', () => {
  let container;

  beforeEach(() => {
    container = new SessionContainer('TestNs');
  });

  describe('constructor', () => {
    it('should create with namespace', () => {
      expect(container).toBeDefined();
    });

    it('should create with express session', () => {
      const session = { TestNs: {} };
      const c = new SessionContainer('TestNs', session);
      expect(c).toBeDefined();
    });
  });

  describe('set / get / has / remove', () => {
    it('should set and get a value', () => {
      container.set('key1', 'value1');
      expect(container.get('key1')).toBe('value1');
    });

    it('should return default for missing key', () => {
      expect(container.get('missing', 'default')).toBe('default');
    });

    it('should check if key exists', () => {
      container.set('exists', true);
      expect(container.has('exists')).toBe(true);
      expect(container.has('nope')).toBe(false);
    });

    it('should remove a key', () => {
      container.set('key', 'val');
      container.remove('key');
      expect(container.has('key')).toBe(false);
    });
  });

  describe('all / clear', () => {
    it('should return all data', () => {
      container.set('a', 1);
      container.set('b', 2);
      const all = container.all();
      expect(all.a).toBe(1);
      expect(all.b).toBe(2);
    });

    it('should clear all data', () => {
      container.set('a', 1);
      container.clear();
      expect(container.has('a')).toBe(false);
    });
  });

  describe('save', () => {
    it('should save without error when no express session', () => {
      container.set('key', 'val');
      expect(() => container.save()).not.toThrow();
    });

    it('should save to express session when available', () => {
      const session = { save: jest.fn((cb) => cb && cb()), TestNs: {} };
      const c = new SessionContainer('TestNs', session);
      c.set('key', 'val');
      c.save();
      expect(session.save).toHaveBeenCalled();
    });

    it('should reject when express session save returns error', async () => {
      const saveErr = new Error('save failed');
      const session = { save: jest.fn((cb) => cb(saveErr)), TestNs: {} };
      const c = new SessionContainer('TestNs', session);
      await expect(c.save()).rejects.toThrow('save failed');
    });
  });

  describe('_getData with express session and create=false', () => {
    it('should return null when namespace does not exist and create is false', () => {
      const session = {}; // no 'TestNs' key
      const c = new SessionContainer('TestNs', session);
      const result = c._getData(false);
      expect(result).toBeNull();
    });

    it('should create namespace when create is true', () => {
      const session = {};
      const c = new SessionContainer('TestNs', session);
      const result = c._getData(true);
      expect(result).toEqual({});
      expect(session.TestNs).toEqual({});
    });
  });

  describe('_getData with globalThis.locals.expressSession', () => {
    const origLocals = globalThis.locals;

    afterEach(() => {
      if (origLocals === undefined) {
        delete globalThis.locals;
      } else {
        globalThis.locals = origLocals;
      }
    });

    it('should use globalThis.locals.expressSession when no _expressSession', () => {
      globalThis.locals = { expressSession: {} };
      const c = new SessionContainer('TestNs');
      const data = c._getData(true);
      expect(data).toEqual({});
      expect(globalThis.locals.expressSession.TestNs).toEqual({});
    });

    it('should return null from globalThis path when namespace missing and create=false', () => {
      globalThis.locals = { expressSession: {} };
      const c = new SessionContainer('TestNs');
      const result = c._getData(false);
      expect(result).toBeNull();
    });

    it('should return existing namespace from globalThis path', () => {
      globalThis.locals = { expressSession: { TestNs: { foo: 'bar' } } };
      const c = new SessionContainer('TestNs');
      const data = c._getData(false);
      expect(data).toEqual({ foo: 'bar' });
    });
  });

  describe('set/remove/clear touch _expressSession._modifiedAt', () => {
    it('set should touch _modifiedAt on express session', () => {
      const session = { TestNs: {} };
      const c = new SessionContainer('TestNs', session);
      c.set('key', 'val');
      expect(session._modifiedAt).toBeDefined();
      expect(typeof session._modifiedAt).toBe('number');
    });

    it('remove should touch _modifiedAt on express session', () => {
      const session = { TestNs: { key: 'val' } };
      const c = new SessionContainer('TestNs', session);
      c.remove('key');
      expect(session._modifiedAt).toBeDefined();
      expect(typeof session._modifiedAt).toBe('number');
    });

    it('clear should touch _modifiedAt on express session and log', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const session = { TestNs: { a: 1, b: 2 } };
      const c = new SessionContainer('TestNs', session);
      c.clear();
      expect(session._modifiedAt).toBeDefined();
      expect(typeof session._modifiedAt).toBe('number');
      expect(session.TestNs).toEqual({});
      logSpy.mockRestore();
    });
  });

  describe('remove/clear when _getData returns null', () => {
    it('remove should not throw when _getData returns null', () => {
      const session = {}; // no namespace
      const c = new SessionContainer('Missing', session);
      expect(() => c.remove('nonexistent')).not.toThrow();
    });

    it('clear should not throw when _getData returns null', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const session = {}; // no namespace
      const c = new SessionContainer('Missing', session);
      expect(() => c.clear()).not.toThrow();
      logSpy.mockRestore();
    });
  });

  describe('get/has/all when _getData returns null', () => {
    it('get should return defaultValue when _getData returns null', () => {
      const session = {}; // no namespace
      const c = new SessionContainer('Missing', session);
      expect(c.get('key', 'fallback')).toBe('fallback');
    });

    it('get should return null as default when _getData returns null', () => {
      const session = {};
      const c = new SessionContainer('Missing', session);
      expect(c.get('key')).toBeNull();
    });

    it('has should return false when _getData returns null', () => {
      const session = {};
      const c = new SessionContainer('Missing', session);
      expect(c.has('key')).toBe(false);
    });

    it('all should return empty object when _getData returns null', () => {
      const session = {};
      const c = new SessionContainer('Missing', session);
      expect(c.all()).toEqual({});
    });
  });
});
