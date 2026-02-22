const AbstractHelper = require('./abstract-helper');

class HeadTitle extends AbstractHelper {

  constructor() {
    super();
    this.separator = ' - ';
    this.defaultTitle = 'Daily Politics';
    this.titles = []; // fallback storage when context not available
  }

  /**
   * Legacy setter (not required by the helper itself)
   */
  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    return this;
  }

  /**
   * Get titles either from context (preferred) or instance fallback.
   * @private
   */
  _getTitles() {
    // Prefer per-render context storage
    if (this.hasContext()) {
      const t = this.getVariable('_headTitleParts', null);
      if (Array.isArray(t)) return t;
      return [];
    }

    // Fallback (no context)
    return Array.isArray(this.titles) ? this.titles : [];
  }

  /**
   * Set titles either into context (preferred) or instance fallback.
   * @private
   */
  _setTitles(titles) {
    const safe = Array.isArray(titles) ? titles : [];

    if (this.hasContext()) {
      this.setVariable('_headTitleParts', safe);
      return;
    }

    this.titles = safe;
  }

  /**
   * Render method
   *
   * Usage:
   *  - {{ headTitle('Admin', 'set') }}        -> store, returns ''
   *  - {{ headTitle('Dashboard', 'append') }} -> store, returns ''
   *  - {{ headTitle(null) }}                  -> render
   *  - {{ headTitle('render') }}              -> render
   *  - {{ headTitle(null, 'render') }}        -> render
   *
   * @param {string|null} title
   * @param {string} mode - 'set' | 'append' | 'prepend' | 'render' (default: 'set')
   * @returns {string}
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);

    // Support headTitle('render') shorthand
    let title = cleanArgs[0] ?? null;
    let mode = cleanArgs[1] ?? 'set';

    if (title === 'render' && cleanArgs.length === 1) {
      title = null;
      mode = 'render';
    }

    return this.withContext(context, () => {
      let titles = this._getTitles();

      // Render-only
      if (title === null || mode === 'render') {
        return this._renderTitles(titles);
      }

      // Build
      switch (mode) {
        case 'set':
          titles = [title];
          break;

        case 'append':
          titles = Array.isArray(titles) ? titles : [];
          titles.push(title);
          break;

        case 'prepend':
          titles = Array.isArray(titles) ? titles : [];
          titles.unshift(title);
          break;

        default:
          // unknown mode -> treat as set (safer)
          titles = [title];
          break;
      }

      this._setTitles(titles);

      // Building mode returns empty string for consistency with other head helpers
      return '';
    });
  }

  /**
   * Render titles array to string
   * @private
   */
  _renderTitles(titles) {
    if (!titles || titles.length === 0) {
      return this.defaultTitle;
    }
    return titles.join(this.separator);
  }

  set(title) {
    this._setTitles([title]);
    return this;
  }

  append(title) {
    const titles = this._getTitles();
    titles.push(title);
    this._setTitles(titles);
    return this;
  }

  prepend(title) {
    const titles = this._getTitles();
    titles.unshift(title);
    this._setTitles(titles);
    return this;
  }

  setSeparator(separator) {
    this.separator = separator;
    return this;
  }

  setDefaultTitle(title) {
    this.defaultTitle = title;
    return this;
  }

  getTitles() {
    return this._getTitles();
  }

  clear() {
    this._setTitles([]);
    return this;
  }

  isEmpty() {
    return this._getTitles().length === 0;
  }

  toString() {
    return this._renderTitles(this._getTitles());
  }
}

module.exports = HeadTitle;