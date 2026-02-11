const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

/**
 * FolderGridHelper
 *
 * Renders a grid of folders for the main view.
 */
class FolderGridHelper extends AbstractHelper {

  /**
   * Render folder grid
   * @param {Array} folders
   * @param {string} viewMode
   * @returns {string} HTML
   */
  render(folders, viewMode = 'grid') {
    if (!folders || folders.length === 0) {
      return '<div class="col-12 text-muted small">No folders in this location</div>';
    }

    let html = '<div class="row mb-4">';

    folders.forEach(folder => {
      // Use toObject if it's an entity, or access directly
      const item = typeof folder.toObject === 'function' ? folder.toObject() : folder;
      const folderId = item.folder_id || item.id;
      const name = item.name;

      // URL generation
      let link = `/?id=${folderId}`;
      if (viewMode && viewMode !== 'grid') {
        link += `&view=${viewMode}`;
      }

      html += `
        <div class="col-md-3 mb-3">
          <div class="card folder-card h-100" onclick="location.href='${link}'" style="cursor: pointer;">
            <div class="card-body d-flex align-items-center p-3 flex-nowrap">
              <div class="folder-icon mr-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#5f6368" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path>
                </svg>
              </div>
              <div class="folder-name text-truncate flex-grow-1" title="${name}" style="font-weight: 500; font-size: 0.9rem; color: #3c4043; min-width: 0;">
                ${name}
              </div>
              <!-- Kebab Menu -->
              <div class="dropdown show-on-hover pl-2">
                <button class="btn btn-link btn-sm p-0 text-muted" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                  </svg>
                </button>
                <div class="dropdown-menu dropdown-menu-right shadow-sm border-0" style="width: 280px;">
                  <a class="dropdown-item d-flex align-items-center" href="#">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                       <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                       <polyline points="7 10 12 15 17 10"></polyline>
                       <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                  </a>
                  <a class="dropdown-item d-flex justify-content-between align-items-center" href="#">
                    <div class="d-flex align-items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                        Rename
                    </div>
                    <span class="text-muted small">⌥⌘E</span>
                  </a>
                  <div class="dropdown-divider"></div>

                   <a class="dropdown-item d-flex justify-content-between align-items-center" href="#">
                    <div class="d-flex align-items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                          <polyline points="16 6 12 2 8 6"></polyline>
                          <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                        Share
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </a>

                  <a class="dropdown-item d-flex justify-content-between align-items-center" href="#">
                    <div class="d-flex align-items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                           <circle cx="12" cy="12" r="10"></circle>
                           <line x1="12" y1="16" x2="12" y2="12"></line>
                           <line x1="12" y1="8" x2="12" y2="8"></line>
                        </svg>
                        Folder information
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </a>
                  <div class="dropdown-divider"></div>
                   <a class="dropdown-item d-flex justify-content-between align-items-center text-danger" href="#">
                    <div class="d-flex align-items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Move to trash
                    </div>
                    <span class="text-muted small">Delete</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }
}

module.exports = FolderGridHelper;
