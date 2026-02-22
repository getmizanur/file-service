const BasePlugin = require('../base-plugin');
const StringUtil = require('../../../util/string-util');

class Layout extends BasePlugin {

  constructor(options = {}) {
    super(options);

    // Optional: allow overriding the base directory (future-proof)
    // e.g. options.baseDir = 'application'
    this.baseDir = options.baseDir || 'application';
  }

  /**
   * Resolve the default view template path for the current request.
   *
   * Output example:
   *   application/<module>/<controller-path>/<action>.njk
   *
   * Where controller-path supports nested controllers via kebab->slash conversion.
   */
  getTemplate() {
    const controller = this.getController();
    if (!controller) {
      // Safe fallback (shouldn't happen if PluginManager injects controller)
      return `${this.baseDir}/default/index/index.njk`;
    }

    const request = controller.getRequest ? controller.getRequest() : null;

    // Allow controller to override template explicitly:
    // - ViewModel.template always wins later, but this helps defaults
    // - Also supports a simple "viewScript" property if you introduce it later
    if (controller && typeof controller.getView === 'function') {
      const viewModel = controller.getView();
      if (viewModel && typeof viewModel.getTemplate === 'function') {
        const tpl = viewModel.getTemplate();
        if (tpl) return tpl;
      }
    }

    const moduleName =
      request && typeof request.getModuleName === 'function'
        ? request.getModuleName()
        : 'default';

    const controllerName =
      request && typeof request.getControllerName === 'function'
        ? request.getControllerName()
        : 'index';

    const actionName =
      request && typeof request.getActionName === 'function'
        ? request.getActionName()
        : 'indexAction';

    const module = StringUtil.toKebabCase(moduleName) || 'default';

    // Convert "ReportDashboard" => "report-dashboard"
    // then "report-dashboard" => "report/dashboard" for nested controller dirs
    const controllerKebab = StringUtil.toKebabCase(controllerName) || 'index';
    const controllerPath = StringUtil.strReplace('-', '/', controllerKebab);

    // Convert "viewAction" => "view"
    const action = (StringUtil.toKebabCase(actionName) || 'index-action')
      .replace('-action', '');

    return `${this.baseDir}/${module}/${controllerPath}/${action}.njk`;
  }
}

module.exports = Layout;