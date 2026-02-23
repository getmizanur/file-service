// application/table/asset-tag-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const AssetTagEntity = require('../entity/asset-tag-entity');
const AssetTagDTO = require('../dto/asset-tag-dto');

class AssetTagTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'asset_tag',
      adapter,
      primaryKey: ['file_id', 'tag_id'],
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new AssetTagEntity()
    });
  }

  baseColumns() {
    return AssetTagEntity.columns();
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

  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .order('created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new AssetTagEntity(r));
  }

  async fetchByTagId(tagId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tag_id = ?', tagId)
      .order('created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new AssetTagEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all tags for a file with tag details.
   * Returns AssetTagDTO[]
   */
  async fetchByFileWithTagDetails(fileId) {
    const query = await this.getSelectQuery();

    query
      .from({ at: 'asset_tag' }, [])
      .columns({
        file_id: 'at.file_id',
        tag_id: 'at.tag_id',
        created_dt: 'at.created_dt',

        tag_name: 't.name',
        tag_slug: 't.slug'
      })
      .joinLeft({ t: 'tag' }, 't.tag_id = at.tag_id')
      .where('at.file_id = ?', fileId)
      .order('t.name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new AssetTagDTO());
  }

  /**
   * Fetch all files for a tag with file details.
   * Returns AssetTagDTO[]
   */
  async fetchByTagWithFileDetails(tagId) {
    const query = await this.getSelectQuery();

    query
      .from({ at: 'asset_tag' }, [])
      .columns({
        file_id: 'at.file_id',
        tag_id: 'at.tag_id',
        created_dt: 'at.created_dt',

        tag_name: 't.name',
        tag_slug: 't.slug',
        original_filename: 'fm.original_filename'
      })
      .joinLeft({ t: 'tag' }, 't.tag_id = at.tag_id')
      .joinLeft({ fm: 'file_metadata' }, 'fm.file_id = at.file_id')
      .where('at.tag_id = ?', tagId)
      .order('at.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new AssetTagDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async addTag(fileId, tagId) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        file_id: fileId,
        tag_id: tagId,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new AssetTagEntity(result.insertedRecord);
  }

  async removeTag(fileId, tagId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('file_id = ?', fileId)
      .where('tag_id = ?', tagId);

    return del.execute();
  }

  async removeAllTagsFromFile(fileId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('file_id = ?', fileId);

    return del.execute();
  }
}

module.exports = AssetTagTable;
