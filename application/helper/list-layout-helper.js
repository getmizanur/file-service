// application/helper/list-layout-helper.js
const AbstractHelper = require(globalThis.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(globalThis.applicationPath('/library/mvc/view/helper/url'));

/**
 * ListLayoutHelper
 *
 * Renders a unified list (table rows) of mixed folders + files.
 * Each item must have an `item_type` field: 'folder' or 'file'.
 */
class ListLayoutHelper extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs } = this._extractContext(args);
    const [items, starredFolderIds = [], starredFileIds = [], viewMode = 'my-drive', layoutMode = 'list'] = cleanArgs;

    if (!items || items.length === 0) {
      return '';
    }

    let rows = '';
    const urlHelper = new UrlHelper();

    items.forEach(item => {
      if (item.item_type === 'folder') {
        rows += this._renderFolderRow(item, starredFolderIds, viewMode, layoutMode, urlHelper);
      } else {
        rows += this._renderFileRow(item, starredFileIds, viewMode, layoutMode, urlHelper);
      }
    });

    const locationViews = ['search', 'trash', 'starred', 'recent', 'shared-with-me', 'my-drive'];
    const locationHeader = locationViews.includes(viewMode) ? '<th scope="col">Location</th>' : '';

    return `<div class="table-responsive">
      <table class="table table-hover" id="file-list-table">
        <thead>
          <tr>
            <th scope="col" class="checkbox-cell" style="width: 40px;">
              <label class="list-checkbox-label">
                <input type="checkbox" class="list-checkbox" id="select-all-checkbox" title="Select all">
                <span class="list-checkbox-custom"></span>
              </label>
            </th>
            <th scope="col" style="width: 40%;">Name</th>
            <th scope="col">Owner</th>
            ${locationHeader}
            <th scope="col">Last Modified</th>
            <th scope="col" class="text-right">File Size</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`;
  }

  _renderAccessIcon(item) {
    if (item.visibility === 'public') {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Public" style="margin-left:6px;flex-shrink:0;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>`;
    }
    if (item.is_shared) {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none" title="Shared" style="margin-left:6px;flex-shrink:0;">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>`;
    }
    return '';
  }

  _renderLocationCell(item, viewMode) {
    const locationViews = ['search', 'trash', 'starred', 'recent', 'shared-with-me', 'my-drive'];
    if (!locationViews.includes(viewMode)) return '';
    const _f = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
    const _d = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
    const _c = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    const loc = item.location || '';
    const folderId = item.item_type === 'folder' ? (item.parent_folder_id || '') : (item.folder_id || '');
    const pathParts = (item.location_path || loc).split(' / ').filter(Boolean);
    const crumbs = pathParts.map((p, i) =>
      `<span class="location-crumb">${i === 0 ? _d : _f}&nbsp;${p}</span>`
    ).join(`<span class="location-chevron">${_c}</span>`);
    const tooltip = pathParts.length > 0
      ? '<div class="location-tooltip-popup">' + crumbs + '</div>'
      : '';
    return `<td class="align-middle text-muted small"><div class="location-cell" data-folder-id="${folderId}"><span class="location-name">${_f}&nbsp;${loc}</span>${tooltip}</div></td>`;
  }

  _formatSize(sizeBytes) {
    if (!sizeBytes) return '-';
    const size = Number.parseInt(sizeBytes);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  _renderFolderRow(item, starredFolderIds, viewMode, layoutMode, urlHelper) {
    const isTrash = viewMode === 'trash';
    const folderId = item.folder_id || item.id;
    const name = item.name;
    const dateSource = item.updated_dt || item.created_dt;
    const date = dateSource ? new Date(dateSource).toLocaleDateString() : '-';
    const locationTd = this._renderLocationCell(item, viewMode);

    const linkRoute = 'adminMyDrive';
    const viewQueryParams = { id: folderId };
    if (layoutMode) viewQueryParams.layout = layoutMode;

    const link = urlHelper.fromRoute(linkRoute, null, { query: viewQueryParams });
    const trOnclick = isTrash ? '' : `onclick="location.href='${link}'"`;
    const starFill = (item.is_starred || starredFolderIds?.includes(folderId)) ? '#fbbc04' : 'none';

    const quickActions = isTrash
      ? `<a href="/admin/folder/restore?id=${folderId}"
            class="btn btn-sm btn-outline-secondary fade-in-action"
            title="Restore from trash"
            onclick="event.stopPropagation();">Restore</a>`
      : `<button class="btn btn-icon btn-sm fade-in-action" title="Share" onclick="event.stopPropagation();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
         </button>
         <button class="btn btn-icon btn-sm fade-in-action" title="Download" onclick="globalThis.location.href='/admin/folder/download?id=${folderId}'; event.stopPropagation();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
               <polyline points="7 10 12 15 17 10"></polyline>
               <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
         </button>
         <button class="btn btn-icon btn-sm fade-in-action" title="Rename" onclick="openRenameModal('${folderId}', '${(name || '').replaceAll("'", String.raw`\'`)}'); event.stopPropagation();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
         </button>
         <button class="btn btn-icon btn-sm fade-in-action" title="Star" onclick="toggleFolderStar('${folderId}', this); event.stopPropagation();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${starFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
         </button>`;

    return `
      <tr ${trOnclick} class="list-row folder-row" style="${isTrash ? '' : 'cursor: pointer;'}" data-item-id="${folderId}" data-item-type="folder" data-prefetch-id="${folderId}">
        <td class="align-middle checkbox-cell" onclick="event.stopPropagation();">
          <label class="list-checkbox-label">
            <input type="checkbox" class="list-checkbox row-checkbox" data-item-id="${folderId}" data-item-type="folder" data-item-name="${(name || '').replaceAll('"', '&quot;')}">
            <span class="list-checkbox-custom"></span>
          </label>
        </td>
        <td class="align-middle name-cell">
           <div class="d-flex align-items-center">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path>
             </svg>
             <span class="font-weight-500 text-dark">${name}</span>
             ${this._renderAccessIcon(item)}
             ${this._renderStarIcon(item.is_starred || starredFolderIds?.includes(folderId))}
           </div>
        </td>
        <td class="align-middle text-muted small">${item.owner || item.created_by || 'me'}</td>
        ${locationTd}
        <td class="align-middle text-muted small">${date}</td>
        <td class="align-middle text-muted small text-right">-</td>
        <td class="align-middle text-right">
            <div class="d-flex justify-content-end align-items-center row-actions">
              <div class="quick-actions d-none d-md-flex align-items-center mr-2">
                 ${quickActions}
              </div>
              ${isTrash ? '' : `<div class="dropdown show-on-hover" onclick="event.stopPropagation();">
                <button class="btn btn-icon btn-sm text-muted" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                  </svg>
                </button>
              </div>`}
            </div>
        </td>
      </tr>`;
  }

  _resolveFileIcon(item) {
    if (item.document_type === 'image') {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6f42c1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>`;
    }
    if (item.document_type === 'video') {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e83e8c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>`;
    }
    if (item.name?.endsWith('.pdf')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>`;
    }
    if (item.name?.endsWith('.xlsx')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="8" y1="13" x2="16" y2="13"></line>
              <line x1="8" y1="17" x2="16" y2="17"></line>
              <line x1="10" y1="9" x2="14" y2="9"></line>
           </svg>`;
    }
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>`;
  }

  _resolvePreviewType(item) {
    const _fn = item.original_filename || item.name || '';
    if (item.document_type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(item.name || '') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(_fn)) {
      return 'image';
    }
    if (/\.pdf$/i.test(item.name || '') || /\.pdf$/i.test(_fn)) {
      return 'pdf';
    }
    if (item.document_type === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(item.name || '') || /\.(mp4|mov|avi|mkv|webm)$/i.test(_fn)) {
      return 'video';
    }
    return null;
  }

  _renderPreviewPopup(thumbnailUrl) {
    if (!thumbnailUrl) return '';
    return `<div class="file-preview-popup" style="display:none;position:fixed;z-index:9999;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.18);padding:4px;">
           <img src="${thumbnailUrl}" alt="" style="max-width:200px;max-height:200px;border-radius:6px;display:block;">
         </div>`;
  }

  _renderFileQuickActions(item, isTrash, opts) {
    const { starUrl, starActionText, starIconFill, starIconStroke } = opts;
    if (isTrash) {
      return `<a href="/admin/file/restore?id=${item.id}"
            class="btn btn-sm btn-outline-secondary fade-in-action"
            title="Restore from trash"
            onclick="event.stopPropagation();">Restore</a>`;
    }
    return `<button class="btn btn-icon btn-sm fade-in-action"
                 title="${item.visibility === 'public' ? 'Public Link Active' : 'Enable Public Link'}"
                 type="button"
                 data-visibility="${item.visibility || 'private'}"
                 onclick="togglePublicLink(this, '${item.id}'); event.stopPropagation();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${item.visibility === 'public' ? '#007bff' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"></circle>
               <line x1="2" y1="12" x2="22" y2="12"></line>
               <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
         </button>
         <button class="btn btn-icon btn-sm fade-in-action" title="Share" type="button" data-file-id="${item.id}" data-file-name="${(item.name || '').replaceAll('"', '&quot;')}" onclick="openShareModal(this.dataset.fileId, this.dataset.fileName); event.stopPropagation();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
         </button>
         <button class="btn btn-icon btn-sm fade-in-action" title="Download" type="button" onclick="globalThis.location.href='/admin/file/download?id=${item.id}'; event.stopPropagation();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
               <polyline points="7 10 12 15 17 10"></polyline>
               <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
         </button>
         <button class="btn btn-icon btn-sm fade-in-action" title="Rename" type="button" onclick="openRenameFileModal('${item.id}', '${(item.name || '').replaceAll("'", String.raw`\'`)}', '${(item.original_filename || '').replaceAll("'", String.raw`\'`)}'); event.stopPropagation();">
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
`;
  }

  _renderFileRow(item, starredFileIds, viewMode, layoutMode, urlHelper) {
    const isTrash = viewMode === 'trash';
    const isStarred = starredFileIds.includes(item.id);
    const starActionText = isStarred ? 'Remove from Starred' : 'Add to Starred';
    const starIconFill = isStarred ? '#fbbc04' : 'none';
    const starIconStroke = isStarred ? '#fbbc04' : 'currentColor';

    // Thumbnail URL for files that have generated derivatives
    const thumbnailUrl = item.has_thumbnail
      ? urlHelper.fromRoute('adminFileDerivative', null, { query: { id: item.id, kind: 'thumbnail', size: '256' } })
      : null;

    const icon = this._resolveFileIcon(item);
    const previewPopup = this._renderPreviewPopup(thumbnailUrl);

    const sizeDisplay = this._formatSize(item.size_bytes);
    const date = item.last_modified ? new Date(item.last_modified).toLocaleDateString() : '-';
    const locationTd = this._renderLocationCell(item, viewMode);

    const starUrl = urlHelper.fromRoute('adminFileStar', null, { query: { id: item.id } });
    const deleteUrl = urlHelper.fromRoute('adminFileDelete', null, { query: { id: item.id } });

    const previewType = this._resolvePreviewType(item);

    const viewUrl = urlHelper.fromRoute('adminFileView', null, { query: { id: item.id } });
    const downloadUrl = urlHelper.fromRoute('adminFileDownload', null, { query: { id: item.id } });
    const escapedName = (item.name || '').replaceAll("'", String.raw`\'`);
    const previewTypeArg = previewType ? `'${previewType}'` : 'null';

    const trOnclick = isTrash ? '' : `onclick="handleFileClick(event, '${item.id}', '${escapedName}', ${previewTypeArg}, '${viewUrl}', '${downloadUrl}')"`;

    const quickActions = this._renderFileQuickActions(item, isTrash, {
      isStarred, starUrl, deleteUrl, starActionText, starIconFill, starIconStroke
    });

    return `<tr ${trOnclick} class="list-row file-row" style="${isTrash ? '' : 'cursor: pointer;'}" data-item-id="${item.id}" data-item-type="file" data-prefetch-file="${item.id}">
              <td class="align-middle checkbox-cell" onclick="event.stopPropagation();">
                <label class="list-checkbox-label">
                  <input type="checkbox" class="list-checkbox row-checkbox" data-item-id="${item.id}" data-item-type="file" data-item-name="${(item.name || '').replaceAll('"', '&quot;')}">
                  <span class="list-checkbox-custom"></span>
                </label>
              </td>
              <td class="align-middle name-cell">
                <div class="d-flex align-items-center"${thumbnailUrl ? ` onmouseenter="var p=this.querySelector('.file-preview-popup');if(p){var r=this.getBoundingClientRect();p.style.left=r.left+'px';p.style.top=(r.bottom+4)+'px';p.style.display='block';}" onmouseleave="var p=this.querySelector('.file-preview-popup');if(p)p.style.display='none';"` : ''}>
                  ${icon}
                  <span class="font-weight-500 text-dark">${item.name}</span>
                  ${this._renderAccessIcon(item)}
                  ${this._renderStarIcon(isStarred)}
                  ${previewPopup}
                </div>
              </td>
              <td class="align-middle text-muted small">${item.owner || 'me'}</td>
              ${locationTd}
              <td class="align-middle text-muted small">${date}</td>
              <td class="align-middle text-muted small text-right">${sizeDisplay}</td>
              <td class="align-middle text-right">
              <div class="d-flex justify-content-end align-items-center row-actions">
              <div class="quick-actions d-none d-md-flex align-items-center mr-2">
                 ${quickActions}
              </div>
              ${isTrash ? '' : `<div class="dropdown show-on-hover pl-2" onclick="event.stopPropagation();">
                <button class="btn btn-link btn-sm p-0 text-muted" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                  </svg>
                </button>
              </div>`}
            </div>
        </td>
            </tr>`;
  }

  _renderStarIcon(isStarred) {
    if (!isStarred) return '';
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbc04" stroke="#fbbc04" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Starred" style="margin-left:4px;flex-shrink:0;">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`;
  }
}

module.exports = ListLayoutHelper;
