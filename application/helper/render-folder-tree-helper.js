// application/helper/render-folder-tree-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

class RenderFolderTreeHelper extends AbstractHelper {

  render(items, level = 0, activeId = null, viewMode = 'grid') {
    if (!items || items.length === 0) {
      return '';
    }

    // Sanitize viewMode: ensure it is a string, otherwise default to 'grid'
    if (typeof viewMode !== 'string') {
      viewMode = 'grid';
    }

    // Nunjucks passes an options object as the last argument if not specified.
    // Ensure level is a number.
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

      // Indentation: We apply it to the link wrapper or the link itself.
      // To keep the full row hover effect of .nav-link, we might want the CONTAINER to have .nav-link class?
      // But .nav-link has padding.
      // Let's make the container the .nav-link relative, but remove default padding and manage it internally.
      // Actually, admin.css targets .sidebar .nav-link.

      const paddingLeft = 2.0 + (level * 0.5);

      // Generate URL using helper
      // 'adminIndexList' is the route name for '/'
      let folderUrl = this.urlHelper.fromRoute('adminIndexList', { id: item.folder_id });

      // Determine separator
      const separator = folderUrl.includes('?') ? '&' : '?';

      if (viewMode && viewMode !== 'grid') {
        folderUrl += `${separator}view=${viewMode}`;
      }

      html += '<li>';

      // Container acting as the row
      html += `<div class="nav-link d-flex align-items-center justify-content-between p-0${activeClass}" style="padding-left: ${paddingLeft}rem !important;">`;

      // 1. Navigation Link (Icon + Name)
      // We apply standard nav-link styling (color, etc) but override padding
      html += `<a href="${folderUrl}" 
                  class="d-flex align-items-center flex-grow-1 text-decoration-none" 
                  style="color: inherit; padding: 0.5rem 0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>${item.name}</span>
               </a>`;

      // 2. Toggle Caret (if children)
      if (hasChildren) {
        html += `<span class="d-flex align-items-center justify-content-center cursor-pointer p-2" 
                       data-toggle="collapse" 
                       data-target="#${collapseId}" 
                       aria-expanded="true"
                       style="cursor: pointer;">
                    <svg class="caret-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                 </span>`;
      } else {
        // Spacer to keep alignment if needed, or just nothing.
        // html += `<span class="p-2" style="width: 30px;"></span>`; 
      }

      html += '</div>'; // End nav-link container

      // Children Container
      if (hasChildren) {
        html += `<ul class="collapse list-unstyled show" id="${collapseId}">`;
        html += this.render(item.children, level + 1, activeId, viewMode);
        html += '</ul>';
      }

      html += '</li>';
    });

    return html;
  }
}

module.exports = RenderFolderTreeHelper;
