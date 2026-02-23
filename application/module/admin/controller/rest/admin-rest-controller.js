// application/module/admin/controller/rest/admin-rest-controller.js
const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));
const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));

class AdminRestController extends RestController {
  getSm() {
    return this.getServiceManager();
  }

  async requireIdentity() {
    const auth = this.getSm().get('AuthenticationService');
    if (!auth.hasIdentity()) {
      const err = new Error('Login required');
      err.statusCode = 401;
      throw err;
    }
    return auth.getIdentity(); // { email, ... }
  }

  async requireUserContext() {
    const identity = await this.requireIdentity();
    const userService = this.getSm().get('UserService');

    // Canonical: always resolve tenant+user the same way
    const userRow = await userService.getUserWithTenantByEmail(identity.email);
    if (!userRow) throw new Error('User not found');

    return {
      email: identity.email,
      user_id: userRow.user_id,
      tenant_id: userRow.tenant_id
    };
  }

  async requireTenantId() {
    const { email } = await this.requireIdentity();
    const folderService = this.getSm().get('FolderService');
    const rootFolder = await folderService.getRootFolderByUserEmail(email);
    return rootFolder.getTenantId();
  }

  validate(schema, data) {
    const filter = InputFilter.factory(schema);
    filter.setData(data);

    if (!filter.isValid()) {
      // If InputFilter exposes messages, include them; if not, keep it generic.
      throw new Error('Invalid request');
    }

    // Optionally return all values; or specific values per schema keys.
    const out = {};
    Object.keys(schema).forEach(k => out[k] = filter.getValue(k));
    return out;
  }
}

module.exports = AdminRestController;