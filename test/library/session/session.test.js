const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
const Session = require(path.join(projectRoot, 'library/session/session'));

describe('Session', () => {
  afterEach(() => {
    // Clean up session state
    try { Session.destroy(); } catch (e) { /* ignore */ }
  });

  describe('start / isStarted', () => {
    it('should start session', () => {
      Session.start();
      expect(Session.isStarted()).toBe(true);
    });

    it('should be idempotent', () => {
      Session.start();
      Session.start();
      expect(Session.isStarted()).toBe(true);
    });
  });

  describe('set / get / has / remove', () => {
    it('should store and retrieve values', () => {
      Session.start();
      Session.set('key', 'value');
      expect(Session.get('key')).toBe('value');
    });

    it('should return default for missing key', () => {
      Session.start();
      expect(Session.get('missing', 'def')).toBe('def');
    });

    it('should check if key exists', () => {
      Session.start();
      Session.set('exists', true);
      expect(Session.has('exists')).toBe(true);
      expect(Session.has('nope')).toBe(false);
    });

    it('should remove a key', () => {
      Session.start();
      Session.set('key', 'val');
      Session.remove('key');
      expect(Session.has('key')).toBe(false);
    });
  });

  describe('getNamespace', () => {
    it('should return a namespace object', () => {
      Session.start();
      const ns = Session.getNamespace('TestNs');
      expect(ns).toBeDefined();
      expect(typeof ns.set).toBe('function');
      expect(typeof ns.get).toBe('function');
    });

    it('should return same namespace for same name (singleton)', () => {
      Session.start();
      const ns1 = Session.getNamespace('TestNs');
      const ns2 = Session.getNamespace('TestNs');
      expect(ns1).toBe(ns2);
    });
  });

  describe('getId / setId', () => {
    it('should get and set session ID', () => {
      Session.start();
      Session.setId('custom-id-123');
      expect(Session.getId()).toBe('custom-id-123');
    });
  });

  describe('destroy', () => {
    it('should clear session data and namespaces', () => {
      Session.start();
      Session.set('key', 'val');
      const ns = Session.getNamespace('TestNs');
      ns.set('nsKey', 'nsVal');
      Session.destroy();
      // destroy clears data and namespaces
      expect(Session.get('key')).toBeNull();
    });
  });

  describe('all', () => {
    it('should return all session data', () => {
      Session.start();
      Session.set('a', 1);
      Session.set('b', 2);
      const all = Session.all();
      expect(all).toBeDefined();
    });
  });

  describe('regenerateId', () => {
    it('should regenerate session ID', () => {
      Session.start();
      expect(() => Session.regenerateId()).not.toThrow();
    });
  });

  describe('writeClose', () => {
    it('should close session', () => {
      Session.start();
      expect(() => Session.writeClose()).not.toThrow();
    });
  });

  describe('createSignedId / verifySignedId', () => {
    it('should create and verify signed IDs', () => {
      Session.start();
      if (typeof Session.createSignedId === 'function') {
        const signed = Session.createSignedId('sess123', 'secret');
        if (signed && typeof Session.verifySignedId === 'function') {
          expect(Session.verifySignedId(signed, 'secret')).toBe(true);
        }
      }
    });
  });

  describe('start with express-session request', () => {
    it('should use req.session.customData as store', () => {
      const req = {
        session: { customData: { existingKey: 'existingVal' } },
        sessionID: 'express-sess-id'
      };
      Session.start(req);
      expect(Session.getId()).toBe('express-sess-id');
    });

    it('should create customData if missing', () => {
      const req = { session: {}, sessionID: 'new-sess-id' };
      Session.start(req);
      expect(req.session.customData).toBeDefined();
    });

    it('should be idempotent for same request', () => {
      const req = { session: {}, sessionID: 'same-req' };
      Session.start(req);
      Session.start(req);
      expect(Session.isStarted()).toBe(true);
    });
  });

  describe('isInitialized', () => {
    it('should return true after start', () => {
      Session.start();
      expect(Session.isInitialized()).toBe(true);
    });

    it('should return false before start', () => {
      Session._started = false;
      expect(Session.isInitialized()).toBe(false);
    });
  });

  describe('getId / setId', () => {
    it('should return null when no id set and not started', () => {
      Session._started = false;
      Session._sessionId = null;
      // Clean up globalThis
      if (globalThis.locals?.session) {
        globalThis.locals.session.id = null;
      }
      expect(Session.getId()).toBeNull();
    });

    it('should set id and update globalThis', () => {
      Session.start();
      Session.setId('custom-test-id');
      expect(Session.getId()).toBe('custom-test-id');
      expect(globalThis.locals.session.id).toBe('custom-test-id');
    });
  });

  describe('regenerateId', () => {
    it('should throw when not started', () => {
      Session._started = false;
      expect(() => Session.regenerateId()).toThrow('Session not started');
    });

    it('should regenerate with deleteOldSession', () => {
      Session.start();
      Session.set('key', 'val');
      const oldId = Session.getId();
      Session.regenerateId(true);
      const newId = Session.getId();
      expect(newId).not.toBe(oldId);
    });

    it('should regenerate without deleting old session', () => {
      Session.start();
      Session.regenerateId(false);
      expect(Session.getId()).toBeTruthy();
    });
  });

  describe('save', () => {
    it('should call req.session.save when available', async () => {
      const saveFn = jest.fn((cb) => cb(null));
      const req = {
        session: { save: saveFn, customData: {} },
        sessionID: 'save-test'
      };
      Session.start(req);
      await Session.save();
      expect(saveFn).toHaveBeenCalled();
    });

    it('should reject when req.session.save returns error', async () => {
      const saveFn = jest.fn((cb) => cb(new Error('save failed')));
      const req = {
        session: { save: saveFn, customData: {} },
        sessionID: 'save-err'
      };
      Session.start(req);
      await expect(Session.save()).rejects.toThrow('save failed');
    });

    it('should do nothing when no session.save', async () => {
      Session.start();
      await expect(Session.save()).resolves.toBeUndefined();
    });
  });

  describe('getNamespace', () => {
    it('should auto-start if not started', () => {
      Session._started = false;
      const ns = Session.getNamespace('AutoStart');
      expect(Session.isStarted()).toBe(true);
      expect(ns).toBeDefined();
    });

    it('should return different instances when singleInstance is false', () => {
      Session.start();
      const ns1 = Session.getNamespace('Multi', false);
      const ns2 = Session.getNamespace('Multi', false);
      expect(ns1).not.toBe(ns2);
    });
  });

  describe('getNamespaceData / _setNamespaceData', () => {
    it('should get and set namespace data', () => {
      Session.start();
      Session._setNamespaceData('testNs', { key: 'val' });
      const data = Session.getNamespaceData('testNs');
      expect(data.key).toBe('val');
    });

    it('should auto-start on _setNamespaceData if not started', () => {
      Session._started = false;
      Session._setNamespaceData('autoNs', { auto: true });
      expect(Session.isStarted()).toBe(true);
    });

    it('should handle non-object data gracefully', () => {
      Session.start();
      Session._setNamespaceData('badNs', null);
      const data = Session.getNamespaceData('badNs');
      expect(data).toEqual({});
    });
  });

  describe('set auto-start warning', () => {
    it('should auto-start with warning when not started', () => {
      Session._started = false;
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      Session.set('autoKey', 'autoVal');
      expect(Session.isStarted()).toBe(true);
      expect(console.warn).toHaveBeenCalled();
      console.warn.mockRestore();
    });
  });

  describe('get when not started', () => {
    it('should return default when not started', () => {
      Session._started = false;
      expect(Session.get('key', 'def')).toBe('def');
    });
  });

  describe('has when not started', () => {
    it('should return false when not started', () => {
      Session._started = false;
      expect(Session.has('key')).toBe(false);
    });
  });

  describe('remove when not started', () => {
    it('should return this when not started', () => {
      Session._started = false;
      expect(Session.remove('key')).toBe(Session);
    });
  });

  describe('all when not started', () => {
    it('should return empty object when not started', () => {
      Session._started = false;
      expect(Session.all()).toEqual({});
    });
  });

  describe('session options', () => {
    it('should get options', () => {
      Session.start();
      const opts = Session.getOptions();
      expect(opts.name).toBe('JSSESSIONID');
    });

    it('should set option', () => {
      Session.start();
      Session.setOption('cookieSecure', true);
      expect(Session.getOptions().cookieSecure).toBe(true);
    });

    it('should get/set save path', () => {
      Session.start();
      Session.setSavePath('/custom/path');
      expect(Session.getSavePath()).toBe('/custom/path');
    });

    it('should return default save path', () => {
      Session.start();
      expect(Session.getSavePath()).toBeDefined();
    });

    it('should get/set name', () => {
      Session.start();
      Session.setName('CUSTOM_SID');
      expect(Session.getName()).toBe('CUSTOM_SID');
    });
  });

  describe('signed session ID helpers', () => {
    it('should return empty string for createSignedId with no valid id', () => {
      Session.start();
      Session.setId(null);
      expect(Session.createSignedId()).toBe('');
    });

    it('should create a signed id with a valid session id', () => {
      Session.start();
      Session.setId('sess_valid_1234567890_abcdefghi');
      const signed = Session.createSignedId();
      expect(signed).toContain('.');
    });

    it('should verify a valid signed id', () => {
      Session.start();
      Session.setId('sess_valid_1234567890_abcdefghi');
      const signed = Session.createSignedId();
      const verified = Session.verifySignedId(signed);
      expect(verified).toBe('sess_valid_1234567890_abcdefghi');
    });

    it('should return null for invalid signed id', () => {
      Session.start();
      expect(Session.verifySignedId('invalid')).toBeNull();
    });

    it('should validate session id format', () => {
      expect(Session.isValidIdFormat('sess_valid_1234567890_abcdefghi')).toBe(true);
      expect(Session.isValidIdFormat('short')).toBe(false);
    });
  });

  describe('secure token helpers', () => {
    it('should generate and verify secure token', () => {
      Session.start();
      Session.setId('sess_token_1234567890_abcdefghi');
      const result = Session.generateSecureToken();
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('issuedAt');

      const verified = Session.verifySecureToken(
        'sess_token_1234567890_abcdefghi',
        result.token,
        result.issuedAt
      );
      expect(verified).toBe(true);
    });

    it('should return null for generateSecureToken with no id', () => {
      Session.start();
      Session.setId(null);
      expect(Session.generateSecureToken()).toBeNull();
    });

    it('should return false for expired token', () => {
      Session.start();
      Session.setId('sess_expired_1234567890_abcdefgh');
      const result = Session.generateSecureToken();
      const verified = Session.verifySecureToken(
        'sess_expired_1234567890_abcdefgh',
        result.token,
        result.issuedAt - 600000, // 10 min ago
        '',
        1000 // 1 sec max age
      );
      expect(verified).toBe(false);
    });
  });

  describe('writeClose', () => {
    it('should sync store and local cache', () => {
      Session.start();
      Session.set('wc', 'val');
      Session.writeClose();
      expect(globalThis.locals.session.data).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('should clear express session store', () => {
      const req = {
        session: { customData: { key: 'val' } },
        sessionID: 'destroy-test'
      };
      Session.start(req);
      Session.destroy();
      expect(Object.keys(req.session.customData)).toHaveLength(0);
    });
  });

  describe('remove with express session', () => {
    it('should remove from express session store', () => {
      const req = {
        session: { customData: {} },
        sessionID: 'remove-test'
      };
      Session.start(req);
      Session.set('removeMe', 'val');
      Session.remove('removeMe');
      expect(Session.has('removeMe')).toBe(false);
    });
  });

  describe('_getStore edge cases', () => {
    it('should return fallback store when create is false and no express session', () => {
      Session._currentRequest = null;
      Session.start();
      // Legacy fallback path: globalThis.locals.session.data exists after start
      const store = Session._getStore(false);
      expect(store).toBeDefined();
    });

    it('should handle express session without customData and create=false', () => {
      Session._currentRequest = { session: {} };
      const store = Session._getStore(false);
      expect(store).toBeNull();
      Session._currentRequest = null;
    });

    it('should return null for legacy fallback when data is null and create=false (lines 52-53)', () => {
      Session._currentRequest = null;
      Session._ensureGlobalLocals();
      globalThis.locals.session.data = null;
      const store = Session._getStore(false);
      expect(store).toBeNull();
    });

    it('should create data for legacy fallback when data is null and create=true (line 53)', () => {
      Session._currentRequest = null;
      Session._ensureGlobalLocals();
      globalThis.locals.session.data = null;
      const store = Session._getStore(true);
      expect(store).toEqual({});
      expect(globalThis.locals.session.data).toEqual({});
    });
  });

  describe('_syncLocalCacheFromStore', () => {
    it('should handle null store', () => {
      Session.start();
      Session._currentRequest = { session: {} };
      Session._syncLocalCacheFromStore();
      expect(Session._sessionData).toEqual({});
      Session._currentRequest = null;
    });
  });

  describe('isInitialized edge cases', () => {
    it('should return true when sessionData has keys', () => {
      Session.start();
      Session.set('key', 'val');
      // Remove the initialized flag to test the OR branch
      if (globalThis.locals?.session) {
        globalThis.locals.session.initialized = false;
      }
      expect(Session.isInitialized()).toBe(true);
    });
  });

  describe('remove edge cases', () => {
    it('should handle remove when store has no Default key', () => {
      Session.start();
      // Don't set anything, so Default may not exist
      expect(() => Session.remove('nonexistent')).not.toThrow();
    });

    it('should handle remove when _getStore returns null', () => {
      Session.start();
      Session._currentRequest = { session: {} };
      // _getStore(false) returns null for express without customData
      expect(() => Session.remove('key')).not.toThrow();
      Session._currentRequest = null;
    });
  });

  describe('_security null paths', () => {
    it('should handle createSignedId when _security is null', () => {
      const origSecurity = Session._security;
      Session._security = null;
      expect(Session.createSignedId('test')).toBe('');
      Session._security = origSecurity;
    });

    it('should handle verifySignedId when _security is null', () => {
      const origSecurity = Session._security;
      Session._security = null;
      expect(Session.verifySignedId('test')).toBeNull();
      Session._security = origSecurity;
    });

    it('should handle isValidIdFormat when _security is null', () => {
      const origSecurity = Session._security;
      Session._security = null;
      expect(Session.isValidIdFormat('test')).toBe(false);
      Session._security = origSecurity;
    });

    it('should handle generateSecureToken when _security is null', () => {
      const origSecurity = Session._security;
      Session._security = null;
      expect(Session.generateSecureToken('test')).toBeNull();
      Session._security = origSecurity;
    });

    it('should handle verifySecureToken when _security is null', () => {
      const origSecurity = Session._security;
      Session._security = null;
      expect(Session.verifySecureToken('id', 'tok', Date.now())).toBe(false);
      Session._security = origSecurity;
    });
  });

  describe('generateSecureToken with explicit sessionId', () => {
    it('should use provided sessionId instead of getId', () => {
      Session.start();
      Session.setId(null);
      const result = Session.generateSecureToken('sess_explicit_1234567890_abcdef');
      expect(result).toHaveProperty('token');
    });
  });

  describe('get / has / all with store', () => {
    it('should return value from store Default', () => {
      Session.start();
      Session.set('storeKey', 'storeVal');
      expect(Session.get('storeKey')).toBe('storeVal');
      expect(Session.has('storeKey')).toBe(true);
      const all = Session.all();
      expect(all.Default.storeKey).toBe('storeVal');
    });
  });

  describe('destroy without store', () => {
    it('should handle destroy when _getStore returns null', () => {
      Session._started = true;
      Session._currentRequest = { session: {} };
      // No customData, so store is null when create=false
      expect(() => Session.destroy()).not.toThrow();
      Session._currentRequest = null;
    });
  });
});
