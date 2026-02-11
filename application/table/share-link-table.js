const TableGateway = require('../../library/db/table-gateway');
const ShareLinkEntity = require('../entity/share-link-entity');
class ShareLinkTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'share_link',
      adapter,
      primaryKey: 'share_id',
      entityFactory: row => new ShareLinkEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return ShareLinkEntity.columns();
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
  async fetchByToken(tokenHash) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('token_hash = ?', tokenHash)
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
module.exports = ShareLinkTable;
