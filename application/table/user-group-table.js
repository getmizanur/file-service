const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const UserGroupEntity = require('../entity/user-group-entity');
const UserGroupDTO = require('../dto/user-group-dto');

class UserGroupTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'user_group',
      adapter,
      primaryKey: 'group_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new UserGroupEntity()
    });
  }

  baseColumns() {
    return UserGroupEntity.columns();
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

  async fetchById(groupId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, groupId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new UserGroupEntity(rows[0]) : null;
  }

  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .order('name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new UserGroupEntity(r));
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

    return rows.length ? new UserGroupEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all groups for a tenant with member count.
   * Returns UserGroupDTO[]
   */
  async fetchByTenantWithDetails(tenantId) {
    const query = await this.getSelectQuery();

    query
      .from({ g: 'user_group' }, [])
      .columns({
        group_id: 'g.group_id',
        tenant_id: 'g.tenant_id',
        name: 'g.name',
        created_dt: 'g.created_dt',

        member_count: 'COUNT(m.user_id)'
      })
      .joinLeft({ m: 'user_group_member' }, 'm.group_id = g.group_id')
      .where('g.tenant_id = ?', tenantId)
      .groupBy('g.group_id')
      .order('g.name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new UserGroupDTO());
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

    return new UserGroupEntity(result.insertedRecord);
  }

  async update(groupId, name) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ name })
      .where(`${this.primaryKey} = ?`, groupId);

    return update.execute();
  }

  async deleteById(groupId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where(`${this.primaryKey} = ?`, groupId);

    return del.execute();
  }
}

module.exports = UserGroupTable;
