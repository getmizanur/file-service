const TableGateway = require('../../library/db/table-gateway');
const FileEventEntity = require('../entity/file-event-entity');
class FileEventTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'file_event',
      adapter,
      primaryKey: 'event_id',
      entityFactory: row => new FileEventEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return FileEventEntity.columns();
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
      .order('created_dt', 'DESC');
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = FileEventTable;
