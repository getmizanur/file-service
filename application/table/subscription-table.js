const TableGateway = require('../../library/db/table-gateway');
const SubscriptionEntity = require('../entity/subscription-entity');
class SubscriptionTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'subscription',
      adapter,
      primaryKey: 'subscription_id',
      entityFactory: row => new SubscriptionEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return SubscriptionEntity.columns();
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
  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('created_dt', 'DESC')
      .limit(1); // Usually want current subscription
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
module.exports = SubscriptionTable;
