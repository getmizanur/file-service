const TableGateway = require('../../library/db/table-gateway');
const IntegrationPolicyOverrideEntity = require('../entity/integration-policy-override-entity');
class IntegrationPolicyOverrideTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'integration_policy_override',
      adapter,
      primaryKey: 'override_id',
      entityFactory: row => new IntegrationPolicyOverrideEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return IntegrationPolicyOverrideEntity.columns();
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
  async fetchByTenantAndIntegration(tenantId, integrationId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('integration_id = ?', integrationId)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
module.exports = IntegrationPolicyOverrideTable;
