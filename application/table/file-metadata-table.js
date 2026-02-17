const TableGateway = require('../../library/db/table-gateway');
const FileMetadataEntity = require('../entity/file-metadata-entity');
class FileMetadataTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'file_metadata',
      adapter,
      primaryKey: 'file_id',
      entityFactory: row => new FileMetadataEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return FileMetadataEntity.columns();
  }
  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);
    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.length > 0 ? new FileMetadataEntity(rows[0]) : null;
  }

  async fetchByIds(ids) {
    if (!ids || ids.length === 0) return [];

    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .whereIn(this.primaryKey, ids);

    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
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
    return result.rows || result;
  }


  /**
   * Fetch files only for a parent folder
   * @param {string} email - User email for permission check
   * @param {string} folderId - Parent folder UUID
   * @returns {Promise<Array>} List of file items
   */
  async fetchFilesByFolder(email, folderId) {
    // Build File Query
    const query = await this.getSelectQuery();
    query.from({ fm: 'file_metadata' }, [])
      .columns({
        id: 'fm.file_id',
        name: 'fm.title',
        owner: 'u.display_name',
        created_by: 'fm.created_by', // Need ID for logic
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

    if (folderId) {
      query.where('fm.folder_id = ?', folderId);
    } else {
      query.where('fm.folder_id IS NULL');
    }

    query.order('name', 'ASC');

    // Execute via the builder
    const result = await query.execute();
    return result.rows || result;
  }

  /**
   * Fetch recent files for a user
   * @param {string} email - User email
   * @param {number} limit - Max number of files
   * @returns {Promise<Array>} List of file items
   */
  async fetchRecent(email, limit = 50, tenantId = null) {
    // 1. Resolve User ID (and Tenant if missing)
    let user_id = null;
    let resolved_tenant_id = tenantId;

    if (!resolved_tenant_id) {
      // Fallback: Resolve both

      const qUser = await this.getSelectQuery();
      qUser.from({ u: 'app_user' }, ['u.user_id'])
        .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id', ['tenant_id'])
        .where('u.email = ?', email)
        .limit(1);

      const resUser = await qUser.execute();
      const rows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);

      console.log('[FileMetadataTable] fetchRecent: Resolved user rows=', rows);
      if (rows.length === 0) {
        console.warn('[FileMetadataTable] fetchRecent: User/Tenant not found for email', email);
        return [];
      }
      user_id = rows[0].user_id;
      resolved_tenant_id = rows[0].tenant_id;
    } else {
      // Just resolve User ID
      const qUser = await this.getSelectQuery();
      qUser.from({ u: 'app_user' }, ['u.user_id'])
        .where('u.email = ?', email)
        .limit(1);

      const resUser = await qUser.execute();
      const rows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);

      console.log('[FileMetadataTable] fetchRecent: Resolved user rows=', rows);
      if (rows.length === 0) {
        console.warn('[FileMetadataTable] fetchRecent: User not found for email', email);
        return [];
      }
      user_id = rows[0].user_id;
      console.log('[FileMetadataTable] fetchRecent: Resolved user=', user_id);
    }

    console.log(`[FileMetadataTable] fetchRecent: Resolved user=${user_id}, tenant=${resolved_tenant_id} for email=${email}`);

    // 2. Execute Query with Builder
    const query = await this.getSelectQuery();
    query.from({ f: 'file_metadata' }, [
      'f.file_id',
      'f.title',
      'f.original_filename',
      'f.content_type',
      'f.size_bytes',
      'f.created_dt',
      'f.updated_dt',
      'f.document_type',
      'f.visibility'
    ])
      .where('f.tenant_id = ?', resolved_tenant_id)
      .where('f.created_by = ?', user_id)
      .where('f.deleted_at IS NULL')
      .where("f.created_dt >= NOW() - (? || ' days')::interval", 30)
      .order('f.created_dt', 'DESC')
      .limit(limit)
      .offset(0);

    const result = await query.execute();
    console.log(`[FileMetadataTable] fetchRecent: files=`, result);
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    console.log(`[FileMetadataTable] fetchRecent: Found ${rows.length} files`);

    // 3. Map to expected format
    return rows.map(row => ({
      id: row.file_id,
      name: row.title || row.original_filename,
      owner: 'me',
      last_modified: row.updated_dt || row.created_dt,
      size_bytes: row.size_bytes,
      item_type: 'file',
      document_type: row.document_type || 'other',
      content_type: row.content_type,
      created_dt: row.created_dt,
      visibility: row.visibility
    }));
  }

  /**
   * Fetch files shared with the user
   * @param {string} userId - Current User ID
   * @param {string} tenantId - Tenant ID
   * @param {number} limit
   * @param {number} offset
   */
  async fetchSharedWithMe(userId, tenantId, limit = 50, offset = 0) {
    const sql = `
      SELECT
        fm.file_id,
        fm.title,
        fm.original_filename,
        fm.content_type,
        fm.size_bytes,
        fm.updated_dt,
        fm.created_dt,
        fm.folder_id,
        fm.document_type,
        fm.visibility,
        
        fp.role AS my_role,
        
        owner_u.display_name AS owner_name,
        owner_u.email AS owner_email,
        
        actor_u.display_name AS shared_by_name,
        fp.created_dt AS shared_dt

      FROM file_permission fp
      JOIN file_metadata fm 
        ON fm.tenant_id = fp.tenant_id 
       AND fm.file_id = fp.file_id
      
      -- Owner info
      LEFT JOIN file_permission owner_fp 
        ON owner_fp.tenant_id = fm.tenant_id 
       AND owner_fp.file_id = fm.file_id 
       AND owner_fp.role = 'owner'
      LEFT JOIN app_user owner_u 
        ON owner_u.user_id = owner_fp.user_id

      -- Shared by info
      LEFT JOIN app_user actor_u 
        ON actor_u.user_id = fp.created_by

      WHERE fp.tenant_id = $1
        AND fp.user_id = $2
        AND fp.role <> 'owner'
        AND fm.deleted_at IS NULL
      
      ORDER BY fp.created_dt DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.adapter.query(sql, [tenantId, userId, limit, offset]);
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);

    return rows.map(row => ({
      id: row.file_id,
      name: row.title || row.original_filename,
      owner: row.owner_name || row.owner_email || 'Unknown',
      last_modified: row.updated_dt || row.created_dt,
      size_bytes: row.size_bytes,
      item_type: 'file',
      document_type: row.document_type || 'other',
      content_type: row.content_type,
      created_dt: row.created_dt,
      visibility: row.visibility,
      shared_at: row.shared_dt,
      shared_by: row.shared_by_name
    }));
  }
}
module.exports = FileMetadataTable;
