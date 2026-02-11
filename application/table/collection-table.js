const TableGateway = require('../../library/db/table-gateway');
const CollectionEntity = require('../entity/collection-entity');
class CollectionTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'collection',
      adapter,
      primaryKey: 'collection_id',
      entityFactory: row => new CollectionEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return CollectionEntity.columns();
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
  async fetchByTenantId(tenantId, { limit = null, offset = null } = {}) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('created_dt', 'DESC');
    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = CollectionTable;
