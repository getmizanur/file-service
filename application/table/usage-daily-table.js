const TableGateway = require('../../library/db/table-gateway');
const UsageDailyEntity = require('../entity/usage-daily-entity');
class UsageDailyTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'usage_daily',
      adapter,
      primaryKey: 'usage_id',
      entityFactory: row => new UsageDailyEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return UsageDailyEntity.columns();
  }
  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async fetchByTenantAndDay(tenantId, day) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('day = ?', day)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async fetchByTenantId(tenantId, { limit = 30 } = {}) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('day', 'DESC')
      .limit(limit);
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = UsageDailyTable;
