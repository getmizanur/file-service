// application/table/tenant-member-table.js
const TableGateway = require('../../library/db/table-gateway');
const TenantMemberEntity = require('../entity/tenant-member-entity');

const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));

const TenantMemberUserDTO = require(
  global.applicationPath('/application/dto/tenant-member-user-dto')
);

class TenantMemberTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'tenant_member',
      adapter,
      hydrator: hydrator || new ClassMethodsHydrator(),
      primaryKey: ['tenant_id', 'user_id'], // Composite key
      entityFactory: row => new TenantMemberEntity(row)
    });
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  baseColumns() {
    // base entity columns (no projection)
    return TenantMemberEntity.columns();
  }

  _normalizeRows(result) {
    return (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
  }

  _hydrateToDtoArray(rows, dtoPrototype) {
    return new HydratingResultSet(this.hydrator, dtoPrototype)
      .initialize(rows)
      .toArray();
  }

  // ------------------------------------------------------------
  // Entity methods (backwards compatible)
  // ------------------------------------------------------------

  async fetchByTenantAndUser(tenantId, userId) {
    const query = await this.getSelectQuery();
    query.from({ tm: this.table }, [])
      .columns(this.baseColumns())
      .where('tm.tenant_id = ?', tenantId)
      .where('tm.user_id = ?', userId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new TenantMemberEntity(rows[0]) : null;
  }

  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from({ tm: this.table }, [])
      .columns(this.baseColumns())
      .where('tm.tenant_id = ?', tenantId)
      .order('tm.created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new TenantMemberEntity(r));
  }

  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from({ tm: this.table }, [])
      .columns(this.baseColumns())
      .where('tm.user_id = ?', userId)
      .order('tm.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new TenantMemberEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch members for a tenant including user details.
   * Returns: TenantMemberUserDTO[]
   */
  async fetchMembersWithUserDetails(tenantId, { limit = null, offset = null } = {}) {
    const query = await this.getSelectQuery();

    query.from({ tm: this.table }, [])
      .columns({
        tenant_id: 'tm.tenant_id',
        user_id: 'tm.user_id',
        role: 'tm.role',
        created_dt: 'tm.created_dt',

        user_email: 'u.email',
        user_display_name: 'u.display_name'
      })
      .join({ u: 'app_user' }, 'u.user_id = tm.user_id')
      .where('tm.tenant_id = ?', tenantId)
      .order('tm.created_dt', 'ASC');

    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new TenantMemberUserDTO());
  }
}

module.exports = TenantMemberTable;