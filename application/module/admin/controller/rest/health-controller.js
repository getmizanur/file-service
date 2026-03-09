// application/module/admin/controller/rest/health-controller.js
const RestController = require(globalThis.applicationPath('/library/mvc/controller/rest-controller'));

class HealthController extends RestController {

  async indexAction() {
    return this.ok({ status: 'ok' });
  }
}

module.exports = HealthController;
