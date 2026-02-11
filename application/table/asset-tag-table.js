const TableGateway = require('../../library/db/table-gateway');
const AssetTagEntity = require('../entity/asset-tag-entity');
class AssetTagTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'asset_tag',
      adapter,
      primaryKey: ['file_id', 'tag_id'],
      entityFactory: row => new AssetTagEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return AssetTagEntity.columns();
  }
  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId);
    const result = await query.execute();
    return result.rows || result;
  }
  async fetchByTagId(tagId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tag_id = ?', tagId);
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = AssetTagTable;
