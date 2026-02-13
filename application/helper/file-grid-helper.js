const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(global.applicationPath('/library/mvc/view/helper/url'));

/**
 * FileGridHelper
 *
 * Renders files as a grid of cards.
 */
class FileGridHelper extends AbstractHelper {

  render(items, starredFileIds = [], viewMode = 'my-drive', layoutMode = 'grid') {
    if (!items || items.length === 0) {
      return '<div class="col-12 text-muted small">No files in this location</div>';
    }

    const urlHelper = new UrlHelper();

    let html = '<div class="row mb-4">';

    items.forEach(item => {
      const isStarred = starredFileIds.includes(item.id);
      const starActionText = isStarred ? 'Remove from Starred' : 'Add to Starred';
      const starIconFill = isStarred ? '#fbbc04' : 'none';
      const starIconStroke = isStarred ? '#fbbc04' : 'currentColor';

      let icon = '';
      const deleteId = item.id;

      const queryParams = { id: item.id };
      if (viewMode) queryParams.view = viewMode;
      if (layoutMode) queryParams.layout = layoutMode;

      const starUrl = urlHelper.fromRoute('adminFileStar', null, { query: queryParams });

      const deleteUrl = urlHelper.fromRoute('adminFileDelete', null, { "query": { "id": deleteId } });

      if (item.document_type === 'image') {
        icon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6f42c1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>`;
      } else if (item.document_type === 'video') {
        icon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e83e8c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>`;
      } else if (item.name.endsWith('.pdf')) {
        icon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
               </svg>`;
      } else if (item.name.endsWith('.xlsx')) {
        icon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="8" y1="13" x2="16" y2="13"></line>
                  <line x1="8" y1="17" x2="16" y2="17"></line>
                  <line x1="10" y1="9" x2="14" y2="9"></line>
               </svg>`;
      } else {
        // Generic file icon
        icon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>`;
      }

      const date = item.last_modified ? new Date(item.last_modified).toLocaleDateString() : '-';

      html += `
        <div class="col-md-3 mb-3">
          <div class="card file-card">
            <div class="card-img-top">
              ${icon}
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center flex-nowrap">
                  <h5 class="card-title text-truncate flex-grow-1 mb-0" title="${item.name}" style="min-width: 0;">${item.name}</h5>
                  <div class="dropdown show-on-hover pl-2">
                    <button class="btn btn-link btn-sm p-0 text-muted" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right shadow-sm border-0">
                      <a class="dropdown-item" href="#">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                          <polyline points="16 6 12 2 8 6"></polyline>
                          <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                        &nbsp;Share
                      </a>
                      <a class="dropdown-item" href="#">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                           <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                           <polyline points="7 10 12 15 17 10"></polyline>
                           <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        &nbsp;Download
                      </a>
                      <a class="dropdown-item" href="#" onclick="openRenameFileModal('${item.id}', '${item.name.replace(/'/g, "\\'")}'); return false;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                        &nbsp;Rename
                      </a>
                      <a class="dropdown-item" href="${starUrl}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${starIconFill}" stroke="${starIconStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                           <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        &nbsp;${starActionText}
                      </a>
                      <div class="dropdown-divider"></div>
                      <a class="dropdown-item text-danger" href="#" onclick="openDeleteModal('${deleteUrl}'); return false;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        &nbsp;Move to trash
                      </a>
                    </div>
                  </div>
              </div>
              <p class="card-text text-muted small">You edited • ${date}</p>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }
}

module.exports = FileGridHelper;
