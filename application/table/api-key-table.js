const TableGateway = require('../../library/db/table-gateway');
const ApiKeyEntity = require('../entity/api-key-entity');
class ApiKeyTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'api_key',
      adapter,
      primaryKey: 'key_id',
      entityFactory: row => new ApiKeyEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return ApiKeyEntity.columns();
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
  async fetchByPrefix(prefix) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('key_prefix = ?', prefix)
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
  async fetchByIntegrationId(integrationId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('integration_id = ?', integrationId);
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = ApiKeyTable;
