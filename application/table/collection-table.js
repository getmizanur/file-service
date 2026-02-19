const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const CollectionEntity = require('../entity/collection-entity');
const CollectionDTO = require('../dto/collection-dto');

class CollectionTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'collection',
      adapter,
      primaryKey: 'collection_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new CollectionEntity()
    });
  }

  baseColumns() {
    return CollectionEntity.columns();
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

  async fetchById(collectionId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, collectionId)
      .where('deleted_at IS NULL')
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new CollectionEntity(rows[0]) : null;
  }

  async fetchByTenantId(tenantId, { limit = null, offset = null } = {}) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('deleted_at IS NULL')
      .order('created_dt', 'DESC');

    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new CollectionEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all collections for a tenant with creator display name.
   * Returns CollectionDTO[]
   */
  async fetchByTenantWithDetails(tenantId, { limit = null, offset = null } = {}) {
    const query = await this.getSelectQuery();

    query
      .from({ c: 'collection' }, [])
      .columns({
        collection_id: 'c.collection_id',
        tenant_id: 'c.tenant_id',
        name: 'c.name',
        description: 'c.description',
        created_by: 'c.created_by',
        created_dt: 'c.created_dt',
        updated_dt: 'c.updated_dt',
        deleted_at: 'c.deleted_at',
        deleted_by: 'c.deleted_by',

        creator_display_name: 'u.display_name'
      })
      .joinLeft({ u: 'app_user' }, 'u.user_id = c.created_by')
      .where('c.tenant_id = ?', tenantId)
      .where('c.deleted_at IS NULL')
      .order('c.created_dt', 'DESC');

    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new CollectionDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async insert(collectionId, tenantId, name, description, createdBy) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        collection_id: collectionId,
        tenant_id: tenantId,
        name,
        description,
        created_by: createdBy,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new CollectionEntity(result.insertedRecord);
  }

  async update(collectionId, data) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ ...data, updated_dt: new Date() })
      .where(`${this.primaryKey} = ?`, collectionId);

    return update.execute();
  }

  async softDelete(collectionId, deletedBy) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({
        deleted_at: new Date(),
        deleted_by: deletedBy
      })
      .where(`${this.primaryKey} = ?`, collectionId);

    return update.execute();
  }
}

module.exports = CollectionTable;
