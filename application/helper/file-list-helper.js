// application/helper/file-list-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(global.applicationPath('/library/mvc/view/helper/url'));

class FileListHelper extends AbstractHelper {

  render(items, starredFileIds = [], viewMode = 'my-drive', layoutMode = 'list') {
    if (!items || items.length === 0) {
      return '<tr><td colspan="5" class="text-center text-muted">No files or folders found.</td></tr>';
    }

    let html = '';

    items.forEach(item => {
      const isStarred = starredFileIds.includes(item.id);
      const starActionText = isStarred ? 'Remove from Starred' : 'Add to Starred';
      const starIconFill = isStarred ? '#fbbc04' : 'none'; // Google yellow for star
      const starIconStroke = isStarred ? '#fbbc04' : 'currentColor';

      // ... (icon selection logic remains same)

      // Icon selection based on item_type
      let icon = '';
      if (item.item_type === 'folder') {
        icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>`;
      } else {
        // ... (keep existing icon logic)
        // Generic file icon
        icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>`;

        if (item.document_type === 'image') {
          icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6f42c1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>`;
        } else if (item.document_type === 'video') {
          icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e83e8c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>`;
        } else if (item.name.endsWith('.pdf')) {
          icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>`;
        } else if (item.name.endsWith('.xlsx')) {
          icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="8" y1="13" x2="16" y2="13"></line>
                  <line x1="8" y1="17" x2="16" y2="17"></line>
                  <line x1="10" y1="9" x2="14" y2="9"></line>
               </svg>`;
        }
      }

      // Size formatting
      let sizeDisplay = '-';
      if (item.size_bytes) {
        const size = parseInt(item.size_bytes);
        if (size < 1024) sizeDisplay = size + ' B';
        else if (size < 1024 * 1024) sizeDisplay = (size / 1024).toFixed(1) + ' KB';
        else sizeDisplay = (size / (1024 * 1024)).toFixed(1) + ' MB';
      }

      // Date formatting
      const date = item.last_modified ? new Date(item.last_modified).toLocaleDateString() : '-';

      const deleteId = item.item_type === 'folder' ? (item.folder_id || item.id) : item.id;
      const urlHelper = new UrlHelper();

      // Construct links preserving view/layout if needed
      // Delete URL usually redirects back to 'referrer' or a fixed path. 
      // If we want to stay in same view/layout after delete, we might need to pass it.
      // But standard 'adminFileDelete' likely redirects to 'adminIndexList' which might default to grid.
      // We can pass query params to the delete URL that the controller might use?
      // For now, let's just generate the basic links. view/layout persistence across actions 
      // (like delete) usually requires the controller to look at the 'Ref' or pass 'redirect' param.
      // The user only asked to fix the parameters in the URL, not necessarily the action flows yet.
      // But for star/unstar it is an AJAX call or reload? "adminFileStar".

      const queryParams = { id: item.id };
      if (viewMode) queryParams.view = viewMode;
      if (layoutMode) queryParams.layout = layoutMode;

      const starUrl = urlHelper.fromRoute('adminFileStar', null, { query: queryParams });

      // Delete might not support view/layout params unless controller does.
      // Let's passed them anyway, controller might ignore them or we might update controller later.
      const deleteUrl = urlHelper.fromRoute('adminFileDelete', null, { "query": { "id": deleteId } });

      // Construct detail/view link
      let viewLink = `/?id=${item.id}`;
      if (viewMode) viewLink += `&view=${viewMode}`;
      if (layoutMode) viewLink += `&layout=${layoutMode}`;

      html += `<tr onclick="location.href='${viewLink}'" class="list-row file-row" style="cursor: pointer;">
                <td class="align-middle name-cell">
                  <div class="d-flex align-items-center">
                    ${icon}
                    <span class="font-weight-500 text-dark">${item.name}</span>
                  </div>
                </td>
                <td class="align-middle text-muted small">${item.owner || 'me'}</td>
                <td class="align-middle text-muted small">${date}</td>
                <td class="align-middle text-muted small text-right">${sizeDisplay}</td>
                <td class="align-middle text-right">
              <div class="d-flex justify-content-end align-items-center row-actions">
                <div class="quick-actions d-none d-md-flex align-items-center mr-2">
                   <button class="btn btn-icon btn-sm fade-in-action" title="Share" onclick="event.stopPropagation();">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                   </button>
                   <button class="btn btn-icon btn-sm fade-in-action" title="Download" onclick="event.stopPropagation();">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                         <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                         <polyline points="7 10 12 15 17 10"></polyline>
                         <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                   </button>
                   <button class="btn btn-icon btn-sm fade-in-action" title="Rename" onclick="openRenameFileModal('${item.id}', '${item.name.replace(/'/g, "\\'")}'); event.stopPropagation();">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                   </button>
                   <a href="${starUrl}" class="btn btn-icon btn-sm fade-in-action" title="${starActionText}" onclick="event.stopPropagation();">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="${starIconFill}" stroke="${starIconStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                         <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                   </a>
                </div>
                <div class="dropdown show-on-hover">
                  <button class="btn btn-icon btn-sm text-muted" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onclick="event.stopPropagation();">
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
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                      </svg>
                      &nbsp;Move to trash
                    </a>
                  </div>
                </div>
              </div>
          </td>
              </tr>`;
    });

    return html;
  }
}

module.exports = FileListHelper;
