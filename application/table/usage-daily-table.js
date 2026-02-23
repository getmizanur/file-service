// application/table/usage-daily-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const UsageDailyEntity = require('../entity/usage-daily-entity');
const UsageDailyDTO = require('../dto/usage-daily-dto');

class UsageDailyTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'usage_daily',
      adapter,
      primaryKey: 'usage_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new UsageDailyEntity()
    });
  }

  baseColumns() {
    return UsageDailyEntity.columns();
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

  async fetchById(usageId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, usageId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new UsageDailyEntity(rows[0]) : null;
  }

  async fetchByTenantAndDay(tenantId, day) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('day = ?', day)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new UsageDailyEntity(rows[0]) : null;
  }

  async fetchByTenantId(tenantId, { limit = 30 } = {}) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('day', 'DESC')
      .limit(limit);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new UsageDailyEntity(r));
  }

  async fetchByTenantAndDateRange(tenantId, fromDay, toDay) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('day >= ?', fromDay)
      .where('day <= ?', toDay)
      .order('day', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new UsageDailyEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch recent usage for a tenant with tenant name.
   * Returns UsageDailyDTO[]
   */
  async fetchByTenantWithDetails(tenantId, { limit = 30 } = {}) {
    const query = await this.getSelectQuery();

    query
      .from({ u: 'usage_daily' }, [])
      .columns({
        usage_id: 'u.usage_id',
        tenant_id: 'u.tenant_id',
        day: 'u.day',
        storage_bytes: 'u.storage_bytes',
        egress_bytes: 'u.egress_bytes',
        uploads_count: 'u.uploads_count',
        downloads_count: 'u.downloads_count',
        transforms_count: 'u.transforms_count',

        tenant_name: 't.name'
      })
      .joinLeft({ t: 'tenant' }, 't.tenant_id = u.tenant_id')
      .where('u.tenant_id = ?', tenantId)
      .order('u.day', 'DESC')
      .limit(limit);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new UsageDailyDTO());
  }

  /**
   * Fetch usage across all tenants for a given day with tenant names.
   * Returns UsageDailyDTO[]
   */
  async fetchAllByDayWithDetails(day) {
    const query = await this.getSelectQuery();

    query
      .from({ u: 'usage_daily' }, [])
      .columns({
        usage_id: 'u.usage_id',
        tenant_id: 'u.tenant_id',
        day: 'u.day',
        storage_bytes: 'u.storage_bytes',
        egress_bytes: 'u.egress_bytes',
        uploads_count: 'u.uploads_count',
        downloads_count: 'u.downloads_count',
        transforms_count: 'u.transforms_count',

        tenant_name: 't.name'
      })
      .joinLeft({ t: 'tenant' }, 't.tenant_id = u.tenant_id')
      .where('u.day = ?', day)
      .order('t.name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new UsageDailyDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async upsert(tenantId, day, data = {}) {
    const existing = await this.fetchByTenantAndDay(tenantId, day);

    if (existing) {
      return this.update(existing.getUsageId(), data);
    }

    return this.insert(tenantId, day, data);
  }

  async insert(tenantId, day, data = {}) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        tenant_id: tenantId,
        day,
        storage_bytes: data.storageBytes ?? 0,
        egress_bytes: data.egressBytes ?? 0,
        uploads_count: data.uploadsCount ?? 0,
        downloads_count: data.downloadsCount ?? 0,
        transforms_count: data.transformsCount ?? 0
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new UsageDailyEntity(result.insertedRecord);
  }

  async update(usageId, data) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set(data)
      .where(`${this.primaryKey} = ?`, usageId);

    return update.execute();
  }

  /**
   * Fetch-then-update increment for daily counters.
   * Creates the row first via insert() if it does not exist.
   */
  async incrementCounters(tenantId, day, increments = {}) {
    let record = await this.fetchByTenantAndDay(tenantId, day);

    if (!record) {
      record = await this.insert(tenantId, day);
      if (!record) return null;
    }

    const data = {};
    if (increments.storageBytes)    data.storage_bytes    = record.getStorageBytes()    + Number(increments.storageBytes);
    if (increments.egressBytes)     data.egress_bytes     = record.getEgressBytes()     + Number(increments.egressBytes);
    if (increments.uploadsCount)    data.uploads_count    = record.getUploadsCount()    + Number(increments.uploadsCount);
    if (increments.downloadsCount)  data.downloads_count  = record.getDownloadsCount()  + Number(increments.downloadsCount);
    if (increments.transformsCount) data.transforms_count = record.getTransformsCount() + Number(increments.transformsCount);

    if (!Object.keys(data).length) return record;

    return this.update(record.getUsageId(), data);
  }
}

module.exports = UsageDailyTable;
