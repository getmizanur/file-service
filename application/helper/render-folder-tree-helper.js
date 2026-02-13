// application/helper/render-folder-tree-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

class RenderFolderTreeHelper extends AbstractHelper {

  render(items, level = 0, activeId = null, viewMode = 'my-drive', layoutMode = 'grid') {
    if (!items || items.length === 0) {
      return '';
    }

    // Nunjucks passes an options object as the last argument if not specified.
    // We need to be careful with arguments.
    // If layoutMode is the options object, reset it.
    if (typeof layoutMode === 'object') {
      layoutMode = 'grid'; // Default
    }

    if (typeof viewMode !== 'string') {
      viewMode = 'my-drive';
    }

    // ... (level check logic)
    if (typeof level !== 'number') {
      level = 0;
    }

    let html = '';

    // Lazy load URL helper if not already available
    if (!this.urlHelper) {
      if (this.view && this.view.callbacks && this.view.callbacks.url) {
        // If we have access to the view context's url helper
        this.urlHelper = { fromRoute: this.view.callbacks.url };
      } else {
        // Fallback: Manually instantiate or usage global. 
        const UrlHelper = require(global.applicationPath('/library/mvc/view/helper/url'));
        this.urlHelper = new UrlHelper();
      }
    }

    items.forEach(item => {
      const hasChildren = item.children && item.children.length > 0;
      const collapseId = 'folder-' + item.folder_id;

      const isActive = activeId && item.folder_id === activeId;
      const activeClass = isActive ? ' active' : '';

      const paddingLeft = 2.0 + (level * 0.5);

      // Generate URL using helper
      // 'adminIndexList' is the route name for '/'
      let folderUrl = this.urlHelper.fromRoute('adminIndexList', { id: item.folder_id });

      // Determine separator
      const separator = folderUrl.includes('?') ? '&' : '?';

      // Tree links always point to My Drive context (implicit default view)
      // but we MUST persist layout preference.
      let params = [];
      if (layoutMode && layoutMode !== 'grid') {
        params.push(`layout=${layoutMode}`);
      }

      // If we really wanted to support other views in tree, we would check viewMode here.
      // But tree is "My Drive". So we rely on default view='my-drive'.

      if (params.length > 0) {
        folderUrl += separator + params.join('&');
      }

      html += '<li>';

      // Calculate dynamic indentation (16px per level)
      // Cap at level 4 (64px) to prevent excessive nesting from breaking layout
      const effectiveLevel = Math.min(level, 4);
      const indentation = effectiveLevel * 16;

      html += '<li>';

      // Container acting as the row
      // Use standard d-flex align-items-center for the row
      // We will handle indentation via a spacer or padding on the first element
      let rowClasses = 'nav-link d-flex align-items-center p-0';
      if (isActive) rowClasses += ' active';

      html += `<div class="${rowClasses}" style="padding-left: ${indentation}px !important;">`;

      // 1. Chevron Column (Fixed 20px width)
      html += `<div style="width: 20px; min-width: 20px; display: flex; justify-content: center;">`;
      if (hasChildren) {
        html += `<span class="d-flex align-items-center justify-content-center cursor-pointer" 
                       data-toggle="collapse" 
                       data-target="#${collapseId}" 
                       aria-expanded="true"
                       style="cursor: pointer; width: 20px; height: 20px;">
                    <svg class="caret-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                 </span>`;
      }
      html += `</div>`;

      // 2. Icon Column (Fixed 24px width with gap)
      // 3. Label (Flex grow)
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

      html += '</div>'; // End nav-link container

      // Children Container
      if (hasChildren) {
        html += `<ul class="collapse list-unstyled show" id="${collapseId}">`;
        html += this.render(item.children, level + 1, activeId, viewMode, layoutMode);
        html += '</ul>';
      }

      html += '</li>';
    });

    return html;
  }
}

module.exports = RenderFolderTreeHelper;
