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
    return result.rows.length > 0 ? result.rows[0] : null;
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
        last_modified: 'fm.updated_dt',
        size_bytes: 'fm.size_bytes',
        item_type: "'file'",
        document_type: 'fm.document_type'
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
}
module.exports = FileMetadataTable;
