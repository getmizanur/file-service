const TableGateway = require('../../library/db/table-gateway');
const FileDerivativeEntity = require('../entity/file-derivative-entity');
class FileDerivativeTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'file_derivative',
      adapter,
      primaryKey: 'derivative_id',
      entityFactory: row => new FileDerivativeEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return FileDerivativeEntity.columns();
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
      .where('file_id = ?', fileId);
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = FileDerivativeTable;
