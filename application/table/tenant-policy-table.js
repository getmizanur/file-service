const TableGateway = require('../../library/db/table-gateway');
const TenantPolicyEntity = require('../entity/tenant-policy-entity');
class TenantPolicyTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'tenant_policy',
      adapter,
      primaryKey: 'policy_id',
      entityFactory: row => new TenantPolicyEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return TenantPolicyEntity.columns();
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
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
module.exports = TenantPolicyTable;
