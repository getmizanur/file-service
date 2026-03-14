// application/helper/folder-list-helper.js
const AbstractHelper = require(globalThis.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(globalThis.applicationPath('/library/mvc/view/helper/url'));

/**
 * FolderListHelper
 *
 * Renders folders as a table list (tr items).
 */
class FolderListHelper extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs } = this._extractContext(args);
    const [folders, viewMode = 'my-drive', layoutMode = 'list', starredFolderIds = []] = cleanArgs;

    if (!folders || folders.length === 0) {
      return '';
    }

    let html = '';
    const urlHelper = new UrlHelper();

    folders.forEach(folder => {
      html += this._renderRow(folder, viewMode, layoutMode, starredFolderIds, urlHelper);
    });

    return html;
  }

  _renderRow(folder, viewMode, layoutMode, starredFolderIds, urlHelper) {
    const isTrash = viewMode === 'trash';
    const item = typeof folder.toObject === 'function' ? folder.toObject() : folder;
    const folderId = item.folder_id || item.id;
    const name = item.name;
    const dateSource = item.updated_dt || item.created_dt;
    const date = dateSource ? new Date(dateSource).toLocaleDateString() : '-';

    const locationTd = this._renderLocationCell(item, viewMode);

    const linkRoute = 'adminMyDrive';
    const viewQueryParams = { id: folderId };
    if (layoutMode) viewQueryParams.layout = layoutMode;

    const link = urlHelper.fromRoute(linkRoute, null, { query: viewQueryParams });

    console.log(`[FolderListHelper] Item:`, item);

    const isStarred = item.is_starred || starredFolderIds?.includes(folderId);
    const trOnclick = isTrash ? '' : `onclick="location.href='${link}'"`;
    const quickActions = this._renderQuickActions(item, folderId, name, isTrash, starredFolderIds);

    return `
        <tr ${trOnclick} data-prefetch-id="${folderId}" class="list-row folder-row" style="${isTrash ? '' : 'cursor: pointer;'}">
          <td class="align-middle name-cell">
             <div class="d-flex align-items-center">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path>
               </svg>
               <span class="font-weight-500 text-dark">${name}</span>
               ${this._renderAccessIcon(item)}
               ${this._renderStarIcon(isStarred)}
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
        </tr>
        `;
  }

  _renderLocationCell(item, viewMode) {
    const locationViews = ['search', 'home'];
    if (!locationViews.includes(viewMode)) {
      return '';
    }
    const _f = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
    const _d = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
    const _c = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    const loc = item.location || '';
    const pathParts = (item.location_path || loc).split(' / ').filter(Boolean);
    const crumbs = pathParts.map((p, i) =>
      `<span class="location-crumb">${i === 0 ? _d : _f}&nbsp;${p}</span>`
    ).join(`<span class="location-chevron">${_c}</span>`);
    const tooltip = pathParts.length > 0
      ? '<div class="location-tooltip-popup">' + crumbs + '</div>'
      : '';
    return `<td class="align-middle text-muted small"><div class="location-cell"><span class="location-name">${_f}&nbsp;${loc}</span>${tooltip}</div></td>`;
  }

  _renderStarIcon(isStarred) {
    if (!isStarred) return '';
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbc04" stroke="#fbbc04" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Starred" style="margin-left:4px;flex-shrink:0;">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`;
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

  _renderQuickActions(item, folderId, name, isTrash, starredFolderIds) {
    if (isTrash) {
      return `<a href="/admin/folder/restore?id=${folderId}"
              class="btn btn-sm btn-outline-secondary fade-in-action"
              title="Restore from trash"
              onclick="event.stopPropagation();">Restore</a>`;
    }
    return `<button class="btn btn-icon btn-sm fade-in-action" title="Share" onclick="event.stopPropagation();">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
           </button>
           <button class="btn btn-icon btn-sm fade-in-action" title="Rename" onclick="openRenameModal('${folderId}', '${(name || '').replaceAll("'", String.raw`\'`)}'); event.stopPropagation();">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
           </button>
           <button class="btn btn-icon btn-sm fade-in-action" title="Star" onclick="toggleFolderStar('${folderId}', this); event.stopPropagation();">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${(item.is_starred || starredFolderIds?.includes(folderId)) ? '#fbbc04' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
           </button>`;
  }
}

module.exports = FolderListHelper;
