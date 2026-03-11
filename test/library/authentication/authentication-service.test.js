const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const AuthenticationService = require(path.join(projectRoot, 'library/authentication/authentication-service'));

describe('AuthenticationService', () => {

  let mockStorage;
  let mockAdapter;

  beforeEach(() => {
    mockStorage = {
      isEmpty: jest.fn().mockReturnValue(true),
      read: jest.fn().mockReturnValue(null),
      write: jest.fn(),
      clear: jest.fn()
    };

    mockAdapter = {
      authenticate: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should initialize with no arguments', () => {
      const service = new AuthenticationService();
      expect(service.adapter).toBeNull();
      expect(service.storage).toBeNull();
    });

    it('should set storage and adapter when provided', () => {
      const service = new AuthenticationService(mockStorage, mockAdapter);
      expect(service.getStorage()).toBe(mockStorage);
      expect(service.getAdapter()).toBe(mockAdapter);
    });

    it('should merge options with defaults', () => {
      const service = new AuthenticationService(null, null, { debug: true });
      expect(service.options.debug).toBe(true);
      expect(service.options.persistAfterWrite).toBe(false);
    });
  });

  describe('getStorage', () => {
    it('should throw when no storage is set', () => {
      const service = new AuthenticationService();
      expect(() => service.getStorage()).toThrow('No storage adapter has been set');
    });

    it('should return storage after setStorage', () => {
      const service = new AuthenticationService();
      service.setStorage(mockStorage);
      expect(service.getStorage()).toBe(mockStorage);
    });
  });

  describe('setStorage', () => {
    it('should return this for chaining', () => {
      const service = new AuthenticationService();
      const returned = service.setStorage(mockStorage);
      expect(returned).toBe(service);
    });
  });

  describe('setAdapter / getAdapter', () => {
    it('should return null when no adapter is set', () => {
      const service = new AuthenticationService();
      expect(service.getAdapter()).toBeNull();
    });

    it('should return adapter after setAdapter', () => {
      const service = new AuthenticationService();
      service.setAdapter(mockAdapter);
      expect(service.getAdapter()).toBe(mockAdapter);
    });

    it('should return this for chaining', () => {
      const service = new AuthenticationService();
      const returned = service.setAdapter(mockAdapter);
      expect(returned).toBe(service);
    });
  });

  describe('authenticate', () => {
    it('should store identity when result is valid', async () => {
      const mockResult = {
        isValid: () => true,
        getIdentity: () => 'user1'
      };
      mockAdapter.authenticate.mockResolvedValue(mockResult);

      const service = new AuthenticationService(mockStorage, mockAdapter);
      const result = await service.authenticate();

      expect(result).toBe(mockResult);
      expect(mockStorage.write).toHaveBeenCalledWith('user1');
    });

    it('should not store identity when result is invalid', async () => {
      const mockResult = {
        isValid: () => false,
        getIdentity: () => null
      };
      mockAdapter.authenticate.mockResolvedValue(mockResult);

      const service = new AuthenticationService(mockStorage, mockAdapter);
      const result = await service.authenticate();

      expect(result).toBe(mockResult);
      expect(mockStorage.write).not.toHaveBeenCalled();
    });

    it('should throw when no adapter is available', async () => {
      const service = new AuthenticationService(mockStorage);
      await expect(service.authenticate()).rejects.toThrow(
        'An adapter must be set or passed prior to calling authenticate()'
      );
    });

    it('should accept an adapter argument', async () => {
      const mockResult = {
        isValid: () => true,
        getIdentity: () => 'user2'
      };
      const inlineAdapter = { authenticate: jest.fn().mockResolvedValue(mockResult) };

      const service = new AuthenticationService(mockStorage);
      const result = await service.authenticate(inlineAdapter);

      expect(result).toBe(mockResult);
      expect(inlineAdapter.authenticate).toHaveBeenCalled();
      expect(mockStorage.write).toHaveBeenCalledWith('user2');
    });

    it('should clear existing identity before setting new one', async () => {
      mockStorage.isEmpty.mockReturnValue(false);
      const mockResult = {
        isValid: () => true,
        getIdentity: () => 'newUser'
      };
      mockAdapter.authenticate.mockResolvedValue(mockResult);

      const service = new AuthenticationService(mockStorage, mockAdapter);
      await service.authenticate();

      expect(mockStorage.clear).toHaveBeenCalled();
      expect(mockStorage.write).toHaveBeenCalledWith('newUser');
    });
  });

  describe('hasIdentity', () => {
    it('should return false when storage is empty', () => {
      mockStorage.isEmpty.mockReturnValue(true);
      const service = new AuthenticationService(mockStorage);
      expect(service.hasIdentity()).toBe(false);
    });

    it('should return true when storage is not empty', () => {
      mockStorage.isEmpty.mockReturnValue(false);
      const service = new AuthenticationService(mockStorage);
      expect(service.hasIdentity()).toBe(true);
    });
  });

  describe('getIdentity', () => {
    it('should return null when storage is empty', () => {
      mockStorage.isEmpty.mockReturnValue(true);
      const service = new AuthenticationService(mockStorage);
      expect(service.getIdentity()).toBeNull();
    });

    it('should return identity from storage', () => {
      mockStorage.isEmpty.mockReturnValue(false);
      mockStorage.read.mockReturnValue('storedUser');
      const service = new AuthenticationService(mockStorage);
      expect(service.getIdentity()).toBe('storedUser');
    });
  });

  describe('_log', () => {
    it('should log when debug is enabled', () => {
      const service = new AuthenticationService(mockStorage, mockAdapter, { debug: true });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      service._log('test message');
      expect(spy).toHaveBeenCalledWith('[AuthenticationService]', 'test message');
      spy.mockRestore();
    });

    it('should not log when debug is disabled', () => {
      const service = new AuthenticationService(mockStorage, mockAdapter);
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      service._log('test message');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('authenticate with persistAfterWrite', () => {
    it('should call storage.save() after write when persistAfterWrite is true', async () => {
      mockStorage.save = jest.fn().mockResolvedValue(undefined);
      const mockResult = {
        isValid: () => true,
        getIdentity: () => 'user1'
      };
      mockAdapter.authenticate.mockResolvedValue(mockResult);

      const service = new AuthenticationService(mockStorage, mockAdapter, { persistAfterWrite: true });
      await service.authenticate();

      expect(mockStorage.write).toHaveBeenCalledWith('user1');
      expect(mockStorage.save).toHaveBeenCalled();
    });
  });

  describe('clearIdentity', () => {
    it('should call storage.clear()', async () => {
      const service = new AuthenticationService(mockStorage);
      await service.clearIdentity();
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it('should call storage.save() when persistAfterClear is true and save exists', async () => {
      mockStorage.save = jest.fn().mockResolvedValue(undefined);
      const service = new AuthenticationService(mockStorage, null, { persistAfterClear: true });
      await service.clearIdentity();
      expect(mockStorage.save).toHaveBeenCalled();
    });

    it('should not call storage.save() when persistAfterClear is false', async () => {
      mockStorage.save = jest.fn();
      const service = new AuthenticationService(mockStorage);
      await service.clearIdentity();
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });
});
