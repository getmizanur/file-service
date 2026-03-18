// application/module/admin/controller/rest/session-keepalive-controller.js
const RestController = require(globalThis.applicationPath('/library/mvc/controller/rest-controller'));

class SessionKeepaliveController extends RestController {

  async postAction() {
    const user = this.getUser();
    if (!user) {
      return this.unauthorized('Session expired');
    }
    return { status: 'ok' };
  }
}

module.exports = SessionKeepaliveController;
