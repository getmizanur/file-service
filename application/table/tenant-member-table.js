const TableGateway = require('../../library/db/table-gateway');
const TenantMemberEntity = require('../entity/tenant-member-entity');
class TenantMemberTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'tenant_member',
      adapter,
      primaryKey: ['tenant_id', 'user_id'], // Composite key
      entityFactory: row => new TenantMemberEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return TenantMemberEntity.columns();
  }
  async fetchByTenantAndUser(tenantId, userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('user_id = ?', userId)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
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
}
module.exports = TenantMemberTable;
