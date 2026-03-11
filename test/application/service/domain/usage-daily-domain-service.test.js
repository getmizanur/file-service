const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const UsageDailyService = require(path.join(projectRoot, 'application/service/domain/usage-daily-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('UsageDailyService', () => {
  let service;
  let mockTable;

  beforeEach(() => {
    service = new UsageDailyService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.recordUpload = jest.fn().mockResolvedValue(true);
    mockTable.recordDownload = jest.fn().mockResolvedValue(true);
    mockTable.recordTransform = jest.fn().mockResolvedValue(true);
    mockTable.fetchByTenantAndDay = jest.fn().mockResolvedValue(null);
    mockTable.fetchByTenantId = jest.fn().mockResolvedValue([]);
    mockTable.fetchByTenantAndDateRange = jest.fn().mockResolvedValue([]);
    mockTable.fetchByTenantWithDetails = jest.fn().mockResolvedValue([]);
    mockTable.fetchAllByDayWithDetails = jest.fn().mockResolvedValue([]);
    const mockSm = { get: jest.fn().mockReturnValue(mockTable) };
    service.setServiceManager(mockSm);
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('getLondonDay', () => {
    it('should return a date string in YYYY-MM-DD format', () => {
      const day = service.getLondonDay();
      expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('recordUpload', () => {
    it('should delegate to table.recordUpload with current day', async () => {
      await service.recordUpload('t1', 1024);
      expect(mockTable.recordUpload).toHaveBeenCalledWith('t1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 1024);
    });
  });

  describe('recordDownload', () => {
    it('should delegate to table.recordDownload with current day', async () => {
      await service.recordDownload('t1', 2048);
      expect(mockTable.recordDownload).toHaveBeenCalledWith('t1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 2048);
    });
  });

  describe('recordTransform', () => {
    it('should delegate to table.recordTransform with current day', async () => {
      await service.recordTransform('t1');
      expect(mockTable.recordTransform).toHaveBeenCalledWith('t1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    });
  });

  describe('getByTenantAndDay', () => {
    it('should delegate to table.fetchByTenantAndDay', async () => {
      await service.getByTenantAndDay('t1', '2025-01-01');
      expect(mockTable.fetchByTenantAndDay).toHaveBeenCalledWith('t1', '2025-01-01');
    });
  });

  describe('getByTenantId', () => {
    it('should delegate to table.fetchByTenantId', async () => {
      const options = { limit: 10 };
      await service.getByTenantId('t1', options);
      expect(mockTable.fetchByTenantId).toHaveBeenCalledWith('t1', options);
    });
  });

  describe('getByTenantAndDateRange', () => {
    it('should delegate to table.fetchByTenantAndDateRange', async () => {
      await service.getByTenantAndDateRange('t1', '2025-01-01', '2025-01-31');
      expect(mockTable.fetchByTenantAndDateRange).toHaveBeenCalledWith('t1', '2025-01-01', '2025-01-31');
    });
  });

  describe('getByTenantWithDetails', () => {
    it('should delegate to table.fetchByTenantWithDetails', async () => {
      await service.getByTenantWithDetails('t1', { limit: 10 });
      expect(mockTable.fetchByTenantWithDetails).toHaveBeenCalledWith('t1', { limit: 10 });
    });
  });

  describe('getAllByDayWithDetails', () => {
    it('should delegate to table.fetchAllByDayWithDetails', async () => {
      await service.getAllByDayWithDetails('2025-01-01');
      expect(mockTable.fetchAllByDayWithDetails).toHaveBeenCalledWith('2025-01-01');
    });
  });
});
