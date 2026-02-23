// application/table/folder-star-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const FolderStarEntity = require('../entity/folder-star-entity');
const FolderStarWithFolderDTO = require('../dto/folder-star-with-folder-dto');

class FolderStarTable extends TableGateway {

  constructor({ adapter, hydrator }) {
    super({
      table: 'folder_star',
      adapter,
      primaryKey: null, // composite key
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new FolderStarEntity()
    });
  }

  baseColumns() {
    return FolderStarEntity.columns();
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  /**
   * Add a star
   */
  async add(tenantId, folderId, userId) {
    return this.insert({
      tenant_id: tenantId,
      folder_id: folderId,
      user_id: userId
    });
  }

  /**
   * Remove a star
   */
  async remove(tenantId, folderId, userId) {
    return this.delete({
      tenant_id: tenantId,
      folder_id: folderId,
      user_id: userId
    });
  }

  /**
   * Check if starred (uses hydration properly)
   */
  async check(tenantId, folderId, userId) {
    const query = await this.getSelectQuery();

    query.from(this.table)
      .columns(['created_dt'])
      .where('tenant_id = ?', tenantId)
      .where('folder_id = ?', folderId)
      .where('user_id = ?', userId)
      .limit(1);

    const result = await this.select(query);
    return result.length > 0;
  }

  /**
   * Fetch all starred folders for a user
   * Returns FolderStarEntity[]
   */
  async fetchByUser(tenantId, userId) {
    const query = await this.getSelectQuery();

    query.from(this.table)
      .columns(['*'])
      .where('tenant_id = ?', tenantId)
      .where('user_id = ?', userId)
      .order('created_dt', 'DESC');

    return await this.select(query); // auto hydrated
  }

  /**
   * Fetch only folder IDs (lightweight — no hydration)
   */
  async fetchIdsByUser(tenantId, userId) {
    const query = await this.getSelectQuery();

    query.from(this.table)
      .columns(['folder_id'])
      .where('tenant_id = ?', tenantId)
      .where('user_id = ?', userId)
      .order('created_dt', 'DESC');

    const rows = await query.execute();
    const data = Array.isArray(rows) ? rows : (rows?.rows || []);

    return data.map(r => r.folder_id);
  }

  /**
   * Fetch starred folders with join projection
   * Returns FolderStarWithFolderDTO[]
   */
  async fetchWithFolderDetails(tenantId, userId) {
    const Select = require(global.applicationPath('/library/db/sql/select'));

    const query = new Select(this.adapter)
      .from({ fs: this.table }, [])
      .join({ f: 'folder' }, 'f.folder_id = fs.folder_id')
      .joinLeft({ u: 'app_user' }, 'u.user_id = f.created_by')
      .columns([
        'f.folder_id',
        'f.name',
        'u.display_name AS owner',
        'f.created_dt',
        'f.updated_dt',
        'fs.created_dt AS starred_dt'
      ])
      .where('fs.tenant_id = ?', tenantId)
      .where('fs.user_id = ?', userId)
      .where('f.deleted_at IS NULL')
      .order('fs.created_dt', 'DESC');

    const resultSet = new HydratingResultSet(
      new ClassMethodsHydrator(),
      new FolderStarWithFolderDTO()
    );

    return await this.select(query, { resultSet });
  }
}

module.exports = FolderStarTable;