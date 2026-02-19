const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const IntegrationPolicyOverrideEntity = require('../entity/integration-policy-override-entity');
const IntegrationPolicyOverrideDTO = require('../dto/integration-policy-override-dto');

class IntegrationPolicyOverrideTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'integration_policy_override',
      adapter,
      primaryKey: 'integration_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new IntegrationPolicyOverrideEntity()
    });
  }

  baseColumns() {
    return IntegrationPolicyOverrideEntity.columns();
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

  async fetchByIntegrationId(integrationId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, integrationId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new IntegrationPolicyOverrideEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch a single override with integration and storage backend details.
   * Returns IntegrationPolicyOverrideDTO | null
   */
  async fetchByIntegrationWithDetails(integrationId) {
    const query = await this.getSelectQuery();

    query
      .from({ p: 'integration_policy_override' }, [])
      .columns({
        integration_id: 'p.integration_id',
        storage_backend_id: 'p.storage_backend_id',
        key_template: 'p.key_template',
        presigned_url_ttl_seconds: 'p.presigned_url_ttl_seconds',
        retention_days: 'p.retention_days',
        av_required: 'p.av_required',
        allowed_mime_types: 'p.allowed_mime_types',
        default_visibility: 'p.default_visibility',
        max_upload_size_bytes: 'p.max_upload_size_bytes',
        updated_dt: 'p.updated_dt',

        integration_name: 'i.name',

        backend_name: 'sb.name',
        backend_provider: 'sb.provider'
      })
      .joinLeft({ i: 'integration' }, 'i.integration_id = p.integration_id')
      .joinLeft({ sb: 'storage_backend' }, 'sb.storage_backend_id = p.storage_backend_id')
      .where('p.integration_id = ?', integrationId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    if (!rows.length) return null;

    return this._hydrateToDtoArray(rows, new IntegrationPolicyOverrideDTO())[0];
  }

  /**
   * Fetch all overrides for a tenant (resolved via integration JOIN).
   * Returns IntegrationPolicyOverrideDTO[]
   */
  async fetchByTenantWithDetails(tenantId) {
    const query = await this.getSelectQuery();

    query
      .from({ p: 'integration_policy_override' }, [])
      .columns({
        integration_id: 'p.integration_id',
        storage_backend_id: 'p.storage_backend_id',
        key_template: 'p.key_template',
        presigned_url_ttl_seconds: 'p.presigned_url_ttl_seconds',
        retention_days: 'p.retention_days',
        av_required: 'p.av_required',
        allowed_mime_types: 'p.allowed_mime_types',
        default_visibility: 'p.default_visibility',
        max_upload_size_bytes: 'p.max_upload_size_bytes',
        updated_dt: 'p.updated_dt',

        integration_name: 'i.name',

        backend_name: 'sb.name',
        backend_provider: 'sb.provider'
      })
      .join({ i: 'integration' }, 'i.integration_id = p.integration_id')
      .joinLeft({ sb: 'storage_backend' }, 'sb.storage_backend_id = p.storage_backend_id')
      .where('i.tenant_id = ?', tenantId)
      .order('i.name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new IntegrationPolicyOverrideDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async upsert(integrationId, data) {
    const existing = await this.fetchByIntegrationId(integrationId);

    if (existing) {
      return this.update(integrationId, data);
    }

    return this.insert(integrationId, data);
  }

  async insert(integrationId, data) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        integration_id: integrationId,
        storage_backend_id: data.storageBackendId ?? null,
        key_template: data.keyTemplate ?? null,
        presigned_url_ttl_seconds: data.presignedUrlTtlSeconds ?? null,
        retention_days: data.retentionDays ?? null,
        av_required: data.avRequired ?? null,
        allowed_mime_types: data.allowedMimeTypes ?? null,
        default_visibility: data.defaultVisibility ?? null,
        max_upload_size_bytes: data.maxUploadSizeBytes ?? null,
        updated_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new IntegrationPolicyOverrideEntity(result.insertedRecord);
  }

  async update(integrationId, data) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ ...data, updated_dt: new Date() })
      .where(`${this.primaryKey} = ?`, integrationId);

    return update.execute();
  }

  async deleteByIntegrationId(integrationId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where(`${this.primaryKey} = ?`, integrationId);

    return del.execute();
  }
}

module.exports = IntegrationPolicyOverrideTable;
