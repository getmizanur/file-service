const TableGateway = require('../../library/db/table-gateway');
const TenantPolicyEntity = require('../entity/tenant-policy-entity');

const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));

const TenantPolicyDTO = require(
  global.applicationPath('/application/dto/tenant-policy-dto')
);

class TenantPolicyTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'tenant_policy',
      adapter,
      hydrator: hydrator || new ClassMethodsHydrator(),
      primaryKey: 'policy_id',
      entityFactory: row => new TenantPolicyEntity(row)
    });
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  baseColumns() {
    return TenantPolicyEntity.columns();
  }

  _normalizeRows(result) {
    return (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
  }

  // ------------------------------------------------------------
  // Entity reads (backwards compatible; previously returned raw rows)
  // ------------------------------------------------------------

  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from({ tp: this.table }, [])
      .columns(this.baseColumns())
      .where('tp.policy_id = ?', id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new TenantPolicyEntity(rows[0]) : null;
  }

  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from({ tp: this.table }, [])
      .columns(this.baseColumns())
      .where('tp.tenant_id = ?', tenantId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new TenantPolicyEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO projection reads (optional)
  // ------------------------------------------------------------

  async fetchDtoByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from({ tp: this.table }, [])
      .columns(this.baseColumns()) // or specify a smaller projection map
      .where('tp.tenant_id = ?', tenantId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);
    if (!rows.length) return null;

    return new HydratingResultSet(this.hydrator, new TenantPolicyDTO())
      .initialize([rows[0]])
      .current();
  }
}

module.exports = TenantPolicyTable;