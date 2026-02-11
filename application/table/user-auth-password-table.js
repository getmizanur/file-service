const TableGateway = require('../../library/db/table-gateway');
const UserAuthPasswordEntity = require('../entity/user-auth-password-entity');
class UserAuthPasswordTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'user_auth_password',
      adapter,
      primaryKey: 'auth_id',
      entityFactory: row => new UserAuthPasswordEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return UserAuthPasswordEntity.columns();
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
  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('user_id = ?', userId)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
module.exports = UserAuthPasswordTable;
