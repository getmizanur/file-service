// application/helper/folder-grid-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(global.applicationPath('/library/mvc/view/helper/url'));

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
  render(...args) {
    const { args: cleanArgs } = this._extractContext(args);
    const [folders, viewMode = 'my-drive', layoutMode = 'grid', starredFolderIds = [], wrapInRow = true] = cleanArgs;

    const urlHelper = new UrlHelper();

    if (!folders || folders.length === 0) {
      return '<div class="col-12 text-muted small">No folders in this location</div>';
    }

    let html = wrapInRow ? '<div class="row mb-4">' : '';

    folders.forEach(folder => {
      const isTrash = viewMode === 'trash';
      // Use toObject if it's an entity, or access directly
      const item = typeof folder.toObject === 'function' ? folder.toObject() : folder;
      const folderId = item.folder_id || item.id;
      const name = item.name;
      const isStarred = (item.is_starred || (starredFolderIds && starredFolderIds.includes(folderId)));

      // URL generation
      let link = `/?id=${folderId}`;
      if (viewMode) link += `&view=${viewMode}`;
      if (layoutMode) link += `&layout=${layoutMode}`;

      const date = item.updated_dt ? new Date(item.updated_dt).toLocaleDateString() : (item.created_dt ? new Date(item.created_dt).toLocaleDateString() : '-');
      const ownerName = item.owner || item.created_by || 'me';
      const ownerInitial = ownerName.charAt(0).toUpperCase();

      const deleteUrl = urlHelper.fromRoute('adminFolderDelete', null, { "query": { "id": folderId } });

      const downloadUrl = urlHelper.fromRoute('adminFolderDownload', null, { "query": { "id": folderId } });

      html += `
        <div class="col-md-3 mb-3">
          <div class="folder-grid-card" ${isTrash ? '' : `onclick="location.href='${link}'"`} style="${isTrash ? '' : 'cursor: pointer;'}">
            <!-- Header -->
            <div class="grid-card-header">
               <div class="grid-card-icon">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="#5f6368" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path>
                 </svg>
               </div>
               <div class="grid-card-title" title="${name}">${name}</div>
               ${viewMode === 'search' && item.location ? `<div class="text-muted small text-truncate d-flex align-items-center" style="max-width: 160px; font-size: 0.75rem; gap: 3px;" title="${item.location_path || ''}"><svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> ${item.location}</div>` : ''}
               <div class="grid-card-actions">
                  <div class="dropdown show-on-hover pl-2" onclick="event.stopPropagation();">
                    <button class="btn btn-link btn-sm p-0 text-muted" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    ${isTrash
                      ? `<div class="dropdown-menu dropdown-menu-right shadow-sm border-0">
                          <a class="dropdown-item d-flex align-items-center" href="/admin/folder/restore?id=${folderId}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                              <path d="M3 3v5h5"></path>
                            </svg>
                            &nbsp;Restore
                          </a>
                        </div>`
                      : `<div class="dropdown-menu dropdown-menu-right shadow-sm border-0" style="width: 280px;">
                          <a class="dropdown-item d-flex align-items-center" href="#" onclick="toggleFolderStar('${folderId}', this); return false;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isStarred ? '#fbbc04' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                               <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            &nbsp;Star
                          </a>
                          <a class="dropdown-item d-flex align-items-center" href="${downloadUrl}" target="_blank">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                               <polyline points="7 10 12 15 17 10"></polyline>
                               <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            &nbsp;Download
                          </a>
                          <a class="dropdown-item d-flex align-items-center" href="#" onclick="openMoveFolderModal('${folderId}', '${item.parent_folder_id || ''}', '${(name || '').replace(/'/g, "\\'")}'); return false;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                              <polyline points="13 2 13 9 20 9"></polyline>
                              <path d="M9 15h6"></path>
                              <path d="M12 18l3-3-3-3"></path>
                            </svg>
                            &nbsp;Move
                          </a>
                          <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" onclick="openRenameModal('${folderId}', '${(name || '').replace(/'/g, "\\'")}'); return false;">
                            <div class="d-flex align-items-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                </svg>
                                &nbsp;Rename
                            </div>
                            <span class="text-muted small">⌥⌘E</span>
                          </a>
                          <div class="dropdown-divider"></div>
                          <div class="dropdown-submenu">
                            <a class="dropdown-item dropdown-toggle d-flex justify-content-between align-items-center" href="#">
                                <div class="d-flex align-items-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                      <polyline points="16 6 12 2 8 6"></polyline>
                                      <line x1="12" y1="2" x2="12" y2="15"></line>
                                    </svg>
                                    &nbsp;Share
                                </div>
                            </a>
                            <div class="dropdown-menu">
                               <a class="dropdown-item" href="#" data-file-id="${folderId}" data-file-name="${(name || '').replace(/"/g, '&quot;')}" onclick="openShareModal(this.dataset.fileId, this.dataset.fileName); return false;">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                  </svg>
                                  &nbsp;Share
                               </a>
                               <a class="dropdown-item copy-public-link-item" href="#"
                                  onclick="copyPublicLink(this, '${folderId}'); return false;">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${item.visibility === 'public' ? '#007bff' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                  </svg>
                                  &nbsp;<span class="action-label">Copy public link</span>
                               </a>
                               ${item.visibility === 'public' ? `<a class="dropdown-item disable-public-link-item" href="#"
                                  onclick="disablePublicLink(this, '${folderId}'); return false;">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                  </svg>
                                  &nbsp;<span class="action-label">Disable public link</span>
                               </a>` : ''}
                            </div>
                          </div>
                          <a class="dropdown-item d-flex justify-content-between align-items-center" href="#">
                            <div class="d-flex align-items-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-muted">
                                   <circle cx="12" cy="12" r="10"></circle>
                                   <line x1="12" y1="16" x2="12" y2="12"></line>
                                   <line x1="12" y1="8" x2="12" y2="8"></line>
                                </svg>
                                &nbsp;Folder information
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted">
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </a>
                          <div class="dropdown-divider"></div>
                          <a class="dropdown-item d-flex justify-content-between align-items-center text-danger" href="#" onclick="openDeleteModal('${deleteUrl}'); event.stopPropagation(); return false;">
                            <div class="d-flex align-items-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                &nbsp;Move to trash
                            </div>
                            <span class="text-muted small">Delete</span>
                          </a>
                        </div>`}
                  </div>
               </div>
            </div>
            <!-- Body -->
            <div class="grid-card-body">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="#5f6368" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path>
               </svg>
            </div>
            <!-- Footer -->
            <div class="grid-card-footer">
                <div class="grid-card-avatar" style="background-color: ${stringToColor(ownerName)};">${ownerInitial}</div>
                <div class="grid-card-info">${ownerName === 'me' ? 'You' : ownerName} created • ${date}</div>
            </div>
          </div>
        </div>
      `;
    });

    // Helper for random color from string (if not already defined in global scope or needed separately)
    function stringToColor(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      let color = '#';
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
      }
      return color;
    }


    if (wrapInRow) html += '</div>';
    return html;
  }
}

module.exports = FolderGridHelper;
