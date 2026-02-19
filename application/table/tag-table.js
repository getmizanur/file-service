const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const TagEntity = require('../entity/tag-entity');
const TagDTO = require('../dto/tag-dto');

class TagTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'tag',
      adapter,
      primaryKey: 'tag_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new TagEntity()
    });
  }

  baseColumns() {
    return TagEntity.columns();
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

  async fetchById(tagId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, tagId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new TagEntity(rows[0]) : null;
  }

  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new TagEntity(r));
  }

  async fetchByName(tenantId, name) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('name = ?', name)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new TagEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all tags for a tenant with file usage count.
   * Returns TagDTO[]
   */
  async fetchByTenantWithDetails(tenantId) {
    const query = await this.getSelectQuery();

    query
      .from({ t: 'tag' }, [])
      .columns({
        tag_id: 't.tag_id',
        tenant_id: 't.tenant_id',
        name: 't.name',
        created_dt: 't.created_dt',

        asset_count: 'COUNT(at.file_id)'
      })
      .joinLeft({ at: 'asset_tag' }, 'at.tag_id = t.tag_id')
      .where('t.tenant_id = ?', tenantId)
      .groupBy('t.tag_id')
      .order('t.name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new TagDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async insert(tenantId, name) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        tenant_id: tenantId,
        name,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new TagEntity(result.insertedRecord);
  }

  async update(tagId, name) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ name })
      .where(`${this.primaryKey} = ?`, tagId);

    return update.execute();
  }

  async deleteById(tagId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where(`${this.primaryKey} = ?`, tagId);

    return del.execute();
  }
}

module.exports = TagTable;
