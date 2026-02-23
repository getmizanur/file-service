// application/service/domain/user-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');

class UserService extends AbstractDomainService {

  async getUserByEmail(email) {
    return this.getTable('AppUserTable').fetchByEmail(email);
  }

  async getUserById(id) {
    return this.getTable('AppUserTable').fetchById(id);
  }

  async getUserWithTenantByEmail(email) {
    return this.getTable('AppUserTable').fetchWithTenantByEmail(email);
  }
}

module.exports = UserService;
