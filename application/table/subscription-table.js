const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const SubscriptionEntity = require('../entity/subscription-entity');
const SubscriptionDTO = require('../dto/subscription-dto');

class SubscriptionTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'subscription',
      adapter,
      primaryKey: 'subscription_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new SubscriptionEntity()
    });
  }

  baseColumns() {
    return SubscriptionEntity.columns();
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
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
  // Entity methods
  // ------------------------------------------------------------

  async fetchById(subscriptionId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, subscriptionId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new SubscriptionEntity(rows[0]) : null;
  }

  async fetchCurrentByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('created_dt', 'DESC')
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new SubscriptionEntity(rows[0]) : null;
  }

  async fetchAllByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new SubscriptionEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch the current subscription for a tenant with plan and tenant details.
   * Returns SubscriptionDTO | null
   */
  async fetchCurrentByTenantWithDetails(tenantId) {
    const query = await this.getSelectQuery();

    query
      .from({ s: 'subscription' }, [])
      .columns({
        subscription_id: 's.subscription_id',
        tenant_id: 's.tenant_id',
        plan_id: 's.plan_id',
        status: 's.status',
        current_period_start: 's.current_period_start',
        current_period_end: 's.current_period_end',
        external_ref: 's.external_ref',
        created_dt: 's.created_dt',

        tenant_name: 't.name',

        plan_name: 'p.name',
        plan_code: 'p.code',
        monthly_price_pence: 'p.monthly_price_pence'
      })
      .joinLeft({ t: 'tenant' }, 't.tenant_id = s.tenant_id')
      .joinLeft({ p: 'plan' }, 'p.plan_id = s.plan_id')
      .where('s.tenant_id = ?', tenantId)
      .order('s.created_dt', 'DESC')
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    if (!rows.length) return null;

    return this._hydrateToDtoArray(rows, new SubscriptionDTO())[0];
  }

  /**
   * Fetch all subscriptions across all tenants with tenant and plan details.
   * Returns SubscriptionDTO[]
   */
  async fetchAllWithDetails({ limit = null, offset = null } = {}) {
    const query = await this.getSelectQuery();

    query
      .from({ s: 'subscription' }, [])
      .columns({
        subscription_id: 's.subscription_id',
        tenant_id: 's.tenant_id',
        plan_id: 's.plan_id',
        status: 's.status',
        current_period_start: 's.current_period_start',
        current_period_end: 's.current_period_end',
        external_ref: 's.external_ref',
        created_dt: 's.created_dt',

        tenant_name: 't.name',

        plan_name: 'p.name',
        plan_code: 'p.code',
        monthly_price_pence: 'p.monthly_price_pence'
      })
      .joinLeft({ t: 'tenant' }, 't.tenant_id = s.tenant_id')
      .joinLeft({ p: 'plan' }, 'p.plan_id = s.plan_id')
      .order('s.created_dt', 'DESC');

    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new SubscriptionDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async insert(data) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        tenant_id: data.tenantId,
        plan_id: data.planId,
        status: data.status,
        current_period_start: data.currentPeriodStart,
        current_period_end: data.currentPeriodEnd,
        external_ref: data.externalRef ?? null,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new SubscriptionEntity(result.insertedRecord);
  }

  async update(subscriptionId, data) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set(data)
      .where(`${this.primaryKey} = ?`, subscriptionId);

    return update.execute();
  }

  async updateStatus(subscriptionId, status) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ status })
      .where(`${this.primaryKey} = ?`, subscriptionId);

    return update.execute();
  }
}

module.exports = SubscriptionTable;
