// application/form/search-form.js
const Form = require(
  globalThis.applicationPath('/library/form/form'));
const Text = require(
  globalThis.applicationPath('/library/form/element/text'));
const Hidden = require(
  globalThis.applicationPath('/library/form/element/hidden'));
const FormImageButton = require(
  globalThis.applicationPath('/application/form/element/form-image-button'));

/**
 * SearchForm - Form for drive search
 * Extends the base Form class to provide search functionality
 * with query, layout, sort, and clear button fields
 */
class SearchForm extends Form {
  /**
   * Constructor
   * @param {Object} options - Form options (action, method, etc.)
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * Add search query field (text input)
   * @param {string} name - Field name (default: 'q')
   * @returns {void}
   */
  addQueryField(name = 'q') {
    const element = new Text(name);
    element.setLabel('Search');
    element.setAttributes({
      'class': 'form-control bg-transparent border-0',
      'id': 'search-input',
      'placeholder': 'Search in Drive'
    });
    this.add(element);
  }

  /**
   * Add layout field (hidden input)
   * Preserves the current layout mode (list/grid) across search submissions
   * @param {string} name - Field name (default: 'layout')
   * @returns {void}
   */
  addLayoutField(name = 'layout') {
    const element = new Hidden(name);
    this.add(element);
  }

  /**
   * Add sort field (hidden input)
   * Preserves the current sort mode across search submissions
   * @param {string} name - Field name (default: 'sort')
   * @returns {void}
   */
  addSortField(name = 'sort') {
    const element = new Hidden(name);
    this.add(element);
  }

  /**
   * Add mobile sidebar toggle button with hamburger SVG icon
   * @param {string} name - Element name (default: 'mobile-sidebar-toggle')
   * @returns {void}
   */
  addMobileSidebarToggle(name = 'mobile-sidebar-toggle') {
    const element = new FormImageButton(name);
    element.setAttributes({
      'id': 'mobile-sidebar-toggle',
      'class': 'btn btn-link text-muted d-md-none mr-3'
    });
    element.setContent(
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<line x1="3" y1="12" x2="21" y2="12"></line>'
      + '<line x1="3" y1="6" x2="21" y2="6"></line>'
      + '<line x1="3" y1="18" x2="21" y2="18"></line>'
      + '</svg>'
    );
    this.add(element);
  }

  /**
   * Add clear button with SVG close icon
   * @param {string} name - Element name (default: 'search-clear')
   * @returns {void}
   */
  addClearButton(name = 'search-clear') {
    const element = new FormImageButton(name);
    element.setAttributes({
      'id': 'search-clear',
      'class': 'btn btn-link text-muted p-0 d-flex align-items-center justify-content-center',
      'style': 'margin-right: 8px;',
      'title': 'Clear search'
    });
    element.setContent(
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<line x1="18" y1="6" x2="6" y2="18"></line>'
      + '<line x1="6" y1="6" x2="18" y2="18"></line>'
      + '</svg>'
    );
    this.add(element);
  }
}

module.exports = SearchForm;
