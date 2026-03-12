const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileStarService = require(path.join(projectRoot, 'application/service/domain/file-star-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('FileStarService', () => {
  let service;
  let mockTable;
  let mockSm;
  let mockDbAdapter;

  beforeEach(() => {
    service = new FileStarService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.add = jest.fn().mockResolvedValue(true);
    mockTable.remove = jest.fn().mockResolvedValue(true);
    mockTable.check = jest.fn().mockResolvedValue(false);
    mockTable.fetchByUser = jest.fn().mockResolvedValue([]);

    mockDbAdapter = { query: jest.fn().mockResolvedValue({}) };

    const mockQueryCacheService = {
      onStarChanged: jest.fn().mockReturnValue(Promise.resolve())
    };

    mockSm = {
      get: jest.fn((name) => {
        if (name === 'FileStarTable') return mockTable;
        if (name === 'AppUserTable') return {
          resolveByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' })
        };
        if (name === 'QueryCacheService') return mockQueryCacheService;
        if (name === 'DbAdapter') return mockDbAdapter;
        return mockTable;
      })
    };
    service.setServiceManager(mockSm);
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('_resolveUser', () => {
    it('should resolve user by email via AppUserTable', async () => {
      const result = await service._resolveUser('test@example.com');
      expect(result).toEqual({ user_id: 'u1', tenant_id: 't1' });
    });
  });

  describe('starFile', () => {
    it('should add star and return true', async () => {
      const result = await service.starFile('f1', 'test@example.com');
      expect(result).toBe(true);
      expect(mockTable.add).toHaveBeenCalledWith('t1', 'f1', 'u1');
    });

    it('should return true on unique constraint violation', async () => {
      mockTable.add.mockRejectedValue({ message: 'unique constraint', code: '23505' });
      const result = await service.starFile('f1', 'test@example.com');
      expect(result).toBe(true);
    });

    it('should re-throw non-unique errors', async () => {
      mockTable.add.mockRejectedValue(new Error('connection lost'));
      await expect(service.starFile('f1', 'test@example.com')).rejects.toThrow('connection lost');
    });
  });

  describe('toggleStar', () => {
    it('should remove star when already starred', async () => {
      mockTable.check.mockResolvedValue(true);
      const result = await service.toggleStar('f1', 'test@example.com');
      expect(result).toBe(false);
      expect(mockTable.remove).toHaveBeenCalled();
    });

    it('should add star when not starred', async () => {
      mockTable.check.mockResolvedValue(false);
      const result = await service.toggleStar('f1', 'test@example.com');
      expect(result).toBe(true);
      expect(mockTable.add).toHaveBeenCalled();
    });

    it('should trigger cache invalidation', async () => {
      mockTable.check.mockResolvedValue(false);
      await service.toggleStar('f1', 'test@example.com');
      const qcs = mockSm.get('QueryCacheService');
      expect(qcs.onStarChanged).toHaveBeenCalledWith('test@example.com');
    });

    it('should delete suggestion cache entry after toggling', async () => {
      mockTable.check.mockResolvedValue(false);
      await service.toggleStar('f1', 'test@example.com');
      expect(mockDbAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_suggestion_cache'),
        ['t1', 'u1', 'f1']
      );
    });

    it('should silently handle cache invalidation failure', async () => {
      mockTable.check.mockResolvedValue(false);
      const mockQueryCacheService = {
        onStarChanged: jest.fn().mockReturnValue(Promise.reject(new Error('cache fail')))
      };
      mockSm.get = jest.fn((name) => {
        if (name === 'FileStarTable') return mockTable;
        if (name === 'AppUserTable') return {
          resolveByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' })
        };
        if (name === 'QueryCacheService') return mockQueryCacheService;
        if (name === 'DbAdapter') return mockDbAdapter;
        return mockTable;
      });
      // Should not throw - the .catch(() => {}) swallows the rejection
      const result = await service.toggleStar('f1', 'test@example.com');
      expect(result).toBe(true);
      // Give the rejected promise time to settle
      await new Promise(r => setTimeout(r, 10));
    });
  });

  describe('isStarred', () => {
    it('should delegate to table.check', async () => {
      mockTable.check.mockResolvedValue(true);
      const result = await service.isStarred('f1', 'test@example.com');
      expect(result).toBe(true);
    });
  });

  describe('getStarredFiles', () => {
    it('should delegate to table.fetchByUser', async () => {
      const mockFiles = [{ file_id: 'f1' }];
      mockTable.fetchByUser.mockResolvedValue(mockFiles);
      const result = await service.getStarredFiles('test@example.com');
      expect(result).toBe(mockFiles);
    });
  });
});
