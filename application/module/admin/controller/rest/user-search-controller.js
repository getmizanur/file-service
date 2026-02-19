const RestController = require('../../../../../library/mvc/controller/rest-controller');

class UserSearchController extends RestController {
  async indexAction() {
    try {
      const req = this.getRequest();
      const term = req.getQuery('q');

      const user = this.getUser();
      if (!user) throw new Error('User not found'); // Should be handled by auth middleware usually

      // We need to resolve tenant. 
      // As per previous patterns, we might need FolderService to get root folder -> tenant_id, 
      // OR we can trust looking up tenant_member for the current user.
      // Let's usage logic consistent with FileShareController: resolve via FolderService if user object doesn't have tenant_id.

      const folderService = this.getServiceManager().get('FolderService');
      const rootFolder = await folderService.getRootFolderByUserEmail(user.email);
      const tenantId = rootFolder.getTenantId();

      if (!term || term.length < 2) {
        return this.ok([]);
      }

      const userService = this.getServiceManager().get('UserService');
      const userTable = await userService.getAppUserTable();

      const results = await userTable.searchByTerm(term, tenantId);

      // Transform for frontend
      const response = results.map(u => ({
        id: u.user_id,
        email: u.email,
        name: u.display_name
      }));

      return this.ok(response);

    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = UserSearchController;
