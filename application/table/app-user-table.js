const TableGateway = require('../../library/db/table-gateway');
const AppUserEntity = require('../entity/app-user-entity');
class AppUserTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'app_user',
      adapter,
      primaryKey: 'user_id',
      entityFactory: row => new AppUserEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return AppUserEntity.columns();
  }
  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);
    const rows = await query.execute();
    return rows.length > 0 ? rows[0] : null;
  }
  async fetchByEmail(email) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('email = ?', email)
      .limit(1);
    const rows = await query.execute();
    return rows.length > 0 ? rows[0] : null;
  }

  async fetchByIds(ids) {
    if (!ids || ids.length === 0) return [];

    // Make unique
    const uniqueIds = [...new Set(ids)];

    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .whereIn(this.primaryKey, uniqueIds);

    const rows = await query.execute();
    return rows ? rows : [];
  }
  async searchByTerm(term, tenantId, limit = 10) {
    const Select = require('../../library/db/sql/select');
    const query = new Select(this.adapter);

    query.from({ u: 'app_user' }, ['u.user_id', 'u.email', 'u.display_name'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('tm.tenant_id = ?', tenantId)
      .where('u.status = ?', 'active');

    if (term) {
      // Basic search by email or name (case-insensitive usually depends on DB collation or specific operators)
      // For cross-db compatibility, we might just usage LIKE. 
      // PostgreSQL is case-sensitive with LIKE, ILIKE is better but non-standard.
      // Let's usage standard SQL with lower() if possible, or just standard LIKE for now and assume exact or simple match.
      // Actually, user wants "search", so LIKE %term% is best.

      // Using generic SQL builder support? 
      // Assuming where clause supports complex string or we construction it.
      // Let's try simple OR approach with query builder features. 
      // If builder doesn't support nested OR, we might need raw where string.

      // Use LOWER() for case-insensitive search compatibility (Postgres LIKE is case-sensitive)
      // Note: query.where() only replaces the first ?, so use two separate where calls
      // combined into a single raw condition with manually added parameters
      const likeTerm = `%${term.toLowerCase()}%`;
      const p1 = query._addParameter(likeTerm);
      const p2 = query._addParameter(likeTerm);
      query.where(`(LOWER(u.email) LIKE ${p1} OR LOWER(u.display_name) LIKE ${p2})`);
    }

    query.limit(limit);

    // Sort by name
    query.order('u.display_name', 'ASC');

    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows;
  }
}
module.exports = AppUserTable;
