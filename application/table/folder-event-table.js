const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const FolderEventEntity = require('../entity/folder-event-entity');
const FolderEventItemDTO = require('../dto/folder-event-item-dto');
const FolderWithOwnerDTO = require('../dto/folder-with-owner-dto');

class FolderEventTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'folder_event',
      adapter,
      primaryKey: 'event_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new FolderEventEntity()
    });
  }

  baseColumns() {
    return FolderEventEntity.columns();
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

  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from({ fe: this.table })
      .columns(this.baseColumns())
      .where('fe.event_id = ?', id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FolderEventEntity(rows[0]) : null;
  }

  async fetchByFolderId(folderId) {
    const query = await this.getSelectQuery();
    query.from({ fe: this.table })
      .columns(this.baseColumns())
      .where('fe.folder_id = ?', folderId)
      .order('fe.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new FolderEventEntity(r));
  }

  async insertEvent(folderId, eventType, detail, userId) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));
    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        folder_id: folderId,
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
   * Activity feed for a folder, with actor details.
   * Returns: FolderEventItemDTO[]
   */
  async fetchActivityByFolderId(folderId, { limit = 50, offset = 0 } = {}) {
    const query = await this.getSelectQuery();

    query.from({ fe: this.table }, [])
      .columns({
        event_id: 'fe.event_id',
        folder_id: 'fe.folder_id',
        event_type: 'fe.event_type',
        detail: 'fe.detail',
        actor_user_id: 'fe.actor_user_id',
        created_dt: 'fe.created_dt',

        actor_display_name: 'actor.display_name',
        actor_email: 'actor.email'
      })
      .joinLeft({ actor: 'app_user' }, 'actor.user_id = fe.actor_user_id')
      .where('fe.folder_id = ?', folderId)
      .order('fe.created_dt', 'DESC');

    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FolderEventItemDTO());
  }

  /**
   * Folders with recent meaningful events for a tenant.
   * Only CREATED, RENAMED, MOVED, RESTORED, PERMISSION_UPDATED qualify.
   * Returns FolderWithOwnerDTO[], ordered by latest qualifying event DESC.
   */
  async fetchRecentByTenant(tenantId, limit = 20) {
    const query = await this.getSelectQuery();

    query.from({ fe: this.table }, [])
      .columns({
        folder_id: 'f.folder_id',
        tenant_id: 'f.tenant_id',
        parent_folder_id: 'f.parent_folder_id',
        name: 'f.name',
        created_by: 'f.created_by',
        created_dt: 'f.created_dt',
        updated_by: 'f.updated_by',
        updated_dt: 'f.updated_dt',
        deleted_at: 'f.deleted_at',
        deleted_by: 'f.deleted_by',
        owner: 'u.display_name',
        last_event_dt: 'MAX(fe.created_dt)'
      })
      .join({ f: 'folder' }, 'f.folder_id = fe.folder_id')
      .joinLeft({ u: 'app_user' }, 'u.user_id = f.created_by')
      .where('f.tenant_id = ?', tenantId)
      .where('f.deleted_at IS NULL')
      .where("fe.event_type IN ('CREATED', 'RENAMED', 'MOVED', 'RESTORED', 'PERMISSION_UPDATED')")
      .group([
        'f.folder_id', 'f.tenant_id', 'f.parent_folder_id', 'f.name',
        'f.created_by', 'f.created_dt', 'f.updated_by', 'f.updated_dt',
        'f.deleted_at', 'f.deleted_by', 'u.display_name'
      ])
      .order('last_event_dt', 'DESC')
      .limit(limit);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FolderWithOwnerDTO());
  }
}

module.exports = FolderEventTable;
