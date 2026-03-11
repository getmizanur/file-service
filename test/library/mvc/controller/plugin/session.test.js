const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const SessionPlugin = require(path.join(projectRoot, 'library/mvc/controller/plugin/session'));
const Session = require(path.join(projectRoot, 'library/session/session'));

describe('SessionPlugin', () => {
  afterEach(() => {
    try { Session.destroy(); } catch (e) { /* ignore */ }
  });

  describe('constructor', () => {
    it('should create with default namespace', () => {
      const plugin = new SessionPlugin();
      expect(plugin.defaultNamespace).toBe('Default');
    });

    it('should accept custom default namespace', () => {
      const plugin = new SessionPlugin({ defaultNamespace: 'Custom' });
      expect(plugin.defaultNamespace).toBe('Custom');
    });
  });

  describe('_getExpressRequest', () => {
    it('should return null when no controller', () => {
      const plugin = new SessionPlugin();
      expect(plugin._getExpressRequest()).toBeNull();
    });

    it('should return null when controller getRequest returns null', () => {
      const plugin = new SessionPlugin();
      plugin.setController({
        getRequest: jest.fn(() => null),
        getResponse: jest.fn(() => ({})),
        getServiceManager: jest.fn(() => ({ get: jest.fn() })),
        plugin: jest.fn()
      });
      expect(plugin._getExpressRequest()).toBeNull();
    });

    it('should use getExpressRequest if available', () => {
      const plugin = new SessionPlugin();
      const expressReq = { session: {} };
      plugin.setController({
        getRequest: () => ({ getExpressRequest: () => expressReq }),
        getResponse: jest.fn(() => ({})),
        getServiceManager: jest.fn(() => ({ get: jest.fn() })),
        plugin: jest.fn()
      });
      expect(plugin._getExpressRequest()).toBe(expressReq);
    });

    it('should return null when request has neither getExpressRequest nor expressRequest', () => {
      const plugin = new SessionPlugin();
      plugin.setController({
        getRequest: () => ({ someOtherProp: true }),
        getResponse: jest.fn(() => ({})),
        getServiceManager: jest.fn(() => ({ get: jest.fn() })),
        plugin: jest.fn()
      });
      expect(plugin._getExpressRequest()).toBeNull();
    });

    it('should fall back to expressRequest property', () => {
      const plugin = new SessionPlugin();
      const expressReq = { session: {} };
      plugin.setController({
        getRequest: () => ({ expressRequest: expressReq }),
        getResponse: jest.fn(() => ({})),
        getServiceManager: jest.fn(() => ({ get: jest.fn() })),
        plugin: jest.fn()
      });
      expect(plugin._getExpressRequest()).toBe(expressReq);
    });
  });

  describe('start', () => {
    it('should start session and return this', () => {
      const plugin = new SessionPlugin();
      expect(plugin.start()).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });

    it('should start with expressReq when available', () => {
      const plugin = new SessionPlugin();
      const expressReq = { session: { data: {} } };
      plugin.setController({
        getRequest: () => ({ getExpressRequest: () => expressReq }),
        getResponse: jest.fn(() => ({})),
        getServiceManager: jest.fn(() => ({ get: jest.fn() })),
        plugin: jest.fn()
      });
      expect(plugin.start()).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });
  });

  describe('getNamespace auto-start', () => {
    it('should auto-start session when not started before getNamespace', () => {
      // Force session to not-started state
      Session._started = false;
      const plugin = new SessionPlugin();
      // getNamespace should auto-start (line 69)
      const ns = plugin.getNamespace('TestNS');
      expect(ns).toBeDefined();
      expect(Session.isStarted()).toBe(true);
    });
  });

  describe('set / get / has / remove', () => {
    it('should store and retrieve values', () => {
      const plugin = new SessionPlugin();
      plugin.set('key', 'value');
      expect(plugin.get('key')).toBe('value');
    });

    it('should return default for missing key', () => {
      const plugin = new SessionPlugin();
      expect(plugin.get('missing', 'def')).toBe('def');
    });

    it('should check key existence', () => {
      const plugin = new SessionPlugin();
      plugin.set('exists', true);
      expect(plugin.has('exists')).toBe(true);
      expect(plugin.has('nope')).toBe(false);
    });

    it('should remove key and return this', () => {
      const plugin = new SessionPlugin();
      plugin.set('key', 'val');
      expect(plugin.remove('key')).toBe(plugin);
      expect(plugin.has('key')).toBe(false);
    });

    it('set should return this', () => {
      const plugin = new SessionPlugin();
      expect(plugin.set('k', 'v')).toBe(plugin);
    });
  });

  describe('getNamespace', () => {
    it('should return namespace with default name', () => {
      const plugin = new SessionPlugin();
      const ns = plugin.getNamespace();
      expect(ns).toBeDefined();
      expect(typeof ns.set).toBe('function');
    });

    it('should return namespace with custom name', () => {
      const plugin = new SessionPlugin();
      const ns = plugin.getNamespace('Custom');
      expect(ns).toBeDefined();
    });
  });

  describe('getId / setId', () => {
    it('should get and set session ID', () => {
      const plugin = new SessionPlugin();
      plugin.setId('test-id-123');
      expect(plugin.getId()).toBe('test-id-123');
    });

    it('setId should return this', () => {
      const plugin = new SessionPlugin();
      expect(plugin.setId('id')).toBe(plugin);
    });
  });

  describe('regenerateId', () => {
    it('should regenerate and return this', () => {
      const plugin = new SessionPlugin();
      plugin.start();
      expect(plugin.regenerateId()).toBe(plugin);
    });
  });

  describe('destroy', () => {
    it('should destroy and return this', () => {
      const plugin = new SessionPlugin();
      plugin.start();
      expect(plugin.destroy()).toBe(plugin);
    });
  });

  describe('isStarted', () => {
    it('should reflect session state', () => {
      const plugin = new SessionPlugin();
      // Session may or may not be started from previous tests
      const before = plugin.isStarted();
      plugin.start();
      expect(plugin.isStarted()).toBe(true);
    });
  });

  describe('all', () => {
    it('should return all session data', () => {
      const plugin = new SessionPlugin();
      plugin.set('a', 1);
      const all = plugin.all();
      expect(all).toBeDefined();
    });
  });

  describe('writeClose', () => {
    it('should close and return this', () => {
      const plugin = new SessionPlugin();
      plugin.start();
      expect(plugin.writeClose()).toBe(plugin);
    });
  });

  describe('save', () => {
    it('should save and return this', async () => {
      const plugin = new SessionPlugin();
      plugin.start();
      const result = await plugin.save();
      expect(result).toBe(plugin);
    });
  });

  describe('auto-start branches (session not started)', () => {
    beforeEach(() => {
      Session._started = false;
      Session._namespaces = new Map();
      Session._sessionData = {};
      Session._currentRequest = null;
    });

    it('get should auto-start when session not started (line 79)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      const result = plugin.get('nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('set should auto-start when session not started (line 87)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      expect(plugin.set('key', 'value')).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });

    it('has should auto-start when session not started (line 93)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      expect(plugin.has('nonexistent')).toBe(false);
      expect(Session.isStarted()).toBe(true);
    });

    it('remove should auto-start when session not started (line 98)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      expect(plugin.remove('key')).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });

    it('save should auto-start when session not started (line 107)', async () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      const result = await plugin.save();
      expect(result).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });

    it('getId should auto-start when session not started (line 115)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      plugin.getId();
      expect(Session.isStarted()).toBe(true);
    });

    it('setId should auto-start when session not started (line 120)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      expect(plugin.setId('test-id')).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });

    it('regenerateId should auto-start when session not started (line 126)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      expect(plugin.regenerateId()).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });

    it('destroy should auto-start when session not started (line 132)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      expect(plugin.destroy()).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });

    it('all should auto-start when session not started (line 142)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      const result = plugin.all();
      expect(result).toBeDefined();
      expect(Session.isStarted()).toBe(true);
    });

    it('writeClose should auto-start when session not started (line 147)', () => {
      const plugin = new SessionPlugin();
      expect(Session.isStarted()).toBe(false);
      expect(plugin.writeClose()).toBe(plugin);
      expect(Session.isStarted()).toBe(true);
    });
  });

  describe('_getExpressRequest edge cases', () => {
    it('should return null when controller has no getRequest method (line 22)', () => {
      const plugin = new SessionPlugin();
      // Directly set controller to bypass validation
      plugin.controller = { noGetRequest: true };
      expect(plugin._getExpressRequest()).toBeNull();
    });
  });

  describe('convenience namespaces', () => {
    it('user() should return User namespace', () => {
      const plugin = new SessionPlugin();
      plugin.start();
      expect(plugin.user()).toBeDefined();
    });

    it('auth() should return Auth namespace', () => {
      const plugin = new SessionPlugin();
      plugin.start();
      expect(plugin.auth()).toBeDefined();
    });

    it('flash() should return FlashMessenger namespace', () => {
      const plugin = new SessionPlugin();
      plugin.start();
      expect(plugin.flash()).toBeDefined();
    });

    it('form() should return Form namespace', () => {
      const plugin = new SessionPlugin();
      plugin.start();
      expect(plugin.form()).toBeDefined();
    });
  });
});
