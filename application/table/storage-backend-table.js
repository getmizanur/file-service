const TableGateway = require('../../library/db/table-gateway');
const StorageBackendEntity = require('../entity/storage-backend-entity');
class StorageBackendTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'storage_backend',
      adapter,
      primaryKey: 'backend_id',
      entityFactory: row => new StorageBackendEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return StorageBackendEntity.columns();
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
      .order('is_default_write', 'DESC') // Default backend first
      .order('provider', 'ASC');
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = StorageBackendTable;
