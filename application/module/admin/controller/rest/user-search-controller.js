// application/module/admin/controller/rest/user-search-controller.js
const AdminRestController = require('./admin-rest-controller');

class UserSearchController extends AdminRestController {

  /**
   * GET /api/user/search?q=term
   */
  async indexAction() {
    try {
      const tenantId = await this.requireTenantId();
      const term = this.getRequest().getQuery('q');

      if (!term || term.length < 2) {
        return this.ok([]);
      }

      const userTable = await this.getSm().get('UserService').getAppUserTable();
      const results = await userTable.searchByTerm(term, tenantId);

      return this.ok(results.map(u => ({
        id: u.user_id,
        email: u.email,
        name: u.display_name
      })));
    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = UserSearchController;
