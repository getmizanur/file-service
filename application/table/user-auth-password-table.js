// application/table/user-auth-password-table.js
const TableGateway = require('../../library/db/table-gateway');
const UserAuthPasswordEntity = require('../entity/user-auth-password-entity');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);
const HydratingResultSet = require(
  global.applicationPath('/library/db/result-set/hydrating-result-set')
);

const UserAuthPasswordDTO = require(
  global.applicationPath('/application/dto/user-auth-password-dto')
);

class UserAuthPasswordTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'user_auth_password',
      adapter,
      primaryKey: 'user_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      // Keep entity hydration for full row operations
      entityFactory: row => new UserAuthPasswordEntity(row)
    });
  }

  baseColumns() {
    return UserAuthPasswordEntity.columns();
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
  // ENTITY READ
  // ------------------------------------------------------------

  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from({ uap: this.table })
      .columns(this.baseColumns())
      .where('uap.user_id = ?', userId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new UserAuthPasswordEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO PROJECTION (safe fields only)
  // ------------------------------------------------------------

  async fetchSecurityProfile(userId) {
    const query = await this.getSelectQuery();

    query.from({ uap: this.table }, [])
      .columns({
        user_id: 'uap.user_id',
        password_algo: 'uap.password_algo',
        password_updated_dt: 'uap.password_updated_dt',
        failed_attempts: 'uap.failed_attempts',
        locked_until: 'uap.locked_until',
        last_login_dt: 'uap.last_login_dt',
        created_dt: 'uap.created_dt'
      })
      .where('uap.user_id = ?', userId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    if (!rows.length) return null;

    return new HydratingResultSet(this.hydrator, new UserAuthPasswordDTO())
      .initialize([rows[0]])
      .current();
  }

  async fetchAllSecurityProfiles({ limit = 50, offset = 0 } = {}) {
    const query = await this.getSelectQuery();

    query.from({ uap: this.table }, [])
      .columns({
        user_id: 'uap.user_id',
        password_algo: 'uap.password_algo',
        password_updated_dt: 'uap.password_updated_dt',
        failed_attempts: 'uap.failed_attempts',
        locked_until: 'uap.locked_until',
        last_login_dt: 'uap.last_login_dt',
        created_dt: 'uap.created_dt'
      })
      .order('uap.created_dt', 'DESC');

    if (limit != null) query.limit(limit);
    if (offset != null) query.offset(offset);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new UserAuthPasswordDTO());
  }
}

module.exports = UserAuthPasswordTable;
