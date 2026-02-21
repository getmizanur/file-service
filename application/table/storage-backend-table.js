const TableGateway = require('../../library/db/table-gateway');
const StorageBackendEntity = require('../entity/storage-backend-entity');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);
const HydratingResultSet = require(
  global.applicationPath('/library/db/result-set/hydrating-result-set')
);

const StorageBackendListItemDTO = require(
  global.applicationPath('/application/dto/storage-backend-list-item-dto')
);

class StorageBackendTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'storage_backend',
      adapter,
      hydrator: hydrator || new ClassMethodsHydrator(),
      primaryKey: 'storage_backend_id',
      entityFactory: row => new StorageBackendEntity(row)
    });
  }

  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }

  baseColumns() {
    return StorageBackendEntity.columns();
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
  // Entity reads (backwards compatible, but now returns entities)
  // ------------------------------------------------------------

  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from({ sb: this.table }, [])
      .columns(this.baseColumns())
      .where('sb.storage_backend_id = ?', id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new StorageBackendEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO reads (projection/list use)
  // ------------------------------------------------------------

  async fetchByTenantId(tenantId) {
    const query = await this.getSelectQuery();
    query.from({ sb: this.table }, [])
      .columns({
        storage_backend_id: 'sb.storage_backend_id',
        name: 'sb.name',
        provider: 'sb.provider',
        delivery: 'sb.delivery',
        is_enabled: 'sb.is_enabled',
        config: 'sb.config',
        created_dt: 'sb.created_dt',
        updated_dt: 'sb.updated_dt'
      })
      .order('sb.provider', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new StorageBackendListItemDTO());
  }

  async fetchAll() {
    const query = await this.getSelectQuery();
    query.from({ sb: this.table }, [])
      .columns({
        storage_backend_id: 'sb.storage_backend_id',
        name: 'sb.name',
        provider: 'sb.provider',
        delivery: 'sb.delivery',
        is_enabled: 'sb.is_enabled',
        config: 'sb.config',
        created_dt: 'sb.created_dt',
        updated_dt: 'sb.updated_dt'
      });

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new StorageBackendListItemDTO());
  }
}

module.exports = StorageBackendTable;