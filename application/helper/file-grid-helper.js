// application/helper/file-grid-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(global.applicationPath('/library/mvc/view/helper/url'));

/**
 * FileGridHelper
 *
 * Renders files as a grid of cards.
 */
class FileGridHelper extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs } = this._extractContext(args);
    const [items, starredFileIds = [], viewMode = 'my-drive', layoutMode = 'grid', wrapInRow = true] = cleanArgs;

    if (!items || items.length === 0) {
      return '<div class="col-12 text-muted small">No files in this location</div>';
    }

    const urlHelper = new UrlHelper();

    let html = wrapInRow ? '<div class="row mb-4">' : '';

    items.forEach(item => {
      const isTrash = viewMode === 'trash';
      const isStarred = starredFileIds.includes(item.id);
      const starActionText = isStarred ? 'Remove from Starred' : 'Add to Starred';
      const starIconFill = isStarred ? '#fbbc04' : 'none';
      const starIconStroke = isStarred ? '#fbbc04' : 'currentColor';

      let icon = '';
      let bodyContent = '';
      const deleteId = item.id;

      const queryParams = { id: item.id };
      if (viewMode) queryParams.view = viewMode;
      if (layoutMode) queryParams.layout = layoutMode;

      const starUrl = urlHelper.fromRoute('adminFileStar', null, { query: queryParams });

      // Determine file type and set appropriate icon and badge
      const _fn = item.original_filename || item.name || '';
      const isImage = item.document_type === 'image' ||
        /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(item.name) ||
        /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(_fn);

      // Images - Purple icon with badge
      if (isImage) {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6f42c1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>`;

        bodyContent = `<div class="file-type-badge file-type-badge-image">
                         <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6f42c1" stroke-width="1.5">
                           <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                           <circle cx="8.5" cy="8.5" r="1.5"></circle>
                           <polyline points="21 15 16 10 5 21"></polyline>
                         </svg>
                       </div>`;
      }
      // PDF - Red badge with PDF text
      else if (item.name.endsWith('.pdf')) {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>`;

        bodyContent = `<div class="file-type-badge file-type-badge-pdf">
                         <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="1.5">
                           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                           <polyline points="14 2 14 8 20 8"></polyline>
                         </svg>
                         <div class="file-type-label">PDF</div>
                       </div>`;
      }
      // Excel - Green badge
      else if (/\.(xlsx|xls|csv)$/i.test(item.name)) {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>`;

        bodyContent = `<div class="file-type-badge file-type-badge-excel">
                         <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="1.5">
                           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                           <polyline points="14 2 14 8 20 8"></polyline>
                         </svg>
                         <div class="file-type-label">XLS</div>
                       </div>`;
      }
      // Word - Blue badge
      else if (/\.(docx|doc)$/i.test(item.name)) {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>`;

        bodyContent = `<div class="file-type-badge file-type-badge-word">
                         <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="1.5">
                           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                           <polyline points="14 2 14 8 20 8"></polyline>
                         </svg>
                         <div class="file-type-label">DOC</div>
                       </div>`;
      }
      // PowerPoint - Orange badge
      else if (/\.(pptx|ppt)$/i.test(item.name)) {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4b400" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>`;

        bodyContent = `<div class="file-type-badge file-type-badge-ppt">
                         <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f4b400" stroke-width="1.5">
                           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                           <polyline points="14 2 14 8 20 8"></polyline>
                         </svg>
                         <div class="file-type-label">PPT</div>
                       </div>`;
      }
      // Video - Pink badge
      else if (item.document_type === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(item.name)) {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e83e8c" stroke-width="1.5">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>`;

        bodyContent = `<div class="file-type-badge file-type-badge-video">
                         <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e83e8c" stroke-width="1.5">
                           <polygon points="23 7 16 12 23 17 23 7"></polygon>
                           <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                         </svg>
                       </div>`;
      }
      // ZIP/Archive - Purple badge
      else if (/\.(zip|rar|7z|tar|gz)$/i.test(item.name)) {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>`;

        bodyContent = `<div class="file-type-badge file-type-badge-archive">
                         <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" stroke-width="1.5">
                           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                           <polyline points="14 2 14 8 20 8"></polyline>
                         </svg>
                         <div class="file-type-label">ZIP</div>
                       </div>`;
      }
      // Generic file - Blue
      else {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="1.5">
                 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                 <polyline points="14 2 14 8 20 8"></polyline>
               </svg>`;

        bodyContent = `<div class="grid-card-preview-icon">
                         <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="1.5">
                           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                           <polyline points="14 2 14 8 20 8"></polyline>
                           <line x1="16" y1="13" x2="8" y2="13"></line>
                           <line x1="16" y1="17" x2="8" y2="17"></line>
                           <polyline points="10 9 9 9 8 9"></polyline>
                         </svg>
                       </div>`;
      }

      const date = item.last_modified ? new Date(item.last_modified).toLocaleDateString() : '-';
      const ownerName = item.owner || 'me';
      const ownerInitial = ownerName.charAt(0).toUpperCase();

      const deleteUrl = urlHelper.fromRoute('adminFileDelete', null, { "query": { "id": item.id } });

      const downloadUrl = urlHelper.fromRoute('adminFileDownload', null, { query: { id: item.id } });
      const viewUrl = urlHelper.fromRoute('adminFileView', null, { query: { id: item.id } });

      // Determine preview type for lightbox (check both name and original_filename)
      let previewType = null;
      if (isImage) {
        previewType = 'image';
      } else if (/\.pdf$/i.test(item.name) || /\.pdf$/i.test(_fn)) {
        previewType = 'pdf';
      } else if (item.document_type === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(item.name) || /\.(mp4|mov|avi|mkv|webm)$/i.test(_fn)) {
        previewType = 'video';
      }

      const escapedName = (item.name || '').replace(/'/g, "\\'");
      const previewTypeArg = previewType ? `'${previewType}'` : 'null';

      html += `
        <div class="col-md-3 mb-3">
          <div class="file-grid-card" ${isTrash ? '' : `onclick="handleFileClick(event, '${item.id}', '${escapedName}', ${previewTypeArg}, '${viewUrl}', '${downloadUrl}')"`} style="${isTrash ? '' : 'cursor: pointer;'}">
             <!-- Header -->
             <div class="grid-card-header">
                <div class="grid-card-icon">${item.visibility === 'public'
                    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                      </svg>`
                    : icon}</div>
                <div class="grid-card-title" title="${item.name}">${item.name}</div>
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
                          <a class="dropdown-item" href="/admin/file/restore?id=${item.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                              <path d="M3 3v5h5"></path>
                            </svg>
                            &nbsp;Restore
                          </a>
                        </div>`
                      : `<div class="dropdown-menu dropdown-menu-right shadow-sm border-0">
                          <a class="dropdown-item" href="#" data-file-id="${item.id}" data-file-name="${(item.name || '').replace(/"/g, '&quot;')}" onclick="openShareModal(this.dataset.fileId, this.dataset.fileName); return false;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            &nbsp;Share
                          </a>
                          <a class="dropdown-item copy-public-link-item" href="#"
                             onclick="copyPublicLink(this, '${item.id}'); return false;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${item.visibility === 'public' ? '#007bff' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="2" y1="12" x2="22" y2="12"></line>
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                            &nbsp;<span class="action-label">Copy public link</span>
                          </a>
                          ${item.visibility === 'public' ? `<a class="dropdown-item disable-public-link-item" href="#"
                             onclick="disablePublicLink(this, '${item.id}'); return false;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                            </svg>
                            &nbsp;<span class="action-label">Disable public link</span>
                          </a>` : ''}
                          <a class="dropdown-item" href="${downloadUrl}" target="_blank">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                               <polyline points="7 10 12 15 17 10"></polyline>
                               <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            &nbsp;Download
                          </a>
                          <a class="dropdown-item" href="#" onclick="openMoveFileModal('${item.id}', '${item.folder_id || ''}', '${(item.name || '').replace(/'/g, "\\'")}'); return false;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                              <polyline points="13 2 13 9 20 9"></polyline>
                              <path d="M9 15h6"></path>
                              <path d="M12 18l3-3-3-3"></path>
                            </svg>
                            &nbsp;Move
                          </a>
                          <a class="dropdown-item" href="#" onclick="openRenameFileModal('${item.id}', '${(item.name || '').replace(/'/g, "\\'")}'); return false;">
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
                        </div>`}
                  </div>
                </div>
             </div>
             <!-- Body -->
             <div class="grid-card-body">
                 ${bodyContent}
             </div>
             <!-- Footer -->
             <div class="grid-card-footer">
                <div class="grid-card-avatar" style="background-color: ${stringToColor(ownerName)};">${ownerInitial}</div>
                <div class="grid-card-info">${ownerName === 'me' ? 'You' : ownerName} modified • ${date}</div>
             </div>
          </div>
        </div>
      `;
    });

    // Helper for random color from string
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

module.exports = FileGridHelper;
