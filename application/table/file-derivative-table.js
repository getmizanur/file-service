// application/table/file-derivative-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const FileDerivativeEntity = require('../entity/file-derivative-entity');
const FileDerivativeDTO = require('../dto/file-derivative-dto');

class FileDerivativeTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'file_derivative',
      adapter,
      primaryKey: 'derivative_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new FileDerivativeEntity()
    });
  }

  baseColumns() {
    return FileDerivativeEntity.columns();
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

  async fetchById(derivativeId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, derivativeId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FileDerivativeEntity(rows[0]) : null;
  }

  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .order('created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new FileDerivativeEntity(r));
  }

  async fetchByFileIdAndKind(fileId, kind) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .where('kind = ?', kind)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FileDerivativeEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all derivatives for a file with source file and backend details.
   * Returns FileDerivativeDTO[]
   */
  async fetchByFileWithDetails(fileId) {
    const query = await this.getSelectQuery();

    query
      .from({ d: 'file_derivative' }, [])
      .columns({
        derivative_id: 'd.derivative_id',
        file_id: 'd.file_id',
        kind: 'd.kind',
        spec: 'd.spec',
        storage_backend_id: 'd.storage_backend_id',
        object_key: 'd.object_key',
        storage_uri: 'd.storage_uri',
        size_bytes: 'd.size_bytes',
        created_dt: 'd.created_dt',

        original_filename: 'fm.original_filename',

        backend_name: 'sb.name',
        backend_provider: 'sb.provider'
      })
      .joinLeft({ fm: 'file_metadata' }, 'fm.file_id = d.file_id')
      .joinLeft({ sb: 'storage_backend' }, 'sb.storage_backend_id = d.storage_backend_id')
      .where('d.file_id = ?', fileId)
      .order('d.created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FileDerivativeDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async insertDerivative(data) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        file_id: data.fileId,
        kind: data.kind,
        spec: data.spec ?? {},
        storage_backend_id: data.storageBackendId,
        object_key: data.objectKey,
        storage_uri: data.storageUri ?? null,
        size_bytes: data.sizeBytes ?? null,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new FileDerivativeEntity(result.insertedRecord);
  }

  async deleteById(derivativeId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where(`${this.primaryKey} = ?`, derivativeId);

    return del.execute();
  }

  async deleteByFileId(fileId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('file_id = ?', fileId);

    return del.execute();
  }
}

module.exports = FileDerivativeTable;
