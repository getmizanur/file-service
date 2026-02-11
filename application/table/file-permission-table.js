const TableGateway = require('../../library/db/table-gateway');
const FilePermissionEntity = require('../entity/file-permission-entity');
class FilePermissionTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'file_permission',
      adapter,
      primaryKey: 'permission_id',
      entityFactory: row => new FilePermissionEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return FilePermissionEntity.columns();
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
  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .order('created_dt', 'ASC');
    const result = await query.execute();
    return result.rows || result;
  }
  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('user_id = ?', userId);
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = FilePermissionTable;
