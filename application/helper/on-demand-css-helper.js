// application/helper/onDemandCssHelper.js
// View helper to inline module-specific CSS to prevent layout shifts
const fs = require('node:fs');
const path = require('node:path');
const AbstractHelper = require(globalThis.applicationPath('/library/mvc/view/helper/abstract-helper'));

class OnDemandCssHelper extends AbstractHelper {
  /**
   * Load CSS content from a file if it exists and is non-empty.
   * @param {string} absPath - Absolute path to the CSS file
   * @returns {string|null} CSS content or null if unavailable
   */
  _loadCssFile(absPath) {
    if (!fs.existsSync(absPath)) {
      return null;
    }

    try {
      const css = fs.readFileSync(absPath, 'utf8');
      return css.trim() ? css : null;
    } catch (err) {
      // Intentionally ignored - CSS file may not exist for this route; return null to skip inlining
      return null;
    }
  }

  /**
   * Generate inline style tags for module, controller, and action-specific CSS
   * Inlining CSS prevents layout shifts (CLS) by making styles immediately available
   * @param {string} moduleName - Module name
   * @param {string} controllerName - Controller name (optional)
   * @param {string} controllerActionName - Controller action name (optional)
   * @returns {string} HTML style tags with inlined CSS
   */
  cssLinkTag(moduleName, controllerName = null, controllerActionName = null) {
    const basePath = globalThis.applicationPath('/public/css/module');

    // Build the list of candidate CSS file paths
    const candidatePaths = [
      // 1. Module CSS path: /css/module/{moduleName}.css
      path.join(basePath, `${moduleName}.css`),
    ];

    if (controllerName) {
      // 2. Controller CSS path: /css/module/{moduleName}/{controllerName}.css
      candidatePaths.push(path.join(basePath, moduleName, `${controllerName}.css`));
    }

    if (controllerName && controllerActionName) {
      // 3. Action CSS path: /css/module/{moduleName}/{controllerName}/{action}.css
      candidatePaths.push(path.join(basePath, moduleName, controllerName, `${controllerActionName}.css`));
    }

    // Load each candidate and keep non-null results
    const cssContents = candidatePaths
      .map((filePath) => this._loadCssFile(filePath))
      .filter((css) => css !== null);

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