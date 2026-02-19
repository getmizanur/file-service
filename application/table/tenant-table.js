const TableGateway = require('../../library/db/table-gateway');
const TenantEntity = require('../entity/tenant-entity');

const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));

const TenantListItemDTO = require(
  global.applicationPath('/application/dto/tenant-list-item-dto')
);

class TenantTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'tenant',
      adapter,
      primaryKey: 'tenant_id',
      // used for DTO hydration and consistent result sets
      hydrator: hydrator || new ClassMethodsHydrator(),
      // preserve legacy entity behavior for full-row reads
      entityFactory: row => new TenantEntity(row)
    });
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  baseColumns() {
    return TenantEntity.columns();
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
  // Entity methods (full row)
  // ------------------------------------------------------------

  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from({ t: this.table }, [])
      .columns(this.baseColumns())
      .where('t.tenant_id = ?', id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new TenantEntity(rows[0]) : null;
  }

  async fetchBySlug(slug) {
    const query = await this.getSelectQuery();
    query.from({ t: this.table }, [])
      .columns(this.baseColumns())
      .where('t.slug = ?', slug)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new TenantEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all tenants for admin list screens (DTO projection)
   * Returns TenantListItemDTO[]
   */
  async fetchAll({ status = null, limit = null, offset = null } = {}) {
    const query = await this.getSelectQuery();

    query.from({ t: this.table }, [])
      .columns({
        tenant_id: 't.tenant_id',
        name: 't.name',
        slug: 't.slug',
        status: 't.status',
        created_dt: 't.created_dt',
        updated_dt: 't.updated_dt'
      })
      .order('t.created_dt', 'DESC');

    if (status) query.where('t.status = ?', status);
    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new TenantListItemDTO());
  }
}

module.exports = TenantTable;