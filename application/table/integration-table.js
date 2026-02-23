// application/table/integration-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const IntegrationEntity = require('../entity/integration-entity');
const IntegrationDTO = require('../dto/integration-dto');

class IntegrationTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'integration',
      adapter,
      primaryKey: 'integration_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new IntegrationEntity()
    });
  }

  baseColumns() {
    return IntegrationEntity.columns();
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

  async fetchById(integrationId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, integrationId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new IntegrationEntity(rows[0]) : null;
  }

  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new IntegrationEntity(r));
  }

  async fetchByCode(tenantId, code) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('code = ?', code)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new IntegrationEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all integrations for a tenant with tenant name.
   * Returns IntegrationDTO[]
   * Note: webhook_secret_hash is excluded from projection.
   */
  async fetchByTenantWithDetails(tenantId) {
    const query = await this.getSelectQuery();

    query
      .from({ i: 'integration' }, [])
      .columns({
        integration_id: 'i.integration_id',
        tenant_id: 'i.tenant_id',
        code: 'i.code',
        name: 'i.name',
        status: 'i.status',
        webhook_url: 'i.webhook_url',
        created_dt: 'i.created_dt',
        updated_dt: 'i.updated_dt',

        tenant_name: 't.name'
      })
      .joinLeft({ t: 'tenant' }, 't.tenant_id = i.tenant_id')
      .where('i.tenant_id = ?', tenantId)
      .order('i.name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new IntegrationDTO());
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
        code: data.code,
        name: data.name,
        status: data.status ?? IntegrationEntity.STATUS.ACTIVE,
        webhook_url: data.webhookUrl ?? null,
        webhook_secret_hash: data.webhookSecretHash ?? null,
        created_dt: new Date(),
        updated_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new IntegrationEntity(result.insertedRecord);
  }

  async update(integrationId, data) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ ...data, updated_dt: new Date() })
      .where(`${this.primaryKey} = ?`, integrationId);

    return update.execute();
  }

  async updateStatus(integrationId, status) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ status, updated_dt: new Date() })
      .where(`${this.primaryKey} = ?`, integrationId);

    return update.execute();
  }

  async updateWebhookSecret(integrationId, webhookSecretHash) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ webhook_secret_hash: webhookSecretHash, updated_dt: new Date() })
      .where(`${this.primaryKey} = ?`, integrationId);

    return update.execute();
  }
}

module.exports = IntegrationTable;
