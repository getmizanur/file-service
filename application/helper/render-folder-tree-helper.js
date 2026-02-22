// application/helper/render-folder-tree-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

class RenderFolderTreeHelper extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs } = this._extractContext(args);
    let [items, level = 0, activeId = null, viewMode = 'my-drive', layoutMode = 'grid', expandedIds = []] = cleanArgs;

    // Nunjucks option handling
    if (typeof expandedIds === 'object' && !Array.isArray(expandedIds)) expandedIds = [];

    const result = this._renderRecursive(items, level, activeId, viewMode, layoutMode, expandedIds);
    return result.html;
  }

  _renderRecursive(items, level, activeId, viewMode, layoutMode, expandedIds) {
    if (!items || items.length === 0) {
      return { html: '', isPathActive: false };
    }

    // Nunjucks option check
    if (typeof layoutMode === 'object') layoutMode = 'grid';
    if (typeof viewMode !== 'string') viewMode = 'my-drive';
    if (typeof level !== 'number') level = 0;
    if (!Array.isArray(expandedIds)) expandedIds = [];

    let html = '';
    let isAnyItemActive = false;

    // Lazy load URL helper if not already available
    if (!this.urlHelper) {
      if (this.view && this.view.callbacks && this.view.callbacks.url) {
        this.urlHelper = { fromRoute: this.view.callbacks.url };
      } else {
        const UrlHelper = require(global.applicationPath('/library/mvc/view/helper/url'));
        this.urlHelper = new UrlHelper();
      }
    }

    items.forEach(item => {
      const hasChildren = item.children && item.children.length > 0;
      const collapseId = 'folder-' + item.folder_id;

      const isActive = activeId && (item.folder_id === activeId || item.id === activeId);

      let childrenResult = { html: '', isPathActive: false };

      if (hasChildren) {
        childrenResult = this._renderRecursive(item.children, level + 1, activeId, viewMode, layoutMode, expandedIds);
      }

      // Expand if:
      // 1. Root level (level === 0)
      // 2. Contains active child (path to active)
      // 3. Is active itself
      // 4. Is explicitly expanded in user state
      const isExpandedByUser = expandedIds.includes(String(item.folder_id));
      const shouldExpand = (level === 0) || childrenResult.isPathActive || isActive || isExpandedByUser;

      // Update parent's tracker
      if (shouldExpand) {
        isAnyItemActive = true;
      }

      // URL generation
      let folderUrl = this.urlHelper.fromRoute('adminIndexList', { id: item.folder_id });
      const separator = folderUrl.includes('?') ? '&' : '?';
      let params = [];
      params.push('view=my-drive');
      if (layoutMode && layoutMode !== 'grid') params.push(`layout=${layoutMode}`);
      if (params.length > 0) folderUrl += separator + params.join('&');

      html += '<li>';

      // Indentation logic
      const effectiveLevel = Math.min(level, 4);
      const indentation = effectiveLevel * 16;

      let rowClasses = 'nav-link d-flex align-items-center p-0';
      if (isActive) rowClasses += ' active';

      html += `<div class="${rowClasses}" style="padding-left: ${indentation}px !important;">`;

      // 1. Chevron Column
      html += `<div style="width: 20px; min-width: 20px; display: flex; justify-content: center;">`;
      if (hasChildren) {
        // Rotate chevron if expanded
        const rotation = shouldExpand ? 'transform: rotate(0deg);' : 'transform: rotate(-90deg);';

        html += `<span class="d-flex align-items-center justify-content-center cursor-pointer" 
                       data-toggle="collapse" 
                       data-target="#${collapseId}" 
                       aria-expanded="${shouldExpand}"
                       style="cursor: pointer; width: 20px; height: 20px;">
                    <svg class="caret-icon" style="transition: transform 0.2s; ${rotation}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                 </span>`;
      }
      html += `</div>`;

      // 2. Icon & Label
      html += `<a href="${folderUrl}" 
                  class="d-flex align-items-center flex-grow-1 text-decoration-none text-truncate" 
                  style="color: inherit; padding: 6px 0; width: 100%;">
                  <div style="width: 24px; min-width: 24px; display: flex; justify-content: center; margin-right: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <span class="text-truncate" style="font-size: ${level > 1 ? '0.85rem' : '0.9rem'};">${item.name}</span>
               </a>`;

      html += '</div>';

      // Children Container
      if (hasChildren) {
        const showClass = shouldExpand ? 'show' : '';
        html += `<ul class="collapse list-unstyled ${showClass}" id="${collapseId}">`;
        html += childrenResult.html;
        html += '</ul>';
      }

      html += '</li>';
    });

    return { html, isPathActive: isAnyItemActive };
  }
}

module.exports = RenderFolderTreeHelper;
