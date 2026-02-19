const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const FolderEntity = require(global.applicationPath('/application/entity/folder-entity'));

const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));

const FolderWithOwnerDTO = require(
  global.applicationPath('/application/dto/folder-with-owner-dto')
);

class FolderTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'folder',
      adapter,
      primaryKey: 'folder_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new FolderEntity()
    });
  }

  baseColumns() {
    // base entity columns (no projection)
    return FolderEntity.columns().filter(col => col !== 'owner');
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  // ---------- Entity methods (FolderEntity) ----------

  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .where('deleted_at IS NULL')
      .limit(1);

    const result = await this.select(query); // FolderEntity[]
    return result.length ? result[0] : null;
  }

  async fetchByTenant(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('deleted_at IS NULL')
      .order('name');

    return this.select(query); // FolderEntity[]
  }

  // ---------- DTO methods (FolderWithOwnerDTO) ----------

  async fetchByParent(parentId, tenantId) {
    const query = await this.getSelectQuery();

    query
      .from({ f: this.table }, [])
      .columns({
        folder_id: 'f.folder_id',
        tenant_id: 'f.tenant_id',
        parent_folder_id: 'f.parent_folder_id',
        name: 'f.name',
        created_by: 'f.created_by',
        created_dt: 'f.created_dt',
        updated_by: 'f.updated_by',
        updated_dt: 'f.updated_dt',
        deleted_at: 'f.deleted_at',
        deleted_by: 'f.deleted_by',
        owner: 'u.display_name'
      })
      .joinLeft({ u: 'app_user' }, 'u.user_id = f.created_by')
      .where('f.tenant_id = ?', tenantId)
      .where('f.parent_folder_id = ?', parentId)
      .where('f.deleted_at IS NULL')
      .order('f.name', 'ASC');

    const rs = new HydratingResultSet(
      this.hydrator || new ClassMethodsHydrator(),
      new FolderWithOwnerDTO()
    );

    return this.select(query, { resultSet: rs }); // FolderWithOwnerDTO[]
  }

  async fetchByUserEmail(email) {
    const query = await this.getSelectQuery();

    query
      .from({ f: this.table }, [])
      .columns({
        folder_id: 'f.folder_id',
        tenant_id: 'f.tenant_id',
        parent_folder_id: 'f.parent_folder_id',
        name: 'f.name',
        created_by: 'f.created_by',
        created_dt: 'f.created_dt',
        updated_by: 'f.updated_by',
        updated_dt: 'f.updated_dt',
        deleted_at: 'f.deleted_at',
        deleted_by: 'f.deleted_by',
        owner: 'creator.display_name'
      })
      .join({ tm: 'tenant_member' }, 'f.tenant_id = tm.tenant_id', [])
      .join({ u: 'app_user' }, 'tm.user_id = u.user_id', [])
      .joinLeft({ creator: 'app_user' }, 'creator.user_id = f.created_by')
      .where('u.email = ?', email)
      .where('f.deleted_at IS NULL')
      .order('f.name');

    const rs = new HydratingResultSet(
      this.hydrator || new ClassMethodsHydrator(),
      new FolderWithOwnerDTO()
    );

    return this.select(query, { resultSet: rs }); // FolderWithOwnerDTO[]
  }
  async fetchByIdIncludeDeleted(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);

    const result = await this.select(query);
    return result.length ? result[0] : null;
  }

  async fetchRootByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('parent_folder_id IS NULL')
      .where('deleted_at IS NULL')
      .limit(1);

    const result = await this.select(query);
    return result.length ? result[0] : null;
  }

  async create(data) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));
    const result = await new Insert(this.adapter)
      .into(this.table)
      .set(data)
      .returning([this.primaryKey])
      .execute();

    if (result && result.insertedRecord) return result.insertedRecord[this.primaryKey];
    if (result && result.insertedId) return result.insertedId;
    return null;
  }
}

module.exports = FolderTable;