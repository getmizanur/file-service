const TableGateway = require('../../library/db/table-gateway');
const PasswordResetTokenEntity = require('../entity/password-reset-token-entity');
class PasswordResetTokenTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'password_reset_token',
      adapter,
      primaryKey: 'token_id',
      entityFactory: row => new PasswordResetTokenEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return PasswordResetTokenEntity.columns();
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
  async fetchByToken(token) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('token_hash = ?', token)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('user_id = ?', userId)
      .order('created_dt', 'DESC');
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = PasswordResetTokenTable;
