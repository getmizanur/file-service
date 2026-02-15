const TableGateway = require('../../library/db/table-gateway');
const FilePermissionEntity = require('../entity/file-permission-entity');
class FilePermissionTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'file_permission',
      adapter,
      primaryKey: 'permission_id',
      entityFactory: row => new FilePermissionEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return FilePermissionEntity.columns();
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
  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .order('created_dt', 'ASC');
    const result = await query.execute();
    return result.rows || result;
  }
  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('user_id = ?', userId);
    const result = await query.execute();
    return result.rows || result;
  }
  async fetchByUserAndFile(tenantId, fileId, userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('file_id = ?', fileId)
      .where('user_id = ?', userId);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async upsertPermission(tenantId, fileId, userId, role, createdBy) {
    const sql = `
      INSERT INTO ${this.table} (tenant_id, file_id, user_id, role, created_by, created_dt)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (tenant_id, file_id, user_id)
      DO UPDATE SET
        role = EXCLUDED.role,
        created_by = EXCLUDED.created_by,
        created_dt = NOW()
      RETURNING *;
    `;
    const params = [tenantId, fileId, userId, role, createdBy];
    const result = await this.adapter.query(sql, params);
    return result[0];
  }

  async removePermission(tenantId, fileId, userId) {
    const Delete = require('../../library/db/sql/delete');
    const query = new Delete(this.adapter);
    query.from(this.table)
      .where('tenant_id = ?', tenantId)
      .where('file_id = ?', fileId)
      .where('user_id = ?', userId);
    return query.execute();
  }
}
module.exports = FilePermissionTable;
