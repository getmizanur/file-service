const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderStarService = require(path.join(projectRoot, 'application/service/domain/folder-star-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('FolderStarService', () => {
  let service;
  let mockTable;
  let mockSm;
  let mockDbAdapter;

  beforeEach(() => {
    service = new FolderStarService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.add = jest.fn().mockResolvedValue(true);
    mockTable.remove = jest.fn().mockResolvedValue(true);
    mockTable.check = jest.fn().mockResolvedValue(false);
    mockTable.fetchWithFolderDetails = jest.fn().mockResolvedValue([]);

    mockDbAdapter = { query: jest.fn().mockResolvedValue({}) };

    const mockQueryCacheService = {
      onStarChanged: jest.fn().mockReturnValue(Promise.resolve())
    };

    mockSm = {
      get: jest.fn((name) => {
        if (name === 'FolderStarTable') return mockTable;
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

  describe('toggleStar', () => {
    it('should remove star when already starred', async () => {
      mockTable.check.mockResolvedValue(true);
      const result = await service.toggleStar('t1', 'fold1', 'u1');
      expect(result).toEqual({ starred: false });
      expect(mockTable.remove).toHaveBeenCalledWith('t1', 'fold1', 'u1');
    });

    it('should add star when not starred', async () => {
      mockTable.check.mockResolvedValue(false);
      const result = await service.toggleStar('t1', 'fold1', 'u1');
      expect(result).toEqual({ starred: true });
      expect(mockTable.add).toHaveBeenCalledWith('t1', 'fold1', 'u1');
    });

    it('should return starred true on unique constraint violation', async () => {
      mockTable.check.mockResolvedValue(false);
      mockTable.add.mockRejectedValue({ code: '23505' });
      const result = await service.toggleStar('t1', 'fold1', 'u1');
      expect(result).toEqual({ starred: true });
    });

    it('should rethrow non-unique errors', async () => {
      mockTable.check.mockResolvedValue(false);
      mockTable.add.mockRejectedValue(new Error('DB error'));
      await expect(service.toggleStar('t1', 'fold1', 'u1')).rejects.toThrow('DB error');
    });
  });

  describe('toggleStarByEmail', () => {
    it('should resolve user and toggle star', async () => {
      mockTable.check.mockResolvedValue(false);
      const result = await service.toggleStarByEmail('fold1', 'test@example.com');
      expect(result).toEqual({ starred: true });
    });

    it('should trigger cache invalidation after toggling', async () => {
      mockTable.check.mockResolvedValue(false);
      await service.toggleStarByEmail('fold1', 'test@example.com');
      const qcs = mockSm.get('QueryCacheService');
      expect(qcs.onStarChanged).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle unstar flow', async () => {
      mockTable.check.mockResolvedValue(true);
      const result = await service.toggleStarByEmail('fold1', 'test@example.com');
      expect(result).toEqual({ starred: false });
      expect(mockTable.remove).toHaveBeenCalled();
    });

    it('should delete suggestion cache entry after toggling', async () => {
      mockTable.check.mockResolvedValue(false);
      await service.toggleStarByEmail('fold1', 'test@example.com');
      expect(mockDbAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_suggestion_cache'),
        ['t1', 'u1', 'fold1']
      );
    });

    it('should silently handle cache invalidation failure', async () => {
      mockTable.check.mockResolvedValue(false);
      const mockQueryCacheService = {
        onStarChanged: jest.fn().mockReturnValue(Promise.reject(new Error('cache fail')))
      };
      mockSm.get = jest.fn((name) => {
        if (name === 'FolderStarTable') return mockTable;
        if (name === 'AppUserTable') return {
          resolveByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' })
        };
        if (name === 'QueryCacheService') return mockQueryCacheService;
        if (name === 'DbAdapter') return mockDbAdapter;
        return mockTable;
      });
      const result = await service.toggleStarByEmail('fold1', 'test@example.com');
      expect(result).toEqual({ starred: true });
      await new Promise(r => setTimeout(r, 10));
    });
  });

  describe('listStarred', () => {
    it('should delegate to table.fetchWithFolderDetails', async () => {
      const mockFolders = [{ folder_id: 'f1' }];
      mockTable.fetchWithFolderDetails.mockResolvedValue(mockFolders);
      const result = await service.listStarred('t1', 'u1');
      expect(result).toBe(mockFolders);
      expect(mockTable.fetchWithFolderDetails).toHaveBeenCalledWith('t1', 'u1');
    });
  });
});
