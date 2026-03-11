// application/helper/breadcrumb-helper.js
const AbstractHelper = require(globalThis.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(globalThis.applicationPath('/library/mvc/view/helper/url'));

class BreadcrumbHelper extends AbstractHelper {

  /**
   * Render breadcrumb navigation.
   * @param {Array} breadcrumbs - [{ name, folder_id }, ...]
   * @param {string} viewMode
   * @param {string} layoutMode
   * @param {string} sortMode
   * @returns {string} HTML
   */
  render(...args) {
    const { args: cleanArgs } = this._extractContext(args);
    let [breadcrumbs, viewMode, layoutMode, sortMode] = cleanArgs;

    if (!breadcrumbs || !Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
      return '<nav class="breadcrumb-nav"><span class="breadcrumb-current">My Drive</span></nav>';
    }

    const urlHelper = new UrlHelper();
    const items = breadcrumbs.map((crumb, i) => {
      const isLast = i === breadcrumbs.length - 1;
      const name = this._escape(crumb.name || 'Untitled');

      if (isLast) {
        return `<span class="breadcrumb-current">${name}</span>`;
      }

      const href = urlHelper.fromRoute('adminIndexList', { id: crumb.folder_id }, {
        query: { view: viewMode || 'my-drive', layout: layoutMode || 'grid', sort: sortMode || 'name' }
      });
      return `<a class="breadcrumb-link" href="${href}">${name}</a><span class="breadcrumb-sep"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>`;
    });

    return `<nav class="breadcrumb-nav">${items.join('')}</nav>`;
  }

  _escape(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

module.exports = BreadcrumbHelper;
