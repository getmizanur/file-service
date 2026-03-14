// library/mvc/controller/plugin/layout.js
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

    const routeMatch = controller.getRouteMatch ? controller.getRouteMatch() : null;

    // RouteMatch values are already kebab-case (matching route config)
    const module = (routeMatch ? routeMatch.getModule() : null) || 'default';
    const controllerPath = (routeMatch ? routeMatch.getController() : null) || 'index';
    const action = (routeMatch ? routeMatch.getAction() : null) || 'index';

    return `${this.baseDir}/${module}/${controllerPath}/${action}.njk`;
  }
}

module.exports = Layout;