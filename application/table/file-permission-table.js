const TableGateway = require('../../library/db/table-gateway');
const FilePermissionEntity = require('../entity/file-permission-entity');

const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));

const FilePermissionUserDTO = require(
  global.applicationPath('/application/dto/file-permission-user-dto')
);
const FilePermissionAccessDTO = require(
  global.applicationPath('/application/dto/file-permission-access-dto')
);
const FilePermissionRoleDTO = require(
  global.applicationPath('/application/dto/file-permission-role-dto')
);

class FilePermissionTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'file_permission',
      adapter,
      primaryKey: 'permission_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      // keep legacy entity behavior
      entityFactory: row => new FilePermissionEntity(row)
    });

  }

  baseColumns() {
    return FilePermissionEntity.columns();
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
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length > 0 ? new FilePermissionEntity(rows[0]) : null;
  }

  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .order('created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new FilePermissionEntity(r));
  }

  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('user_id = ?', userId);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new FilePermissionEntity(r));
  }

  async fetchByUserAndFile(tenantId, fileId, userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('file_id = ?', fileId)
      .where('user_id = ?', userId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length > 0 ? new FilePermissionEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * "People with access" list for a file:
   * Returns FilePermissionUserDTO[]
   */
  async fetchPeopleWithAccess(tenantId, fileId) {
    const query = await this.getSelectQuery();

    query
      .from({ fp: 'file_permission' }, [])
      .columns({
        permission_id: 'fp.permission_id',
        tenant_id: 'fp.tenant_id',
        file_id: 'fp.file_id',
        user_id: 'fp.user_id',
        role: 'fp.role',
        created_by: 'fp.created_by',
        created_dt: 'fp.created_dt',

        user_email: 'u.email',
        user_display_name: 'u.display_name',

        actor_display_name: 'actor.display_name'
      })
      .join({ u: 'app_user' }, 'u.user_id = fp.user_id')
      .joinLeft({ actor: 'app_user' }, 'actor.user_id = fp.created_by')
      .where('fp.tenant_id = ?', tenantId)
      .where('fp.file_id = ?', fileId)
      .order('fp.created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FilePermissionUserDTO());
  }

  /**
   * Fetch a user's role for a file (DTO version).
   * Useful if you don't want full entity.
   */
  async fetchMyRole(tenantId, fileId, userId) {
    const query = await this.getSelectQuery();

    query
      .from({ fp: 'file_permission' }, [])
      .columns({
        role: 'fp.role',
        created_dt: 'fp.created_dt'
      })
      .where('fp.tenant_id = ?', tenantId)
      .where('fp.file_id = ?', fileId)
      .where('fp.user_id = ?', userId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);
    if (rows.length === 0) return null;

    return new HydratingResultSet(this.hydrator, new FilePermissionRoleDTO())
      .initialize([rows[0]])
      .current();
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  /**
   * Upsert permission using query builder style where possible.
   *
   * Note: Your current implementation uses raw SQL ON CONFLICT.
   * If your framework doesn't have Insert.onConflict yet, keep raw SQL,
   * but return a hydrated entity instead of result[0].
   */
  async upsertPermission(tenantId, fileId, userId, role, createdBy) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const now = new Date();

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        tenant_id: tenantId,
        file_id: fileId,
        user_id: userId,
        role: role,
        created_by: createdBy,
        created_dt: now
      })
      // NEW: specify composite conflict target (PostgreSQL)
      .onConflict(
        'UPDATE',
        {
          role: role,
          created_by: createdBy,
          created_dt: now
        },
        ['tenant_id', 'file_id', 'user_id']
      )
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new FilePermissionEntity(result.insertedRecord);
  }
  /**
   * Permissions for a file with user details (email, display_name).
   * Returns plain rows: { user_id, email, display_name, role, created_dt }[]
   */
  async fetchUsersWithAccess(tenantId, fileId) {
    const query = await this.getSelectQuery();
    query.from({ fp: this.table }, [])
      .columns({
        user_id: 'fp.user_id',
        email: 'au.email',
        display_name: 'au.display_name',
        role: 'fp.role',
        created_dt: 'fp.created_dt'
      })
      .join({ au: 'app_user' }, 'au.user_id = fp.user_id')
      .where('fp.tenant_id = ?', tenantId)
      .where('fp.file_id = ?', fileId)
      .order('fp.created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);
    return this._hydrateToDtoArray(rows, new FilePermissionAccessDTO());
  }

  async deleteByFileAndUser(tenantId, fileId, userId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));
    const del = new Delete(this.adapter)
      .from(this.table)
      .where('tenant_id = ?', tenantId)
      .where('file_id = ?', fileId)
      .where('user_id = ?', userId);
    return del.execute();
  }
}

module.exports = FilePermissionTable;