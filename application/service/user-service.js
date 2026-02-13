const AbstractService = require('./abstract-service');
const AppUserTable = require('../table/app-user-table');

class UserService extends AbstractService {
  constructor() {
    super();
  }

  async getAppUserTable() {
    const adapter = await this.initializeDatabase();
    return new AppUserTable({ adapter });
  }

  async getUserByEmail(email) {
    const table = await this.getAppUserTable();
    return table.fetchByEmail(email);
  }

  async getUserById(id) {
    const table = await this.getAppUserTable();
    return table.fetchById(id);
  }

  /**
   * Get user with tenant info by email
   * Returns plain object (not Entity) for compatibility
   * @param {string} email
   */
  async getUserWithTenantByEmail(email) {
    const table = await this.getAppUserTable();
    const adapter = table.getAdapter();
    const Select = require(global.applicationPath('/library/db/sql/select'));

    const query = new Select(adapter)
      .from({ u: 'app_user' }, ['u.user_id', 'u.email', 'u.display_name', 'tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', email)
      .limit(1);

    const rows = await query.execute();
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = UserService;
