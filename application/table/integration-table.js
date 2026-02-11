const TableGateway = require('../../library/db/table-gateway');
const IntegrationEntity = require('../entity/integration-entity');
class IntegrationTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'integration',
      adapter,
      primaryKey: 'integration_id',
      entityFactory: row => new IntegrationEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return IntegrationEntity.columns();
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
      .order('name', 'ASC');
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = IntegrationTable;
