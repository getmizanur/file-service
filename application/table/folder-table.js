const TableGateway = require(global.applicationPath(
  '/library/db/table-gateway'));
const FolderEntity = require(global.applicationPath(
  '/application/entity/folder-entity'));

class FolderTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'folder',
      adapter,
      primaryKey: 'folder_id',
      entityFactory: row => new FolderEntity(row)
    });
  }

  baseColumns() {
    return FolderEntity.columns().filter(col => col !== 'owner_name');
  }


  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  /**
   * Fetch all folders for a specific tenant
   * @param {string} tenantId
   * @returns {Promise<FolderEntity[]>}
   */
  async fetchByTenant(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('name');

    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.map(row => new FolderEntity(row));
  }

  /**
   * Fetch sub-folders for a given parent folder
   * @param {string} parentId
   * @returns {Promise<FolderEntity[]>}
   */
  async fetchByParent(parentId) {
    const query = await this.getSelectQuery();
    query.from({ f: this.table })
      .columns([
        'f.*',
        'u.display_name AS owner_name'
      ])
      .joinLeft({ u: 'app_user' }, 'u.user_id = f.created_by')
      .where('f.parent_folder_id = ?', parentId)
      .order('f.name');

    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.map(row => new FolderEntity(row));
  }

  /**
   * Fetch all folders accessible to a user via their tenant membership
   * @param {string} email
   * @returns {Promise<FolderEntity[]>}
   */
  async fetchByUserEmail(email) {
    const query = await this.getSelectQuery();
    query
      .from(this.table)
      .columns([`${this.table}.*`])
      .join('tenant_member', `${this.table}.tenant_id = tenant_member.tenant_id`, [])
      .join('app_user', 'tenant_member.user_id = app_user.user_id', [])
      .where('app_user.email = ?', email)
      .order(`${this.table}.name`);

    console.log('[FolderTable] SQL:', query.toString());
    console.log('[FolderTable] Params:', query.getParameters());
    const result = await query.execute();
    console.log('[FolderTable] fetchByUserEmail Result:', result);
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.map(row => new FolderEntity(row));
  }
}

module.exports = FolderTable;
