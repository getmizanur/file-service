const TableGateway = require('../../library/db/table-gateway');
const FileMetadataEntity = require('../entity/file-metadata-entity');

const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));

// DTOs (projection rows)
const FileListItemDTO = require(global.applicationPath('/application/dto/file-list-item-dto'));
const RecentFileItemDTO = require(global.applicationPath('/application/dto/recent-file-item-dto'));
const SharedWithMeFileDTO = require(global.applicationPath('/application/dto/shared-with-me-file-dto'));

class FileMetadataTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'file_metadata',
      adapter,
      primaryKey: 'file_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      // Keep legacy entity hydration behavior for non-projection methods
      entityFactory: row => new FileMetadataEntity(row)
    });
  }

  baseColumns() {
    return FileMetadataEntity.columns();
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------

  _normalizeRows(result) {
    return (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
  }

  _hydrateToDtoArray(rows, dtoPrototype) {
    return new HydratingResultSet(this.hydrator, dtoPrototype)
      .initialize(rows)
      .toArray();
  }

  // ------------------------------------------------------------
  // Entity methods (keep behaviour consistent with your current code)
  // ------------------------------------------------------------

  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length > 0 ? new FileMetadataEntity(rows[0]) : null;
  }

  async fetchByIds(ids) {
    if (!ids || ids.length === 0) return [];

    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .whereIn(this.primaryKey, ids);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(row => new FileMetadataEntity(row));
  }

  async fetchByTenantId(tenantId, { limit = null, offset = null } = {}) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('deleted_at IS NULL')
      .order('created_dt', 'DESC');

    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    // keep legacy behavior (returns raw rows)
    return result.rows || result;
  }

  // ------------------------------------------------------------
  // Projection methods (DTO outputs)
  // ------------------------------------------------------------

  /**
   * Fetch files for a folder (list view)
   * Returns: FileListItemDTO[]
   */
  async fetchFilesByFolder(email, folderId) {
    const query = await this.getSelectQuery();

    query.from({ fm: 'file_metadata' }, [])
      .columns({
        id: 'fm.file_id',
        name: 'fm.title',
        owner: 'u.display_name',

        // keep as snake_case aliases (hydrator should map created_by -> setCreatedBy)
        created_by: 'fm.created_by',
        last_modified: 'fm.updated_dt',
        size_bytes: 'fm.size_bytes',
        item_type: "'file'",
        document_type: 'fm.document_type',
        visibility: 'fm.visibility'
      })
      .join({ tm: 'tenant_member' }, 'tm.tenant_id = fm.tenant_id')
      .join({ au: 'app_user' }, 'au.user_id = tm.user_id')
      .joinLeft({ u: 'app_user' }, 'u.user_id = fm.created_by')
      .where('au.email = ?', email)
      .where('fm.deleted_at IS NULL');

    if (folderId) query.where('fm.folder_id = ?', folderId);
    else query.where('fm.folder_id IS NULL');

    query.order('name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FileListItemDTO());
  }

  /**
   * Fetch recent files for a user (recent view)
   * Returns: RecentFileItemDTO[]
   *
   * Keeps your current backwards-compatible behaviour:
   * - If tenantId not provided, resolves tenantId via tenant_member.
   * - Always resolves user_id from email.
   */
  async fetchRecent(email, limit = 50, tenantId = null) {
    let user_id = null;
    let resolved_tenant_id = tenantId;

    // Resolve user_id (and tenant_id if needed)
    if (!resolved_tenant_id) {
      const qUser = await this.getSelectQuery();
      qUser.from({ u: 'app_user' }, ['u.user_id'])
        .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id', ['tenant_id'])
        .where('u.email = ?', email)
        .limit(1);

      const resUser = await qUser.execute();
      const rows = this._normalizeRows(resUser);

      if (rows.length === 0) return [];

      user_id = rows[0].user_id;
      resolved_tenant_id = rows[0].tenant_id;
    } else {
      const qUser = await this.getSelectQuery();
      qUser.from({ u: 'app_user' }, ['u.user_id'])
        .where('u.email = ?', email)
        .limit(1);

      const resUser = await qUser.execute();
      const rows = this._normalizeRows(resUser);

      if (rows.length === 0) return [];

      user_id = rows[0].user_id;
    }

    const query = await this.getSelectQuery();
    query.from({ f: 'file_metadata' }, [])
      .columns({
        id: 'f.file_id',
        name: "COALESCE(f.title, f.original_filename)",
        owner: "'me'",
        last_modified: "COALESCE(f.updated_dt, f.created_dt)",
        size_bytes: 'f.size_bytes',
        item_type: "'file'",
        document_type: "COALESCE(f.document_type, 'other')",
        content_type: 'f.content_type',
        created_dt: 'f.created_dt',
        visibility: 'f.visibility'
      })
      .where('f.tenant_id = ?', resolved_tenant_id)
      .where('f.created_by = ?', user_id)
      .where('f.deleted_at IS NULL')
      .where("f.created_dt >= NOW() - (? || ' days')::interval", 30)
      .order('f.created_dt', 'DESC')
      .limit(limit)
      .offset(0);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new RecentFileItemDTO());
  }

  /**
   * Fetch files shared with the user
   * Returns: SharedWithMeFileDTO[]
   *
   * Rewritten from raw SQL to Select builder.
   */
  async fetchSharedWithMe(userId, tenantId, limit = 50, offset = 0) {
    const query = await this.getSelectQuery();

    query
      .from({ fp: 'file_permission' }, [])
      .columns({
        id: 'fm.file_id',
        name: "COALESCE(fm.title, fm.original_filename)",
        owner: "COALESCE(owner_u.display_name, owner_u.email, 'Unknown')",
        last_modified: "COALESCE(fm.updated_dt, fm.created_dt)",
        size_bytes: 'fm.size_bytes',
        item_type: "'file'",
        document_type: "COALESCE(fm.document_type, 'other')",
        content_type: 'fm.content_type',
        created_dt: 'fm.created_dt',
        visibility: 'fm.visibility',

        my_role: 'fp.role',
        shared_at: 'fp.created_dt',
        shared_by: 'actor_u.display_name'
      })

      // JOIN file_metadata (multi-condition ON)
      .join(
        { fm: 'file_metadata' },
        'fm.tenant_id = fp.tenant_id AND fm.file_id = fp.file_id'
      )

      // LEFT JOIN owner_fp (multi-condition ON incl role='owner')
      .joinLeft(
        { owner_fp: 'file_permission' },
        "owner_fp.tenant_id = fm.tenant_id AND owner_fp.file_id = fm.file_id AND owner_fp.role = 'owner'"
      )

      // LEFT JOIN owner_u
      .joinLeft(
        { owner_u: 'app_user' },
        'owner_u.user_id = owner_fp.user_id'
      )

      // LEFT JOIN actor_u
      .joinLeft(
        { actor_u: 'app_user' },
        'actor_u.user_id = fp.created_by'
      )

      .where('fp.tenant_id = ?', tenantId)
      .where('fp.user_id = ?', userId)
      .where("fp.role <> 'owner'")
      .where('fm.deleted_at IS NULL')

      .order('fp.created_dt', 'DESC')
      .limit(limit)
      .offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new SharedWithMeFileDTO());
  }
  async fetchByPublicKey(publicKey) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('public_key = ?', publicKey)
      .where('deleted_at IS NULL')
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length > 0 ? new FileMetadataEntity(rows[0]) : null;
  }

  async fetchByIdIncludeDeleted(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length > 0 ? new FileMetadataEntity(rows[0]) : null;
  }

  /**
   * Fetch deleted files for a user (trash view, 30-day window)
   * Returns: FileListItemDTO[]
   */
  async fetchDeletedFiles(email) {
    const query = await this.getSelectQuery();

    query.from({ fm: 'file_metadata' }, [])
      .columns({
        id: 'fm.file_id',
        name: 'fm.title',
        owner: 'u.display_name',
        created_by: 'fm.created_by',
        last_modified: 'fm.deleted_at',
        size_bytes: 'fm.size_bytes',
        item_type: "'file'",
        document_type: 'fm.document_type',
        visibility: 'fm.visibility'
      })
      .join({ tm: 'tenant_member' }, 'tm.tenant_id = fm.tenant_id')
      .join({ au: 'app_user' }, 'au.user_id = tm.user_id')
      .joinLeft({ u: 'app_user' }, 'u.user_id = fm.created_by')
      .where('au.email = ?', email)
      .where('fm.deleted_at IS NOT NULL')
      .where("fm.deleted_at >= NOW() - INTERVAL '30 days'")
      .order('fm.deleted_at', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FileListItemDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async hasFilesByFolder(folderId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns([this.primaryKey])
      .where('folder_id = ?', folderId)
      .where('deleted_at IS NULL')
      .limit(1);

    const result = await query.execute();
    return this._normalizeRows(result).length > 0;
  }

  async updateSubStatus(fileId, tenantId, data) {
    const Update = require(global.applicationPath('/library/db/sql/update'));
    const query = new Update(this.adapter);
    query.table(this.table)
      .set(data)
      .where('file_id = ?', fileId)
      .where('tenant_id = ?', tenantId)
      .where('deleted_at IS NULL');
    return query.execute();
  }
}

module.exports = FileMetadataTable;