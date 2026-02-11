const AbstractHelper = require('./abstract-helper');

class HeadTitle extends AbstractHelper {

  constructor() {
    super();
    this.separator = ' - ';
    this.defaultTitle = 'Daily Politics';
    this.titles = []; // Fallback storage when context not available
  }

  /**
   * Set ServiceManager instance
   * @param {ServiceManager} serviceManager
   */
  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Get stored titles from instance
   * @returns {Array} Array of title parts
   */
  _getTitles() {
    console.log('[HeadTitle._getTitles] Returning instance titles:', this.titles);
    return this.titles;
  }

  /**
   * Set titles to instance storage
   * @param {Array} titles - Array of title parts
   */
  _setTitles(titles) {
    this.titles = titles;
    console.log('[HeadTitle._setTitles] Setting instance titles to:', titles);
  }

  /**
   * Main render method - can be called with various parameters
   * Supports persistent title building via Nunjucks context
   * @param {string|null} title - Title to set/append
   * @param {string} mode - 'set', 'append', 'prepend', or 'render' (default: 'set')
   * @returns {string} Rendered title or empty string if setting for later
   */
  render(...args) {
    // Extract Nunjucks context from arguments
    const cleanArgs = this._extractContext(args);
    const [title = null, mode = 'set'] = cleanArgs;

    console.log('[HeadTitle.render] Called with title:', title, 'mode:', mode);

    // Get stored titles from context
    let titles = this._getTitles();
    console.log('[HeadTitle.render] Current titles:', titles);

    if(title === null) {
      // No title provided - just render what we have
      console.log('[HeadTitle.render] No title provided, rendering current titles');
      return this._renderTitles(titles);
    }

    // Handle different modes
    switch(mode) {
      case 'set':
        titles = [title];
        break;
      case 'append':
        titles.push(title);
        break;
      case 'prepend':
        titles.unshift(title);
        break;
      case 'render':
        // Just render without modifying
        return this._renderTitles(titles);
    }

    console.log('[HeadTitle.render] Titles after mode processing:', titles);

    // Store updated titles back to context
    this._setTitles(titles);


    // Return rendered title for immediate display
    return this._renderTitles(titles);
  }

  /**
   * Render titles array to string
   * @param {Array} titles - Array of title parts
   * @returns {string}
   */
  _renderTitles(titles) {
    if(!titles || titles.length === 0) {
      return this.defaultTitle;
    }

    console.log('=======HeadTitle=============');
    console.log(titles);
    return titles.join(this.separator);
  }

  /**
   * Set the title (replaces all existing titles)
   * @param {string} title - Title to set
   * @returns {HeadTitle} For method chaining
   */
  set(title) {
    this._setTitles([title]);
    return this;
  }

  /**
   * Append a title to the end
   * @param {string} title - Title to append
   * @returns {HeadTitle} For method chaining
   */
  append(title) {
    console.log('[HeadTitle.append] Called with title:', title);
    const titles = this._getTitles();
    console.log('[HeadTitle.append] Current titles before append:', titles);
    titles.push(title);
    this._setTitles(titles);
    console.log('[HeadTitle.append] Titles after append:', titles);
    return this;
  }

  /**
   * Prepend a title to the beginning
   * @param {string} title - Title to prepend
   * @returns {HeadTitle} For method chaining
   */
  prepend(title) {
    const titles = this._getTitles();
    titles.unshift(title);
    this._setTitles(titles);
    return this;
  }

  /**
   * Set the separator between titles
   * @param {string} separator - Separator string
   * @returns {HeadTitle} For method chaining
   */
  setSeparator(separator) {
    this.separator = separator;
    return this;
  }

  /**
   * Set default title
   * @param {string} title - Default title
   * @returns {HeadTitle} For method chaining
   */
  setDefaultTitle(title) {
    this.defaultTitle = title;
    return this;
  }

  /**
   * Get all titles
   * @returns {Array} Array of titles
   */
  getTitles() {
    return this._getTitles();
  }

  /**
   * Clear all titles
   * @returns {HeadTitle} For method chaining
   */
  clear() {
    this._setTitles([]);
    return this;
  }

  /**
   * Check if titles are empty
   * @returns {boolean} True if no titles set
   */
  isEmpty() {
    return this._getTitles().length === 0;
  }

  /**
   * Convert to string representation
   * @returns {string} Formatted title string
   */
  toString() {
    const titles = this._getTitles();
    return this._renderTitles(titles);
  }

}

module.exports = HeadTitle;