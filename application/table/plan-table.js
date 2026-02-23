// application/table/plan-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const PlanEntity = require('../entity/plan-entity');
const PlanDTO = require('../dto/plan-dto');

class PlanTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'plan',
      adapter,
      primaryKey: 'plan_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new PlanEntity()
    });
  }

  baseColumns() {
    return PlanEntity.columns();
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

  async fetchById(planId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, planId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new PlanEntity(rows[0]) : null;
  }

  async fetchByCode(code) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('code = ?', code)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new PlanEntity(rows[0]) : null;
  }

  async fetchAll() {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .order('monthly_price_pence', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new PlanEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all plans with active tenant count per plan.
   * Returns PlanDTO[]
   */
  async fetchAllWithDetails() {
    const query = await this.getSelectQuery();

    query
      .from({ p: 'plan' }, [])
      .columns({
        plan_id: 'p.plan_id',
        code: 'p.code',
        name: 'p.name',
        monthly_price_pence: 'p.monthly_price_pence',
        max_upload_size_bytes: 'p.max_upload_size_bytes',
        max_assets_count: 'p.max_assets_count',
        max_collections_count: 'p.max_collections_count',
        included_storage_bytes: 'p.included_storage_bytes',
        included_egress_bytes: 'p.included_egress_bytes',
        can_share_links: 'p.can_share_links',
        can_derivatives: 'p.can_derivatives',
        can_video_transcode: 'p.can_video_transcode',
        can_ai_indexing: 'p.can_ai_indexing',
        created_dt: 'p.created_dt',

        tenant_count: 'COUNT(s.subscription_id)'
      })
      .joinLeft({ s: 'subscription' }, 's.plan_id = p.plan_id')
      .groupBy('p.plan_id')
      .order('p.monthly_price_pence', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new PlanDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async insert(data) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        code: data.code,
        name: data.name,
        monthly_price_pence: data.monthlyPricePence ?? 0,
        max_upload_size_bytes: data.maxUploadSizeBytes ?? null,
        max_assets_count: data.maxAssetsCount ?? null,
        max_collections_count: data.maxCollectionsCount ?? null,
        included_storage_bytes: data.includedStorageBytes ?? 0,
        included_egress_bytes: data.includedEgressBytes ?? 0,
        can_share_links: data.canShareLinks ?? true,
        can_derivatives: data.canDerivatives ?? true,
        can_video_transcode: data.canVideoTranscode ?? false,
        can_ai_indexing: data.canAiIndexing ?? false,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new PlanEntity(result.insertedRecord);
  }

  async update(planId, data) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set(data)
      .where(`${this.primaryKey} = ?`, planId);

    return update.execute();
  }
}

module.exports = PlanTable;
