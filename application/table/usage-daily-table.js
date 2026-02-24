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
      primaryKey: ['tenant_id', 'day'],
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
      return this.update(tenantId, day, data);
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
        storage_bytes: data.storage_bytes ?? 0,
        egress_bytes: data.egress_bytes ?? 0,
        uploads_count: data.uploads_count ?? 0,
        downloads_count: data.downloads_count ?? 0,
        transforms_count: data.transforms_count ?? 0
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new UsageDailyEntity(result.insertedRecord);
  }

  async update(tenantId, day, data) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set(data)
      .where('tenant_id = ?', tenantId)
      .where('day = ?', day);

    return update.execute();
  }

  /**
   * Atomic upsert: increment uploads_count and storage_bytes.
   * Uses INSERT ... ON CONFLICT DO UPDATE for atomicity.
   */
  async recordUpload(tenantId, day, sizeBytes) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    return new Insert(this.adapter)
      .into('usage_daily')
      .values({
        tenant_id: tenantId,
        day,
        uploads_count: 1,
        storage_bytes: Number(sizeBytes) || 0
      })
      .onConflict(
        'UPDATE',
        {
          uploads_count: Insert.raw('"usage_daily"."uploads_count" + EXCLUDED."uploads_count"'),
          storage_bytes: Insert.raw('"usage_daily"."storage_bytes" + EXCLUDED."storage_bytes"')
        },
        ['tenant_id', 'day']
      )
      .execute();
  }

  /**
   * Atomic upsert: increment downloads_count and egress_bytes.
   */
  async recordDownload(tenantId, day, bytesServed) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const query = new Insert(this.adapter)
      .into('usage_daily')
      .values({
        tenant_id: tenantId,
        day,
        downloads_count: 1,
        egress_bytes: Number(bytesServed) || 0
      })
      .onConflict(
        'UPDATE',
        {
          downloads_count: Insert.raw('"usage_daily"."downloads_count" + EXCLUDED."downloads_count"'),
          egress_bytes: Insert.raw('"usage_daily"."egress_bytes" + EXCLUDED."egress_bytes"')
        },
        ['tenant_id', 'day']
      )
      .returning(['tenant_id', 'day', 'downloads_count', 'egress_bytes']);

    return query.execute();
  }

  /**
   * Atomic upsert: increment transforms_count.
   */
  async recordTransform(tenantId, day) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    return new Insert(this.adapter)
      .into('usage_daily')
      .values({
        tenant_id: tenantId,
        day,
        transforms_count: 1
      })
      .onConflict(
        'UPDATE',
        {
          transforms_count: Insert.raw(
            '"usage_daily"."transforms_count" + EXCLUDED."transforms_count"'
          )
        },
        ['tenant_id', 'day']
      )
      .returning(['tenant_id', 'day', 'transforms_count'])
      .execute();
  }
}

module.exports = UsageDailyTable;
