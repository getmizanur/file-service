const TableGateway = require('../../library/db/table-gateway');
const TagEntity = require('../entity/tag-entity');
class TagTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'tag',
      adapter,
      primaryKey: 'tag_id',
      entityFactory: row => new TagEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return TagEntity.columns();
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
module.exports = TagTable;
