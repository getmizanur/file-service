const TableGateway = require('../../library/db/table-gateway');
const FileEventEntity = require('../entity/file-event-entity');

const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));

const FileEventItemDTO = require(
  global.applicationPath('/application/dto/file-event-item-dto')
);

class FileEventTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'file_event',
      adapter,
      primaryKey: 'event_id',
      // For DTO hydration / consistent resultset use
      hydrator: hydrator || new ClassMethodsHydrator(),
      // keep legacy entity creation pattern for pure row reads
      entityFactory: row => new FileEventEntity(row)
    });
  }

  baseColumns() {
    return FileEventEntity.columns();
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
  // Entity methods (backwards compatible)
  // ------------------------------------------------------------

  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from({ fe: this.table })
      .columns(this.baseColumns())
      .where('fe.event_id = ?', id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FileEventEntity(rows[0]) : null;
  }

  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from({ fe: this.table })
      .columns(this.baseColumns())
      .where('fe.file_id = ?', fileId)
      .order('fe.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    // preserve "entity list" semantics
    return rows.map(r => new FileEventEntity(r));
  }

  async insertEvent(fileId, eventType, detail, userId) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));
    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        file_id: fileId,
        event_type: eventType,
        detail: JSON.stringify(detail || {}),
        actor_user_id: userId,
        created_dt: new Date()
      });
    await insert.execute();
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Activity feed for a file, with actor details.
   * Returns: FileEventItemDTO[]
   */
  async fetchActivityByFileId(fileId, { limit = 50, offset = 0 } = {}) {
    const query = await this.getSelectQuery();

    query.from({ fe: this.table }, [])
      .columns({
        event_id: 'fe.event_id',
        file_id: 'fe.file_id',
        event_type: 'fe.event_type',
        detail: 'fe.detail',
        actor_user_id: 'fe.actor_user_id',
        created_dt: 'fe.created_dt',

        actor_display_name: 'actor.display_name',
        actor_email: 'actor.email'
      })
      .joinLeft({ actor: 'app_user' }, 'actor.user_id = fe.actor_user_id')
      .where('fe.file_id = ?', fileId)
      .order('fe.created_dt', 'DESC');

    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FileEventItemDTO());
  }
}

module.exports = FileEventTable;