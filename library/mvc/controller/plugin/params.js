const BasePlugin = require('../base-plugin');

class Params extends BasePlugin {

  constructor(options = {}) {
    super(options);

    let controller = options.controller;
  }

  fromHeader(header = null, defaultValue = null) {
    let controller = super.getController();
    let request = controller.getRequest();
    return request.getHeader(header, defaultValue);
  }

  fromPost(param = null, defaultValue = null) {
    let controller = super.getController();
    let request = controller.getRequest();
    return request.getPost(param, defaultValue);
  }

  fromQuery(param = null, defaultValue = null) {
    let controller = super.getController();
    let request = controller.getRequest();
    return request.getQuery(param, defaultValue);
  }

  fromRoute(param = null, defaultValue = null) {
    let controller = super.getController();
    let request = controller.getRequest();
    return request.getParam(param, defaultValue);
  }
}

module.exports = Params;
