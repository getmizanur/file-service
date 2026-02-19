const AbstractService = require('./abstract-service');

class UserService extends AbstractService {

  getAppUserTable() {
    return this.getServiceManager().get('AppUserTable');
  }

  async getUserByEmail(email) {
    return this.getAppUserTable().fetchByEmail(email);
  }

  async getUserById(id) {
    return this.getAppUserTable().fetchById(id);
  }

  async getUserWithTenantByEmail(email) {
    return this.getAppUserTable().fetchWithTenantByEmail(email);
  }
}

module.exports = UserService;
