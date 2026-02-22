const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(global.applicationPath('/library/mvc/view/helper/url'));

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
      const isTrash = viewMode === 'trash';
      const item = typeof folder.toObject === 'function' ? folder.toObject() : folder;
      const folderId = item.folder_id || item.id;
      const name = item.name;
      const date = item.updated_dt ? new Date(item.updated_dt).toLocaleDateString() : (item.created_dt ? new Date(item.created_dt).toLocaleDateString() : '-');

      // Location cell (search mode only)
      let locationTd = '';
      if (viewMode === 'search') {
        const _f = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
        const _d = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
        const _c = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
        const loc = item.location || '';
        const pathParts = (item.location_path || loc).split(' / ').filter(Boolean);
        const crumbs = pathParts.map((p, i) =>
          `<span class="location-crumb">${i === 0 ? _d : _f}&nbsp;${p}</span>`
        ).join(`<span class="location-chevron">${_c}</span>`);
        locationTd = `<td class="align-middle text-muted small"><div class="location-cell"><span class="location-name">${_f}&nbsp;${loc}</span>${pathParts.length > 0 ? `<div class="location-tooltip-popup">${crumbs}</div>` : ''}</div></td>`;
      }

      const viewQueryParams = { id: folderId };
      if (viewMode) viewQueryParams.view = viewMode;
      if (layoutMode) viewQueryParams.layout = layoutMode;

      const link = urlHelper.fromRoute('adminIndexList', null, { query: viewQueryParams });

      console.log(`[FolderListHelper] Item:`, item);

      const trOnclick = isTrash ? '' : `onclick="location.href='${link}'"`;
      const quickActions = isTrash
        ? `<a href="/admin/folder/restore?id=${folderId}"
              class="btn btn-sm btn-outline-secondary fade-in-action"
              title="Restore from trash"
              onclick="event.stopPropagation();">Restore</a>`
        : `<button class="btn btn-icon btn-sm fade-in-action" title="Star" onclick="toggleFolderStar('${folderId}', this); event.stopPropagation();">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${(item.is_starred || (starredFolderIds && starredFolderIds.includes(folderId))) ? '#fbbc04' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
           </button>
           <button class="btn btn-icon btn-sm fade-in-action" title="Share" onclick="event.stopPropagation();">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
           </button>
           <button class="btn btn-icon btn-sm fade-in-action" title="Download" onclick="window.location.href='/admin/folder/download?id=${folderId}'; event.stopPropagation();">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                 <polyline points="7 10 12 15 17 10"></polyline>
                 <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
           </button>
           <button class="btn btn-icon btn-sm fade-in-action" title="Rename" onclick="openRenameModal('${folderId}', '${(name || '').replace(/'/g, "\\'")}'); event.stopPropagation();">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
           </button>`;

      html += `
        <tr ${trOnclick} class="list-row folder-row" style="${isTrash ? '' : 'cursor: pointer;'}">
          <td class="align-middle name-cell">
             <div class="d-flex align-items-center">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 16px;">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path>
               </svg>
               <span class="font-weight-500 text-dark">${name}</span>
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
    });

    return html;
  }
}

module.exports = FolderListHelper;
