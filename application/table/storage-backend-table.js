const TableGateway = require('../../library/db/table-gateway');
const StorageBackendEntity = require('../entity/storage-backend-entity');
class StorageBackendTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'storage_backend',
      adapter,
      primaryKey: 'storage_backend_id',
      entityFactory: row => new StorageBackendEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return [
      'storage_backend_id', 'name', 'provider', 'delivery',
      'is_enabled', 'config', 'created_dt', 'updated_dt'
    ];
  }
  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);
    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.length > 0 ? rows[0] : null;
  }
  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('is_default_write', 'DESC') // Default backend first
      .order('provider', 'ASC');
    const rows = await query.execute();
    return rows;
  }

  async fetchAll() {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns());
    const rows = await query.execute();
    return rows;
  }
}
module.exports = StorageBackendTable;
