const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const FileStarEntity = require('../entity/file-star-entity');

class FileStarTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'file_star',
      adapter,
      primaryKey: null, // Composite key, handled manually
      entityFactory: row => new FileStarEntity(row)
    });
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  /**
   * Add a star
   */
  async add(tenantId, fileId, userId) {
    const data = {
      tenant_id: tenantId,
      file_id: fileId,
      user_id: userId
    };
    // Use insert ignore or standard insert. 
    // Since unique constraint exists, standard insert will throw if exists.
    // We can just use insert and let it fail or check first.
    return this.insert(data);
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
   * Remove star with tenant check
   * @param {string} tenantId 
   * @param {string} fileId 
   * @param {string} userId 
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
      // only if you actually have tenant_member.status:
      .where("tm.status = 'active'")
      .returning(['fs.file_id']);

    return await del.execute();
  }

  /**
   * Check if exists
   */
  async check(tenantId, fileId, userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(['created_dt'])
      .where('tenant_id = ?', tenantId)
      .where('file_id = ?', fileId)
      .where('user_id = ?', userId)
      .limit(1);

    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.length > 0;
  }

  /**
   * Fetch starred files for user
   * Returns FileStarEntity[]
   */
  async fetchByUser(tenantId, userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(['*'])
      .where('tenant_id = ?', tenantId)
      .where('user_id = ?', userId)
      .order('created_dt', 'DESC');

    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.map(row => new FileStarEntity(row));
  }
}

module.exports = FileStarTable;
