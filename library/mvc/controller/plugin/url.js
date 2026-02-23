// library/mvc/controller/plugin/url.js
const BasePlugin = require('../base-plugin');

class Url extends BasePlugin {

  constructor(options = {}) {
    super(options);
  }

  /**
   * Build a URL from a route name.
   *
   * Supports:
   * - params replacement: /files/:id -> /files/123
   * - optional segments in parentheses with ? suffix (your existing format):
   *     "/admin(/report(/:id)?)?"
   * - query string via options.query (URL encoded)
   * - hash/fragment via options.hash or options.fragment
   *
   * @param {string} name
   * @param {object} params
   * @param {object} options
   * @returns {string|null}
   */
  fromRoute(name, params = {}, options = {}) {
    const controller = this.getController();
    if (!controller || typeof controller.getConfig !== 'function') return null;

    const config = controller.getConfig() || {};
    const routes = config?.router?.routes || {};

    if (!routes || !Object.prototype.hasOwnProperty.call(routes, name)) {
      return null;
    }

    let route = routes[name]?.route;
    if (!route || typeof route !== 'string') return null;

    // 1) Replace provided params (URL encode)
    const usedKeys = new Set();

    Object.keys(params || {}).forEach((key) => {
      const value = params[key];

      // treat null/undefined as "not provided"
      if (value === undefined || value === null) return;

      usedKeys.add(key);

      const encoded = encodeURIComponent(String(value));
      const regEx = new RegExp(':' + key + '\\b', 'g');
      route = route.replace(regEx, encoded);
    });

    // 2) Remove optional groups that still contain unreplaced parameters
    // Example group: "(/:id)" or "(/segment/:id)"
    // We remove groups where any ":param" remains.
    route = this._stripUnresolvedOptionalGroups(route);

    // 3) Remove any remaining parentheses markers from optional groups we kept
    route = route.replace(/[()]/g, '');

    // 4) Clean up duplicate slashes (but keep "http://", "https://", "//")
    route = this._collapseSlashes(route);

    // 5) If there are still unresolved params outside optional groups, strip them (or return null)
    // We choose to strip and clean, to avoid leaking ":id" in URLs.
    if (/:([a-zA-Z0-9_]+)/.test(route)) {
      // remove any leftover "/:param" segments
      route = route.replace(/\/:([a-zA-Z0-9_]+)/g, '');
      route = this._collapseSlashes(route);
    }

    // 6) Query string
    if (options && options.query && typeof options.query === 'object') {
      const qs = this._buildQueryString(options.query);
      if (qs) {
        route += (route.includes('?') ? '&' : '?') + qs;
      }
    }

    // 7) Hash / fragment
    const hash = (options && (options.hash || options.fragment)) ? String(options.hash || options.fragment) : null;
    if (hash) {
      route += '#' + encodeURIComponent(hash);
    }

    return route;
  }

  /**
   * Removes optional groups "(...)?"
   * If a group contains an unresolved ":param", the entire group is removed.
   */
  _stripUnresolvedOptionalGroups(route) {
    // Iteratively remove optional groups containing ":" params
    // until no more changes occur.
    let prev = null;
    let current = route;

    while (prev !== current) {
      prev = current;

      current = current.replace(/\(([^()]*)\)\?/g, (match, inner) => {
        // If inner still has ":param", drop this optional group
        if (/:([a-zA-Z0-9_]+)/.test(inner)) {
          return '';
        }
        // Keep the inner content (without wrapper)
        return inner;
      });
    }

    return current;
  }

  /**
   * Collapse multiple slashes into one, except preserve:
   * - leading "//" (protocol-relative)
   * - "http://", "https://"
   */
  _collapseSlashes(url) {
    if (!url) return url;

    // Preserve protocol prefix if present
    const protoMatch = url.match(/^(https?:\/\/|\/\/)/);
    const prefix = protoMatch ? protoMatch[0] : '';
    let rest = prefix ? url.slice(prefix.length) : url;

    rest = rest.replace(/\/{2,}/g, '/');

    // Ensure leading slash for non-protocol routes if original started with '/'
    if (!prefix && url.startsWith('/') && !rest.startsWith('/')) {
      rest = '/' + rest;
    }

    return prefix + rest;
  }

  /**
   * Build query string:
   * - URL encodes keys/values
   * - supports arrays: { a: [1,2] } -> "a=1&a=2"
   * - skips null/undefined values
   */
  _buildQueryString(queryObj) {
    const parts = [];

    Object.keys(queryObj || {}).forEach((key) => {
      const value = queryObj[key];
      if (value === undefined || value === null) return;

      const encodedKey = encodeURIComponent(String(key));

      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v === undefined || v === null) return;
          parts.push(`${encodedKey}=${encodeURIComponent(String(v))}`);
        });
      } else if (typeof value === 'object') {
        // Simple object flattening: key[sub]=value
        Object.keys(value).forEach((subKey) => {
          const subVal = value[subKey];
          if (subVal === undefined || subVal === null) return;
          const k = `${encodedKey}%5B${encodeURIComponent(String(subKey))}%5D`; // [subKey]
          parts.push(`${k}=${encodeURIComponent(String(subVal))}`);
        });
      } else {
        parts.push(`${encodedKey}=${encodeURIComponent(String(value))}`);
      }
    });

    return parts.join('&');
  }
}

module.exports = Url;