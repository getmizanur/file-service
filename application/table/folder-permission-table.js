// application/table/folder-permission-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const FolderPermissionEntity = require('../entity/folder-permission-entity');
const FolderPermissionUserDTO = require('../dto/folder-permission-user-dto');

class FolderPermissionTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'folder_permission',
      adapter,
      primaryKey: 'permission_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new FolderPermissionEntity()
    });
  }

  baseColumns() {
    return FolderPermissionEntity.columns();
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
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FolderPermissionEntity(rows[0]) : null;
  }

  async fetchByFolderId(folderId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('folder_id = ?', folderId)
      .order('created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new FolderPermissionEntity(r));
  }

  async fetchByUserAndFolder(tenantId, folderId, userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('folder_id = ?', folderId)
      .where('user_id = ?', userId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FolderPermissionEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * "People with access" list for a folder.
   * Returns FolderPermissionUserDTO[]
   */
  async fetchPeopleWithAccess(tenantId, folderId) {
    const query = await this.getSelectQuery();

    query
      .from({ fp: 'folder_permission' }, [])
      .columns({
        permission_id: 'fp.permission_id',
        tenant_id: 'fp.tenant_id',
        folder_id: 'fp.folder_id',
        user_id: 'fp.user_id',
        role: 'fp.role',
        inherit_to_children: 'fp.inherit_to_children',
        created_by: 'fp.created_by',
        created_dt: 'fp.created_dt',

        user_email: 'u.email',
        user_display_name: 'u.display_name',

        actor_display_name: 'actor.display_name'
      })
      .join({ u: 'app_user' }, 'u.user_id = fp.user_id')
      .joinLeft({ actor: 'app_user' }, 'actor.user_id = fp.created_by')
      .where('fp.tenant_id = ?', tenantId)
      .where('fp.folder_id = ?', folderId)
      .order('fp.created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FolderPermissionUserDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  /**
   * Upsert a user permission on a folder.
   * Conflict target: (tenant_id, folder_id, user_id)
   */
  async upsertPermission(tenantId, folderId, userId, role, createdBy, inheritToChildren = true) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const now = new Date();

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        tenant_id: tenantId,
        folder_id: folderId,
        user_id: userId,
        role,
        inherit_to_children: inheritToChildren,
        created_by: createdBy,
        created_dt: now
      })
      .onConflict(
        'UPDATE',
        { role, inherit_to_children: inheritToChildren, created_by: createdBy, created_dt: now },
        ['tenant_id', 'folder_id', 'user_id']
      )
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new FolderPermissionEntity(result.insertedRecord);
  }

  async deletePermission(tenantId, folderId, userId) {
    return this.delete({ tenant_id: tenantId, folder_id: folderId, user_id: userId });
  }
}

module.exports = FolderPermissionTable;
