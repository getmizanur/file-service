// application/helper/onDemandCssHelper.js
// View helper to inline module-specific CSS to prevent layout shifts
const fs = require('fs');
const path = require('path');
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

class OnDemandCssHelper extends AbstractHelper {
  /**
   * Generate inline style tags for module, controller, and action-specific CSS
   * Inlining CSS prevents layout shifts (CLS) by making styles immediately available
   * @param {string} moduleName - Module name
   * @param {string} controllerName - Controller name (optional)
   * @param {string} controllerActionName - Controller action name (optional)
   * @returns {string} HTML style tags with inlined CSS
   */
  cssLinkTag(moduleName, controllerName = null, controllerActionName = null) {
    const cssContents = [];
    const basePath = global.applicationPath('/public/css/module');

    // 1. Module CSS path: /css/module/{moduleName}.css
    const moduleAbsPath = path.join(basePath, `${moduleName}.css`);
    if (fs.existsSync(moduleAbsPath)) {
      try {
        const css = fs.readFileSync(moduleAbsPath, 'utf8');
        if (css.trim()) {
          cssContents.push(css);
        }
      } catch (err) {
        // Silently ignore read errors
      }
    }

    // 2. Controller CSS path: /css/module/{moduleName}/{controllerName}.css
    if (controllerName) {
      const controllerAbsPath = path.join(basePath, moduleName, `${controllerName}.css`);
      if (fs.existsSync(controllerAbsPath)) {
        try {
          const css = fs.readFileSync(controllerAbsPath, 'utf8');
          if (css.trim()) {
            cssContents.push(css);
          }
        } catch (err) {
          // Silently ignore read errors
        }
      }
    }

    // 3. Action CSS path: /css/module/{moduleName}/{controllerName}/{action}.css
    if (controllerName && controllerActionName) {
      const actionAbsPath = path.join(basePath, moduleName, controllerName, `${controllerActionName}.css`);
      if (fs.existsSync(actionAbsPath)) {
        try {
          const css = fs.readFileSync(actionAbsPath, 'utf8');
          if (css.trim()) {
            cssContents.push(css);
          }
        } catch (err) {
          // Silently ignore read errors
        }
      }
    }

    // Return all CSS in a single style tag
    if (cssContents.length > 0) {
      return `<style>${cssContents.join('\n')}</style>`;
    }

    return '';
  }

  /**
   * Render module, controller, and action-specific CSS
   * Reads module, controller, and action names from Nunjucks context variables set by BaseController
   * @returns {string} HTML style tag with inlined CSS
   */
  render(...args) {
    // Extract Nunjucks context from arguments
    const { context } = this._extractContext(args);

    return this.withContext(context, () => {
      // Get module, controller, and action names from context (set by BaseController in dispatch)
      const moduleName = this.getVariable('_moduleName');
      const controllerName = this.getVariable('_controllerName');
      const actionName = this.getVariable('_actionName');

      if (!moduleName) {
        return '';
      }

      return this.cssLinkTag(moduleName, controllerName, actionName);
    });
  }
}

module.exports = OnDemandCssHelper;