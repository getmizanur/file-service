const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const FileStarEntity = require('../entity/file-star-entity');

class FileStarTable extends TableGateway {

  constructor({ adapter, hydrator }) {
    super({
      table: 'file_star',
      adapter,
      primaryKey: null, // composite key
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new FileStarEntity()
    });
  }

  baseColumns() {
    return FileStarEntity.columns();
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  /**
   * Add a star
   */
  async add(tenantId, fileId, userId) {
    return this.insert({
      tenant_id: tenantId,
      file_id: fileId,
      user_id: userId
    });
  }

  /**
   * Remove a star
   */
  async remove(tenantId, fileId, userId) {
    return this.delete({
      tenant_id: tenantId,
      file_id: fileId,
      user_id: userId
    });
  }

  /**
   * Remove star with active tenant-member check
   */
  async removeWithTenantCheck(tenantId, fileId, userId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));
    const del = new Delete(this.adapter)
      .from({ fs: 'file_star' })
      .using({ tm: 'tenant_member' }, 'tm.tenant_id = fs.tenant_id')
      .where('fs.tenant_id = ?', tenantId)
      .where('fs.file_id = ?', fileId)
      .where('fs.user_id = ?', userId)
      .where('tm.user_id = ?', userId)
      .where("tm.status = 'active'")
      .returning(['fs.file_id']);

    return del.execute();
  }

  /**
   * Check if a file is starred
   */
  async check(tenantId, fileId, userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(['created_dt'])
      .where('tenant_id = ?', tenantId)
      .where('file_id = ?', fileId)
      .where('user_id = ?', userId)
      .limit(1);

    const result = await this.select(query);
    return result.length > 0;
  }

  /**
   * Fetch starred files for a user
   * Returns FileStarEntity[]
   */
  async fetchByUser(tenantId, userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(['*'])
      .where('tenant_id = ?', tenantId)
      .where('user_id = ?', userId)
      .order('created_dt', 'DESC');

    return this.select(query);
  }
}

module.exports = FileStarTable;
