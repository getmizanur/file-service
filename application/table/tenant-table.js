const TableGateway = require('../../library/db/table-gateway');
const TenantEntity = require('../entity/tenant-entity');
class TenantTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'tenant',
      adapter,
      primaryKey: 'tenant_id',
      entityFactory: row => new TenantEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return TenantEntity.columns();
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
  async fetchBySlug(slug) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('slug = ?', slug)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async fetchAll({ status = null, limit = null, offset = null } = {}) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .order('created_dt', 'DESC');
    if (status) query.where('status = ?', status);
    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = TenantTable;
