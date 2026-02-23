// application/table/app-user-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const AppUserEntity = require('../entity/app-user-entity');
const UserSearchDTO = require('../dto/user-search-dto');
const UserTenantDTO = require('../dto/user-tenant-dto');
const UserWithTenantDTO = require('../dto/user-with-tenant-dto');

class AppUserTable extends TableGateway {

  constructor({ adapter, hydrator }) {
    super({
      table: 'app_user',
      adapter,
      primaryKey: 'user_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new AppUserEntity()
    });
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  baseColumns() {
    return Object.keys(AppUserEntity.schema);
  }

  /**
   * These return hydrated AppUserEntity because your TableGateway
   * already has hydrator + objectPrototype configured.
   */
  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);

    const result = await this.select(query); // hydrated entities
    return result.length ? result[0] : null;
  }

  async fetchByEmail(email) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('email = ?', email)
      .limit(1);

    const result = await this.select(query); // hydrated entities
    return result.length ? result[0] : null;
  }

  async fetchByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const uniqueIds = [...new Set(ids)];

    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .whereIn(this.primaryKey, uniqueIds);

    return this.select(query); // hydrated entities
  }

  async searchByTerm(term, tenantId, limit = 10) {
    const query = await this.getSelectQuery();

    query.from({ u: 'app_user' }, ['u.user_id', 'u.email', 'u.display_name'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('tm.tenant_id = ?', tenantId)
      .where('u.status = ?', 'active');

    if (term) {
      const likeTerm = `%${term.toLowerCase()}%`;
      const p1 = query._addParameter(likeTerm);
      const p2 = query._addParameter(likeTerm);
      query.where(`(LOWER(u.email) LIKE ${p1} OR LOWER(u.display_name) LIKE ${p2})`);
    }

    query.limit(limit).order('u.display_name', 'ASC');

    // Hydrate join rows into a DTO
    const rs = new HydratingResultSet(
      new ClassMethodsHydrator(),
      new UserSearchDTO()
    );

    return this.select(query, { resultSet: rs });
  }

  /**
   * Resolve user_id + tenant_id by email (active users only).
   * Returns { userId, tenantId } (camelCase) via hydrator mapping.
   */
  async resolveByEmail(email) {
    const query = await this.getSelectQuery();
    query.from({ u: this.table }, ['u.user_id', 'tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', email)
      .where("u.status = 'active'")
      .limit(1);

    const rs = new HydratingResultSet(
      new ClassMethodsHydrator(),
      new UserTenantDTO()
    );

    const result = await this.select(query, { resultSet: rs });

    if (!result.length) {
      throw new Error(`User not found for email: ${email}`);
    }

    return result[0];
  }

  /**
   * Fetch user + tenant info by email (no status filter).
   * Returns { userId, email, displayName, tenantId } or null.
   */
  async fetchWithTenantByEmail(email) {
    const query = await this.getSelectQuery();
    query.from({ u: this.table }, ['u.user_id', 'u.email', 'u.display_name', 'tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', email)
      .limit(1);

    const rs = new HydratingResultSet(
      new ClassMethodsHydrator(),
      new UserWithTenantDTO()
    );

    const result = await this.select(query, { resultSet: rs });
    return result.length ? result[0] : null;
  }
  /**
   * Find a user by email within a specific tenant.
   * Returns { userId, tenantId } (camelCase) or null if not found.
   */
  async fetchByEmailInTenant(tenantId, email) {
    const query = await this.getSelectQuery();
    query.from({ au: this.table }, [])
      .columns({ user_id: 'au.user_id', tenant_id: 'tm.tenant_id' })
      .join({ tm: 'tenant_member' }, 'tm.user_id = au.user_id')
      .where('tm.tenant_id = ?', tenantId)
      .where('au.email = ?', email)
      .limit(1);

    const rs = new HydratingResultSet(
      new ClassMethodsHydrator(),
      new UserTenantDTO()
    );
    const result = await this.select(query, { resultSet: rs });
    return result.length ? result[0] : null;
  }
}

module.exports = AppUserTable;