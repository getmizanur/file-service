const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const CollectionAssetEntity = require('../entity/collection-asset-entity');
const CollectionAssetDTO = require('../dto/collection-asset-dto');

class CollectionAssetTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'collection_asset',
      adapter,
      primaryKey: ['collection_id', 'file_id'],
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new CollectionAssetEntity()
    });
  }

  baseColumns() {
    return CollectionAssetEntity.columns();
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  _normalizeRows(result) {
    return (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
  }

  _hydrateToDtoArray(rows, dtoPrototype) {
    return new HydratingResultSet(this.hydrator, dtoPrototype)
      .initialize(rows)
      .toArray();
  }

  // ------------------------------------------------------------
  // Entity methods
  // ------------------------------------------------------------

  async fetchByCollectionId(collectionId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('collection_id = ?', collectionId)
      .order('created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new CollectionAssetEntity(r));
  }

  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .order('created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new CollectionAssetEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all files in a collection with file details.
   * Returns CollectionAssetDTO[]
   */
  async fetchByCollectionWithFileDetails(collectionId) {
    const query = await this.getSelectQuery();

    query
      .from({ ca: 'collection_asset' }, [])
      .columns({
        collection_id: 'ca.collection_id',
        file_id: 'ca.file_id',
        created_dt: 'ca.created_dt',

        original_filename: 'fm.original_filename',
        record_status: 'fm.record_status',
        mime_type: 'fm.mime_type',
        file_size: 'fm.file_size'
      })
      .joinLeft({ fm: 'file_metadata' }, 'fm.file_id = ca.file_id')
      .where('ca.collection_id = ?', collectionId)
      .order('ca.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new CollectionAssetDTO());
  }

  /**
   * Fetch all collections a file belongs to with collection details.
   * Returns CollectionAssetDTO[]
   */
  async fetchByFileWithCollectionDetails(fileId) {
    const query = await this.getSelectQuery();

    query
      .from({ ca: 'collection_asset' }, [])
      .columns({
        collection_id: 'ca.collection_id',
        file_id: 'ca.file_id',
        created_dt: 'ca.created_dt',

        collection_name: 'c.name'
      })
      .joinLeft({ c: 'collection' }, 'c.collection_id = ca.collection_id')
      .where('ca.file_id = ?', fileId)
      .order('c.name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new CollectionAssetDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async addAsset(collectionId, fileId) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        collection_id: collectionId,
        file_id: fileId,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new CollectionAssetEntity(result.insertedRecord);
  }

  async removeAsset(collectionId, fileId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('collection_id = ?', collectionId)
      .where('file_id = ?', fileId);

    return del.execute();
  }

  async removeAllAssetsFromCollection(collectionId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('collection_id = ?', collectionId);

    return del.execute();
  }
}

module.exports = CollectionAssetTable;
