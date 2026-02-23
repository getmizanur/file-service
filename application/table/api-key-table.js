// application/table/api-key-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const ApiKeyEntity = require('../entity/api-key-entity');
const ApiKeyDTO = require('../dto/api-key-dto');

class ApiKeyTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'api_key',
      adapter,
      primaryKey: 'api_key_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new ApiKeyEntity()
    });
  }

  baseColumns() {
    return ApiKeyEntity.columns();
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

  async fetchById(apiKeyId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, apiKeyId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new ApiKeyEntity(rows[0]) : null;
  }

  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new ApiKeyEntity(r));
  }

  async fetchByIntegrationId(integrationId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('integration_id = ?', integrationId)
      .order('created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new ApiKeyEntity(r));
  }

  async fetchByTenantAndIntegration(tenantId, integrationId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('integration_id = ?', integrationId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new ApiKeyEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all API keys for a tenant with integration name.
   * Returns ApiKeyDTO[]
   */
  async fetchByTenantWithDetails(tenantId) {
    const query = await this.getSelectQuery();

    query
      .from({ ak: 'api_key' }, [])
      .columns({
        api_key_id: 'ak.api_key_id',
        tenant_id: 'ak.tenant_id',
        integration_id: 'ak.integration_id',
        name: 'ak.name',
        last_used_dt: 'ak.last_used_dt',
        created_dt: 'ak.created_dt',
        revoked_dt: 'ak.revoked_dt',

        integration_name: 'i.name'
      })
      .joinLeft({ i: 'integration' }, 'i.integration_id = ak.integration_id')
      .where('ak.tenant_id = ?', tenantId)
      .order('ak.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new ApiKeyDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async insertKey(tenantId, name, keyHash, integrationId = null) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        tenant_id: tenantId,
        integration_id: integrationId,
        name,
        key_hash: keyHash,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new ApiKeyEntity(result.insertedRecord);
  }

  async revokeKey(apiKeyId) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ revoked_dt: new Date() })
      .where('api_key_id = ?', apiKeyId);

    return update.execute();
  }

  async updateLastUsed(apiKeyId) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ last_used_dt: new Date() })
      .where('api_key_id = ?', apiKeyId);

    return update.execute();
  }
}

module.exports = ApiKeyTable;
