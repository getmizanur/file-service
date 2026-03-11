const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileShareLinkService = require(path.join(projectRoot, 'application/service/domain/file-share-link-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));
const crypto = require('node:crypto');

describe('FileShareLinkService', () => {
  let service;
  let mockTable;

  beforeEach(() => {
    service = new FileShareLinkService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.create = jest.fn().mockResolvedValue({});
    mockTable.revoke = jest.fn().mockResolvedValue(true);
    mockTable.fetchById = jest.fn().mockResolvedValue(null);
    mockTable.fetchByToken = jest.fn().mockResolvedValue(null);
    mockTable.fetchByFileId = jest.fn().mockResolvedValue([]);
    mockTable.fetchActiveByFileId = jest.fn().mockResolvedValue(null);
    const mockSm = { get: jest.fn().mockReturnValue(mockTable) };
    service.setServiceManager(mockSm);
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('create', () => {
    it('should delegate to table.create', async () => {
      const data = { tenant_id: 't1', file_id: 'f1' };
      await service.create(data);
      expect(mockTable.create).toHaveBeenCalledWith(data);
    });
  });

  describe('revoke', () => {
    it('should delegate to table.revoke', async () => {
      await service.revoke('t1', 'f1');
      expect(mockTable.revoke).toHaveBeenCalledWith('t1', 'f1');
    });
  });

  describe('getById', () => {
    it('should delegate to table.fetchById', async () => {
      await service.getById('share-1');
      expect(mockTable.fetchById).toHaveBeenCalledWith('share-1');
    });
  });

  describe('getByToken', () => {
    it('should delegate to table.fetchByToken', async () => {
      await service.getByToken('hash123');
      expect(mockTable.fetchByToken).toHaveBeenCalledWith('hash123');
    });
  });

  describe('getByFileId', () => {
    it('should delegate to table.fetchByFileId', async () => {
      await service.getByFileId('f1');
      expect(mockTable.fetchByFileId).toHaveBeenCalledWith('f1');
    });
  });

  describe('getActiveByFileId', () => {
    it('should delegate to table.fetchActiveByFileId', async () => {
      await service.getActiveByFileId('f1');
      expect(mockTable.fetchActiveByFileId).toHaveBeenCalledWith('f1');
    });
  });

  describe('resolveToken', () => {
    it('should throw when link not found', async () => {
      mockTable.fetchByToken.mockResolvedValue(null);
      await expect(service.resolveToken('some-token')).rejects.toThrow('Link not found or invalid');
    });

    it('should throw when link is revoked', async () => {
      const tokenHash = crypto.createHash('sha256').update('valid-token').digest('hex');
      mockTable.fetchByToken.mockImplementation((hash) => {
        if (hash === tokenHash) return Promise.resolve({ revoked_dt: new Date() });
        return Promise.resolve(null);
      });
      await expect(service.resolveToken('valid-token')).rejects.toThrow('Link revoked');
    });

    it('should throw when link is expired', async () => {
      const tokenHash = crypto.createHash('sha256').update('valid-token').digest('hex');
      const pastDate = new Date(Date.now() - 86400000);
      mockTable.fetchByToken.mockImplementation((hash) => {
        if (hash === tokenHash) return Promise.resolve({ revoked_dt: null, expires_dt: pastDate });
        return Promise.resolve(null);
      });
      await expect(service.resolveToken('valid-token')).rejects.toThrow('Link expired');
    });

    it('should return share link when valid', async () => {
      const tokenHash = crypto.createHash('sha256').update('valid-token').digest('hex');
      const mockLink = { revoked_dt: null, expires_dt: null, file_id: 'f1' };
      mockTable.fetchByToken.mockImplementation((hash) => {
        if (hash === tokenHash) return Promise.resolve(mockLink);
        return Promise.resolve(null);
      });
      const result = await service.resolveToken('valid-token');
      expect(result).toBe(mockLink);
    });
  });
});
