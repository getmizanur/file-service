const TableGateway = require('../../library/db/table-gateway');
const CollectionAssetEntity = require('../entity/collection-asset-entity');
class CollectionAssetTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'collection_asset',
      adapter,
      primaryKey: ['collection_id', 'file_id'],
      entityFactory: row => new CollectionAssetEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return CollectionAssetEntity.columns();
  }
  async fetchByCollectionId(collectionId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('collection_id = ?', collectionId)
      .order('created_dt', 'DESC');
    const result = await query.execute();
    return result.rows || result;
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
module.exports = CollectionAssetTable;
