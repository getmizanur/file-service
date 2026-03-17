// application/table/file-derivative-table.js
const TableGateway = require(globalThis.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(globalThis.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(globalThis.applicationPath('/library/db/result-set/hydrating-result-set'));
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
    const Select = require(globalThis.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  _normalizeRows(result) {
    if (result?.rows) return result.rows;
    return Array.isArray(result) ? result : [];
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
        status: 'd.status',
        error_detail: 'd.error_detail',
        attempts: 'd.attempts',
        last_attempt_dt: 'd.last_attempt_dt',
        ready_dt: 'd.ready_dt',
        processing_started_dt: 'd.processing_started_dt',
        updated_dt: 'd.updated_dt',

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
    const Insert = require(globalThis.applicationPath('/library/db/sql/insert'));

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
        created_dt: new Date(),
        status: data.status ?? 'pending',
        error_detail: data.errorDetail ?? null,
        attempts: data.attempts ?? 0,
        last_attempt_dt: data.lastAttemptDt ?? null,
        ready_dt: data.readyDt ?? null,
        processing_started_dt: data.processingStartedDt ?? null,
        updated_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result?.success || !result.insertedRecord) return null;

    return new FileDerivativeEntity(result.insertedRecord);
  }

  async upsertDerivative(data) {
    const Insert = require(globalThis.applicationPath('/library/db/sql/insert'));

    const specJson = typeof data.spec === 'string' ? data.spec : JSON.stringify(data.spec);

    let manifestJson = null;
    if (data.manifest != null) {
      manifestJson = typeof data.manifest === 'string' ? data.manifest : JSON.stringify(data.manifest);
    }

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        file_id: data.fileId,
        kind: data.kind,
        spec: specJson,
        storage_backend_id: data.storageBackendId,
        object_key: data.objectKey,
        storage_uri: data.storageUri ?? null,
        size_bytes: data.sizeBytes ?? null,
        manifest: manifestJson,
        created_dt: new Date(),
        status: data.status ?? 'pending',
        error_detail: data.errorDetail ?? null,
        attempts: data.attempts ?? 1,
        last_attempt_dt: data.lastAttemptDt ?? new Date(),
        ready_dt: data.readyDt ?? null,
        processing_started_dt: data.processingStartedDt ?? null,
        updated_dt: new Date()
      })
      .onConflict('UPDATE', {
        object_key: Insert.raw('EXCLUDED."object_key"'),
        storage_backend_id: Insert.raw('EXCLUDED."storage_backend_id"'),
        storage_uri: Insert.raw('EXCLUDED."storage_uri"'),
        size_bytes: Insert.raw('EXCLUDED."size_bytes"'),
        manifest: Insert.raw('EXCLUDED."manifest"'),
        created_dt: Insert.raw('now()'),
        status: Insert.raw('EXCLUDED."status"'),
        error_detail: Insert.raw('EXCLUDED."error_detail"'),
        attempts: Insert.raw('"file_derivative"."attempts" + 1'),
        last_attempt_dt: Insert.raw('EXCLUDED."last_attempt_dt"'),
        ready_dt: Insert.raw('EXCLUDED."ready_dt"'),
        processing_started_dt: Insert.raw('EXCLUDED."processing_started_dt"'),
        updated_dt: Insert.raw('now()')
      }, ['file_id', 'kind', 'spec'])
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result?.success || !result.insertedRecord) return null;

    return new FileDerivativeEntity(result.insertedRecord);
  }

  async fetchByFileIdKindSize(fileId, kind, size) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .where('kind = ?', kind)
      .where("(spec->>'size')::int = ?", size)
      .where("status = ?", 'ready')
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FileDerivativeEntity(rows[0]) : null;
  }

  async fetchFileIdsWithThumbnails(fileIds) {
    if (!fileIds || fileIds.length === 0) return new Set();
    const flags = await this.fetchDerivativeFlags(fileIds);
    return new Set(Object.keys(flags).filter(id => flags[id].has_thumbnail));
  }

  async fetchFileIdsWithPreviewPages(fileIds) {
    if (!fileIds || fileIds.length === 0) return new Set();
    const flags = await this.fetchDerivativeFlags(fileIds);
    return new Set(Object.keys(flags).filter(id => flags[id].has_preview_pages));
  }

  /**
   * Single query to fetch both thumbnail and preview_pages flags for a batch of file IDs.
   * Returns { [fileId]: { has_thumbnail, has_preview_pages } }
   */
  async fetchDerivativeFlags(fileIds) {
    if (!fileIds || fileIds.length === 0) return {};

    const result = await this.adapter.query(
      `SELECT file_id, kind
       FROM file_derivative
       WHERE file_id = ANY($1)
         AND kind IN ('thumbnail', 'preview_pages')
         AND status = 'ready'
       GROUP BY file_id, kind`,
      [fileIds]
    );
    const rows = this._normalizeRows(result);

    const flags = {};
    for (const row of rows) {
      if (!flags[row.file_id]) {
        flags[row.file_id] = { has_thumbnail: false, has_preview_pages: false };
      }
      if (row.kind === 'thumbnail') flags[row.file_id].has_thumbnail = true;
      if (row.kind === 'preview_pages') flags[row.file_id].has_preview_pages = true;
    }
    return flags;
  }

  async deleteById(derivativeId) {
    const Delete = require(globalThis.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where(`${this.primaryKey} = ?`, derivativeId);

    return del.execute();
  }

  async deleteByFileId(fileId) {
    const Delete = require(globalThis.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('file_id = ?', fileId);

    return del.execute();
  }
}

module.exports = FileDerivativeTable;
