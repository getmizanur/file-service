const TableGateway = require('../../library/db/table-gateway');
const AppUserEntity = require('../entity/app-user-entity');
class AppUserTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'app_user',
      adapter,
      primaryKey: 'user_id',
      entityFactory: row => new AppUserEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return AppUserEntity.columns();
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
  async fetchByEmail(email) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('email = ?', email)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
module.exports = AppUserTable;
