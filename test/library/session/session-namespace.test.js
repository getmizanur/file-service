const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
const SessionNamespace = require(path.join(projectRoot, 'library/session/session-namespace'));

describe('SessionNamespace', () => {
  let ns;

  beforeEach(() => {
    ns = new SessionNamespace('TestNs');
  });

  describe('constructor', () => {
    it('should create with name', () => {
      expect(ns).toBeDefined();
    });
  });

  describe('set / get / has / remove', () => {
    it('should set and get values', () => {
      ns.set('key', 'value');
      expect(ns.get('key')).toBe('value');
    });

    it('should return default for missing key', () => {
      expect(ns.get('missing', 'fallback')).toBe('fallback');
    });

    it('should check existence', () => {
      ns.set('exists', true);
      expect(ns.has('exists')).toBe(true);
      expect(ns.has('nope')).toBe(false);
    });

    it('should remove a key', () => {
      ns.set('key', 'val');
      ns.remove('key');
      expect(ns.has('key')).toBe(false);
    });
  });

  describe('getAll / clear', () => {
    it('should return all data', () => {
      ns.set('a', 1);
      ns.set('b', 2);
      const all = ns.getAll();
      expect(all.a).toBe(1);
      expect(all.b).toBe(2);
    });

    it('should clear all data', () => {
      ns.set('a', 1);
      ns.clear();
      const all = ns.getAll();
      expect(all.a).toBeUndefined();
    });
  });

  describe('lock / unlock', () => {
    it('should lock and unlock', () => {
      ns.lock();
      expect(ns.isLocked()).toBe(true);
      ns.unlock();
      expect(ns.isLocked()).toBe(false);
    });
  });

  describe('expiration', () => {
    it('should set expiration seconds', () => {
      ns.setExpirationSeconds(60);
      ns.set('key', 'val');
      expect(ns.get('key')).toBe('val');
    });

    it('should set expiration hops', () => {
      ns.setExpirationHops(3);
      ns.set('key', 'val');
      expect(ns.get('key')).toBe('val');
    });

    it('should return default when namespace is expired (get)', () => {
      ns.set('key', 'val');
      // Set expiry to the past
      ns._setExpiry(Date.now() - 1000);
      expect(ns.get('key', 'fallback')).toBe('fallback');
    });

    it('should return false when namespace is expired (has)', () => {
      ns.set('key', 'val');
      ns._setExpiry(Date.now() - 1000);
      expect(ns.has('key')).toBe(false);
    });

    it('should return empty object when namespace is expired (getAll)', () => {
      ns.set('key', 'val');
      ns._setExpiry(Date.now() - 1000);
      expect(ns.getAll()).toEqual({});
    });

    it('should clear expiration', () => {
      ns.setExpirationSeconds(60);
      ns.clearExpiration();
      expect(ns._getExpiry()).toBeNull();
    });
  });

  describe('getNamespace', () => {
    it('should return namespace name', () => {
      expect(ns.getNamespace()).toBe('TestNs');
    });
  });

  describe('lock / unlock behavior', () => {
    it('should throw on set when locked', () => {
      ns.lock();
      expect(() => ns.set('key', 'val')).toThrow('locked');
    });

    it('should throw on remove when locked', () => {
      ns.set('key', 'val');
      ns.lock();
      expect(() => ns.remove('key')).toThrow('locked');
    });

    it('should throw on clear when locked', () => {
      ns.set('key', 'val');
      ns.lock();
      expect(() => ns.clear()).toThrow('locked');
    });

    it('should allow operations after unlock', () => {
      ns.lock();
      ns.unlock();
      expect(() => ns.set('key', 'val')).not.toThrow();
    });
  });

  describe('reserved keys', () => {
    it('should throw when setting reserved key __locked', () => {
      expect(() => ns.set('__locked', true)).toThrow('reserved');
    });

    it('should throw when setting reserved key __expiry', () => {
      expect(() => ns.set('__expiry', 123)).toThrow('reserved');
    });

    it('should return default for reserved key on get', () => {
      expect(ns.get('__locked', 'def')).toBe('def');
    });

    it('should return false for reserved key on has', () => {
      expect(ns.has('__locked')).toBe(false);
    });

    it('should throw when removing reserved key', () => {
      expect(() => ns.remove('__locked')).toThrow('reserved');
    });
  });

  describe('with session instance', () => {
    it('should persist to session on set', () => {
      const mockSession = {
        getNamespaceData: jest.fn(() => ({})),
        _setNamespaceData: jest.fn()
      };
      const nsWithSession = new SessionNamespace('Test', mockSession);
      nsWithSession.set('key', 'val');
      expect(mockSession._setNamespaceData).toHaveBeenCalledWith('Test', expect.objectContaining({ key: 'val' }));
    });

    it('should refresh from session on get', () => {
      const mockSession = {
        getNamespaceData: jest.fn(() => ({ key: 'from-session' })),
        _setNamespaceData: jest.fn()
      };
      const nsWithSession = new SessionNamespace('Test', mockSession);
      expect(nsWithSession.get('key')).toBe('from-session');
    });
  });

  describe('getAll with meta', () => {
    it('should include meta when includeMeta is true', () => {
      ns.lock();
      const all = ns.getAll(true);
      expect(all.__locked).toBe(true);
    });

    it('should exclude meta by default', () => {
      ns.lock();
      const all = ns.getAll();
      expect(all.__locked).toBeUndefined();
    });
  });

  describe('getKeys', () => {
    it('should return keys excluding meta', () => {
      ns.set('a', 1);
      ns.set('b', 2);
      const keys = ns.getKeys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).not.toContain('__locked');
    });

    it('should return keys including meta when requested', () => {
      ns.set('a', 1);
      ns.lock();
      const keys = ns.getKeys(true);
      expect(keys).toContain('__locked');
    });
  });

  describe('iterator', () => {
    it('should iterate over entries', () => {
      ns.set('x', 10);
      ns.set('y', 20);
      const entries = [];
      for (const [key, value] of ns) {
        entries.push([key, value]);
      }
      expect(entries).toContainEqual(['x', 10]);
      expect(entries).toContainEqual(['y', 20]);
    });
  });

  describe('save', () => {
    it('should call session.save when available', async () => {
      const mockSession = {
        getNamespaceData: jest.fn(() => ({})),
        _setNamespaceData: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined)
      };
      const nsWithSession = new SessionNamespace('Test', mockSession);
      await nsWithSession.save();
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should do nothing when no session', async () => {
      await expect(ns.save()).resolves.toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      ns.set('key', 'val');
      ns.setExpirationSeconds(60);
      const json = ns.toJSON();
      expect(json.namespace).toBe('TestNs');
      expect(json.data.key).toBe('val');
      expect(json.locked).toBe(false);
      expect(json.expiry).toBeGreaterThan(0);
    });
  });

  describe('magic methods', () => {
    it('__get should delegate to get', () => {
      ns.set('key', 'val');
      expect(ns.__get('key')).toBe('val');
    });

    it('__set should delegate to set', () => {
      ns.__set('key', 'val');
      expect(ns.get('key')).toBe('val');
    });

    it('__isset should delegate to has', () => {
      ns.set('key', 'val');
      expect(ns.__isset('key')).toBe(true);
    });

    it('__unset should delegate to remove', () => {
      ns.set('key', 'val');
      ns.__unset('key');
      expect(ns.has('key')).toBe(false);
    });
  });

  describe('remove non-existent key', () => {
    it('should not throw when removing non-existent key', () => {
      expect(() => ns.remove('nonexistent')).not.toThrow();
    });
  });

  describe('_refreshFromSession edge cases', () => {
    it('should handle session returning non-object data', () => {
      const mockSession = {
        getNamespaceData: jest.fn(() => null),
        _setNamespaceData: jest.fn()
      };
      const nsWithSession = new SessionNamespace('Test', mockSession);
      expect(nsWithSession._data).toEqual({});
    });

    it('should keep in-memory data when no session instance', () => {
      const nsNoSession = new SessionNamespace('NoSession', null);
      nsNoSession._data = { existing: 'data' };
      nsNoSession._refreshFromSession();
      expect(nsNoSession._data.existing).toBe('data');
    });

    it('should handle corrupted _data during fallback refresh', () => {
      const nsNoSession = new SessionNamespace('NoSession', null);
      nsNoSession._data = null;
      nsNoSession._refreshFromSession();
      expect(nsNoSession._data).toEqual({});
    });
  });

  describe('_persistToSession edge cases', () => {
    it('should not throw when session has no _setNamespaceData', () => {
      const mockSession = {
        getNamespaceData: jest.fn(() => ({})),
      };
      const nsWithSession = new SessionNamespace('Test', mockSession);
      expect(() => nsWithSession._persistToSession()).not.toThrow();
    });
  });

  describe('_clearInternal', () => {
    it('should bypass lock when bypassLock is true', () => {
      ns.set('key', 'val');
      ns.lock();
      // _clearInternal with bypassLock=true should not throw
      ns._clearInternal(true);
      ns.unlock();
      expect(ns.getAll()).toEqual({});
    });

    it('should throw when locked and bypassLock is false', () => {
      ns.lock();
      expect(() => ns._clearInternal(false)).toThrow('locked');
      ns.unlock();
    });
  });

  describe('_isExpired clearing behavior', () => {
    it('should clear data when expired', () => {
      ns.set('key', 'val');
      ns._setExpiry(Date.now() - 1000);
      expect(ns._isExpired()).toBe(true);
      // After expiry check, data should be cleared
      expect(ns._data).toEqual({});
    });

    it('should not clear when not expired', () => {
      ns.set('key', 'val');
      ns._setExpiry(Date.now() + 60000);
      expect(ns._isExpired()).toBe(false);
      expect(ns._data.key).toBe('val');
    });
  });

  describe('_setExpiry', () => {
    it('should delete expiry when set to null', () => {
      ns._setExpiry(12345);
      expect(ns._getExpiry()).toBe(12345);
      ns._setExpiry(null);
      expect(ns._getExpiry()).toBeNull();
    });

    it('should return null for non-numeric expiry', () => {
      ns._data[ns._META_EXPIRY] = 'not-a-number';
      expect(ns._getExpiry()).toBeNull();
    });
  });

  describe('_isReservedKey', () => {
    it('should identify __locked as reserved', () => {
      expect(ns._isReservedKey('__locked')).toBe(true);
    });

    it('should identify __expiry as reserved', () => {
      expect(ns._isReservedKey('__expiry')).toBe(true);
    });

    it('should not identify normal keys as reserved', () => {
      expect(ns._isReservedKey('normalKey')).toBe(false);
    });
  });

  describe('remove with persist', () => {
    it('should persist to session after remove', () => {
      const mockSession = {
        getNamespaceData: jest.fn(() => ({ key: 'val' })),
        _setNamespaceData: jest.fn()
      };
      const nsWithSession = new SessionNamespace('Test', mockSession);
      nsWithSession.remove('key');
      expect(mockSession._setNamespaceData).toHaveBeenCalled();
    });
  });

  describe('setExpirationHops', () => {
    it('should calculate correct expiry from hops and hopSeconds', () => {
      const before = Date.now();
      ns.setExpirationHops(2, 100);
      const expiry = ns._getExpiry();
      // 2 hops * 100 seconds = 200 seconds = 200000ms
      expect(expiry).toBeGreaterThanOrEqual(before + 200000);
    });
  });

  describe('iterator with empty data', () => {
    it('should return done immediately for empty namespace', () => {
      const iter = ns[Symbol.iterator]();
      const result = iter.next();
      expect(result.done).toBe(true);
    });
  });
});
