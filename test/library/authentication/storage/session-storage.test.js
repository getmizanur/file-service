const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const SessionStorage = require(path.join(projectRoot, 'library/authentication/storage/session-storage'));
const Session = require(path.join(projectRoot, 'library/session/session'));

describe('SessionStorage', () => {

  beforeEach(() => {
    // Reset session state before each test
    Session._started = false;
    Session._sessionId = null;
    Session._sessionData = {};
    Session._namespaces = new Map();
    Session._currentRequest = null;
    if (globalThis.locals) {
      delete globalThis.locals;
    }
  });

  describe('static properties', () => {
    it('should have IDENTITY_KEY set to "identity"', () => {
      expect(SessionStorage.IDENTITY_KEY).toBe('identity');
    });
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const storage = new SessionStorage();
      expect(storage.expressReq).toBeNull();
      expect(storage.namespace).toBe('Auth');
      expect(storage.key).toBe('identity');
      expect(storage.debug).toBe(false);
    });

    it('should accept express request', () => {
      const req = { session: { id: 'abc' } };
      const storage = new SessionStorage(req);
      expect(storage.expressReq).toBe(req);
    });

    it('should accept custom namespace', () => {
      const storage = new SessionStorage(null, { namespace: 'CustomAuth' });
      expect(storage.namespace).toBe('CustomAuth');
    });

    it('should accept custom key', () => {
      const storage = new SessionStorage(null, { key: 'user' });
      expect(storage.key).toBe('user');
    });

    it('should accept debug option', () => {
      const storage = new SessionStorage(null, { debug: true });
      expect(storage.debug).toBe(true);
    });

    it('should accept sessionOptions', () => {
      const storage = new SessionStorage(null, { sessionOptions: { name: 'SESS' } });
      expect(storage.sessionOptions).toEqual({ name: 'SESS' });
    });

    it('should attempt to start session if not started', () => {
      const startSpy = jest.spyOn(Session, 'start');
      new SessionStorage();
      expect(startSpy).toHaveBeenCalled();
      startSpy.mockRestore();
    });

    it('should not throw if Session.start fails', () => {
      const startSpy = jest.spyOn(Session, 'start').mockImplementation(() => {
        throw new Error('start failed');
      });
      expect(() => new SessionStorage()).not.toThrow();
      startSpy.mockRestore();
    });

    it('should log debug message when Session.start fails and debug=true', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const startSpy = jest.spyOn(Session, 'start').mockImplementation(() => {
        throw new Error('start failed');
      });
      new SessionStorage(null, { debug: true });
      expect(debugSpy).toHaveBeenCalled();
      startSpy.mockRestore();
      debugSpy.mockRestore();
    });
  });

  describe('write / read / isEmpty / clear', () => {
    let storage;
    beforeEach(() => {
      storage = new SessionStorage();
    });

    it('should be empty initially', () => {
      expect(storage.isEmpty()).toBe(true);
    });

    it('should read null when empty', () => {
      expect(storage.read()).toBeNull();
    });

    it('should write and read identity', () => {
      const identity = { id: 1, name: 'Admin' };
      storage.write(identity);
      expect(storage.isEmpty()).toBe(false);
      expect(storage.read()).toEqual(identity);
    });

    it('should clear identity', () => {
      storage.write({ id: 1 });
      storage.clear();
      expect(storage.isEmpty()).toBe(true);
      expect(storage.read()).toBeNull();
    });

    it('should write string identity', () => {
      storage.write('user@example.com');
      expect(storage.read()).toBe('user@example.com');
    });

    it('should overwrite existing identity', () => {
      storage.write({ id: 1 });
      storage.write({ id: 2 });
      expect(storage.read().id).toBe(2);
    });
  });

  describe('isEmpty error handling', () => {
    it('should return true when _ns throws', () => {
      const storage = new SessionStorage();
      jest.spyOn(storage, '_ns').mockImplementation(() => { throw new Error('ns error'); });
      expect(storage.isEmpty()).toBe(true);
    });
  });

  describe('read error handling', () => {
    it('should return null when _ns throws', () => {
      const storage = new SessionStorage();
      jest.spyOn(storage, '_ns').mockImplementation(() => { throw new Error('ns error'); });
      expect(storage.read()).toBeNull();
    });
  });

  describe('write error handling', () => {
    it('should not throw when _ns throws', () => {
      const storage = new SessionStorage();
      jest.spyOn(storage, '_ns').mockImplementation(() => { throw new Error('ns error'); });
      expect(() => storage.write({ id: 1 })).not.toThrow();
    });
  });

  describe('clear error handling', () => {
    it('should not throw when _ns throws', () => {
      const storage = new SessionStorage();
      jest.spyOn(storage, '_ns').mockImplementation(() => { throw new Error('ns error'); });
      expect(() => storage.clear()).not.toThrow();
    });
  });

  describe('save', () => {
    it('should call Session.save if available', async () => {
      const saveSpy = jest.spyOn(Session, 'save').mockResolvedValue();
      const storage = new SessionStorage();
      await storage.save();
      expect(saveSpy).toHaveBeenCalled();
      saveSpy.mockRestore();
    });

    it('should not throw if Session.save is not a function', async () => {
      const origSave = Session.save;
      Session.save = undefined;
      const storage = new SessionStorage();
      await expect(storage.save()).resolves.not.toThrow();
      Session.save = origSave;
    });

    it('should start session if not started before saving', async () => {
      Session._started = false;
      const startSpy = jest.spyOn(Session, 'start').mockReturnValue(Session);
      const saveSpy = jest.spyOn(Session, 'save').mockResolvedValue();
      const storage = new SessionStorage();
      startSpy.mockClear();
      Session._started = false;
      await storage.save();
      expect(startSpy).toHaveBeenCalled();
      startSpy.mockRestore();
      saveSpy.mockRestore();
    });

    it('should not throw if save fails', async () => {
      jest.spyOn(Session, 'save').mockRejectedValue(new Error('save failed'));
      const storage = new SessionStorage(null, { debug: false });
      // save catches errors internally
      await expect(storage.save()).resolves.not.toThrow();
      Session.save.mockRestore();
    });
  });

  describe('_log', () => {
    it('should log when debug is true', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const storage = new SessionStorage(null, { debug: true });
      storage._log('test message');
      expect(debugSpy).toHaveBeenCalledWith('[SessionStorage]', 'test message');
      debugSpy.mockRestore();
    });

    it('should not log when debug is false', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const storage = new SessionStorage(null, { debug: false });
      storage._log('test message');
      // Only the constructor debug calls, not our _log call
      const calls = debugSpy.mock.calls.filter(c => c[1] === 'test message');
      expect(calls).toHaveLength(0);
      debugSpy.mockRestore();
    });
  });

  describe('_ns', () => {
    it('should start session if not started and return namespace', () => {
      const storage = new SessionStorage();
      Session._started = false;
      const ns = storage._ns();
      expect(ns).toBeDefined();
      expect(typeof ns.get).toBe('function');
      expect(typeof ns.set).toBe('function');
    });
  });
});
