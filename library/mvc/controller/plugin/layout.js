const BasePlugin = require('../base-plugin');
const StringUtil = require('../../../util/string-util');

class Layout extends BasePlugin {

  constructor(options = {}) {
    super(options);
  }

  getTemplate() {
    let request = super.getController().getRequest();
    let module = StringUtil.toKebabCase(request.getModuleName()) || "default";
    let controller = StringUtil.toKebabCase(request.getControllerName());
    let action = StringUtil.toKebabCase(request.getActionName()).replace('-action', '');
    let dir = `application/${module}`;

    return dir + '/' + StringUtil.strReplace('-', '/', controller) +
      '/' + action + '.njk';
  }

}

module.exports = Layout;
