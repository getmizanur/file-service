const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const UserService = require(path.join(projectRoot, 'application/service/domain/user-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('UserService', () => {
  let service;
  let mockTable;

  beforeEach(() => {
    service = new UserService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.fetchByEmail = jest.fn().mockResolvedValue(null);
    mockTable.fetchById = jest.fn().mockResolvedValue(null);
    mockTable.fetchWithTenantByEmail = jest.fn().mockResolvedValue(null);
    const mockSm = { get: jest.fn().mockReturnValue(mockTable) };
    service.setServiceManager(mockSm);
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('getUserByEmail', () => {
    it('should delegate to table.fetchByEmail', async () => {
      const mockUser = { email: 'test@example.com' };
      mockTable.fetchByEmail.mockResolvedValue(mockUser);
      const result = await service.getUserByEmail('test@example.com');
      expect(result).toBe(mockUser);
      expect(mockTable.fetchByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('getUserById', () => {
    it('should delegate to table.fetchById', async () => {
      const mockUser = { user_id: 'u1' };
      mockTable.fetchById.mockResolvedValue(mockUser);
      const result = await service.getUserById('u1');
      expect(result).toBe(mockUser);
      expect(mockTable.fetchById).toHaveBeenCalledWith('u1');
    });
  });

  describe('getUserWithTenantByEmail', () => {
    it('should delegate to table.fetchWithTenantByEmail', async () => {
      const mockUser = { email: 'test@example.com', tenant_id: 't1' };
      mockTable.fetchWithTenantByEmail.mockResolvedValue(mockUser);
      const result = await service.getUserWithTenantByEmail('test@example.com');
      expect(result).toBe(mockUser);
      expect(mockTable.fetchWithTenantByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });
});
