// application/helper/pagination-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

class PaginationHelper extends AbstractHelper {

  /**
   * Render pagination controls.
   *
   * @param {object} pagination - { page, pageSize, totalFiles, totalPages, from, to }
   * @param {string} viewMode - current view mode (my-drive, search, etc.)
   * @param {string|null} folderId - current folder ID (for folder views)
   * @param {string|null} searchQuery - current search term (for search view)
   * @param {string} layoutMode - 'list' or 'grid'
   * @returns {string} HTML
   */
  render(...args) {
    const { args: cleanArgs } = this._extractContext(args);
    const [pagination, viewMode, folderId, searchQuery, layoutMode] = cleanArgs;

    if (!pagination || pagination.totalPages <= 1) return '';

    const { page, totalFiles, totalPages, from, to } = pagination;
    const pages = this._buildPageWindow(page, totalPages);

    const buildUrl = (p) => {
      const params = new URLSearchParams();
      if (folderId) params.set('id', folderId);
      if (viewMode) params.set('view', viewMode);
      if (searchQuery) params.set('q', searchQuery);
      if (layoutMode) params.set('layout', layoutMode);
      if (p > 1) params.set('page', p);
      return '/?' + params.toString();
    };

    let html = '<div class="search-pagination">';
    html += `<span class="pagination-info">Showing ${from}\u2013${to} of ${totalFiles} results</span>`;
    html += '<nav class="pagination-nav">';

    // Previous
    if (page > 1) {
      html += `<a href="${buildUrl(page - 1)}" class="pagination-link pagination-prev" title="Previous page">`;
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
      html += '</a>';
    } else {
      html += '<span class="pagination-link pagination-prev disabled">';
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
      html += '</span>';
    }

    // Page numbers
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (p === '...') {
        html += '<span class="pagination-ellipsis">&hellip;</span>';
      } else if (p === page) {
        html += `<span class="pagination-link active">${p}</span>`;
      } else {
        html += `<a href="${buildUrl(p)}" class="pagination-link">${p}</a>`;
      }
    }

    // Next
    if (page < totalPages) {
      html += `<a href="${buildUrl(page + 1)}" class="pagination-link pagination-next" title="Next page">`;
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      html += '</a>';
    } else {
      html += '<span class="pagination-link pagination-next disabled">';
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      html += '</span>';
    }

    html += '</nav></div>';
    return html;
  }

  /**
   * Build a page window array like [1, '...', 4, 5, 6, 7, 8, '...', 15]
   */
  _buildPageWindow(current, total) {
    if (total <= 7) {
      const pages = [];
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    const pages = [];
    const windowSize = 2; // pages around current

    // Always include first page
    pages.push(1);

    const rangeStart = Math.max(2, current - windowSize);
    const rangeEnd = Math.min(total - 1, current + windowSize);

    if (rangeStart > 2) {
      pages.push('...');
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < total - 1) {
      pages.push('...');
    }

    // Always include last page
    pages.push(total);

    return pages;
  }
}

module.exports = PaginationHelper;
