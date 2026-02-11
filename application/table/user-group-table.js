const TableGateway = require('../../library/db/table-gateway');
const UserGroupEntity = require('../entity/user-group-entity');
class UserGroupTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'user_group',
      adapter,
      primaryKey: 'group_id',
      entityFactory: row => new UserGroupEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return UserGroupEntity.columns();
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
module.exports = UserGroupTable;
