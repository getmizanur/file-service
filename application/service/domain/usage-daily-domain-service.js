// application/service/domain/usage-daily-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');

class UsageDailyService extends AbstractDomainService {
  constructor() {
    super();
  }

  /**
   * Get the current day as YYYY-MM-DD in Europe/London timezone.
   * @returns {string}
   */
  getLondonDay() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  }

  /**
   * Record a successful upload.
   * @param {string} tenantId
   * @param {number} sizeBytes
   */
  async recordUpload(tenantId, sizeBytes) {
    const table = this.getTable('UsageDailyTable');
    const day = this.getLondonDay();
    return table.recordUpload(tenantId, day, sizeBytes);
  }

  /**
   * Record a successful download / file serve.
   * @param {string} tenantId
   * @param {number} bytesServed
   */
  async recordDownload(tenantId, bytesServed) {
    const table = this.getTable('UsageDailyTable');
    const day = this.getLondonDay();
    return table.recordDownload(tenantId, day, bytesServed);
  }

  /**
   * Record a completed transform (thumbnail, transcode, etc.).
   * @param {string} tenantId
   */
  async recordTransform(tenantId) {
    const table = this.getTable('UsageDailyTable');
    const day = this.getLondonDay();
    return table.recordTransform(tenantId, day);
  }

  // ------------------------------------------------------------
  // Read helpers (delegate to table)
  // ------------------------------------------------------------

  async getByTenantAndDay(tenantId, day) {
    return this.getTable('UsageDailyTable').fetchByTenantAndDay(tenantId, day);
  }

  async getByTenantId(tenantId, options) {
    return this.getTable('UsageDailyTable').fetchByTenantId(tenantId, options);
  }

  async getByTenantAndDateRange(tenantId, fromDay, toDay) {
    return this.getTable('UsageDailyTable').fetchByTenantAndDateRange(tenantId, fromDay, toDay);
  }

  async getByTenantWithDetails(tenantId, options) {
    return this.getTable('UsageDailyTable').fetchByTenantWithDetails(tenantId, options);
  }

  async getAllByDayWithDetails(day) {
    return this.getTable('UsageDailyTable').fetchAllByDayWithDetails(day);
  }
}

module.exports = UsageDailyService;
