// library/authentication/storage/session-storage.js
// Session-based storage adapter for authentication identity
//
// Option A: Implement storage on top of the framework Session + namespaces.
// This removes duplicate session persistence logic while keeping the adapter interface.

const Session = require(global.applicationPath('/library/session/session'));

class SessionStorage {
  /**
   * Kept for backward compatibility with existing call sites.
   * This is now the key INSIDE the namespace, not a req.session property name.
   */
  static IDENTITY_KEY = 'identity';

  /**
   * @param {object|null} expressReq - Express request object (optional but recommended)
   * @param {object} options
   *  - namespace: string (default 'Auth')
   *  - key: string (default 'identity')
   *  - sessionOptions: object passed to Session.start(req, sessionOptions)
   *  - debug: boolean (default false)
   */
  constructor(expressReq = null, options = {}) {
    this.expressReq = expressReq || null;

    this.namespace = options.namespace || 'Auth';
    this.key = options.key || SessionStorage.IDENTITY_KEY;

    this.sessionOptions = options.sessionOptions || {};
    this.debug = !!options.debug;

    // Best-effort: make sure framework session is started with the request.
    // If expressReq is not supplied, Session will fallback to in-memory/global behavior.
    try {
      if (!Session.isStarted()) {
        Session.start(this.expressReq, this.sessionOptions);
      }
    } catch (e) {
      // Don't throw from storage constructor; preserve legacy behaviour.
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.debug('[SessionStorage] Session.start failed:', e.message);
      }
    }
  }

  _log(...args) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.debug('[SessionStorage]', ...args);
    }
  }

  _ns() {
    // Ensure started (idempotent)
    if (!Session.isStarted()) {
      Session.start(this.expressReq, this.sessionOptions);
    }
    return Session.getNamespace(this.namespace, true);
  }

  /**
   * Returns true iff storage is empty
   * @returns {boolean}
   */
  isEmpty() {
    try {
      const ns = this._ns();
      const v = ns.get(this.key, null);
      const empty = (v === null || v === undefined);
      this._log('isEmpty=', empty);
      return empty;
    } catch (e) {
      this._log('isEmpty error:', e.message);
      return true;
    }
  }

  /**
   * Returns stored identity
   * @returns {*|null}
   */
  read() {
    try {
      const ns = this._ns();
      const identity = ns.get(this.key, null);
      this._log(identity ? 'read: identity exists' : 'read: identity null');
      return identity;
    } catch (e) {
      this._log('read error:', e.message);
      return null;
    }
  }

  /**
   * Writes identity to storage
   * @param {*} contents
   */
  write(contents) {
    try {
      const ns = this._ns();
      ns.set(this.key, contents);
      this._log('write: identity stored');
    } catch (e) {
      // keep legacy behaviour: do not throw
      this._log('write error:', e.message);
    }
  }

  /**
   * Clears identity from storage
   */
  clear() {
    try {
      const ns = this._ns();
      ns.remove(this.key);
      this._log('clear: identity removed');
    } catch (e) {
      this._log('clear error:', e.message);
    }
  }

  /**
   * Persist session immediately (useful with resave:false before redirects)
   * @returns {Promise<void>}
   */
  async save() {
    try {
      if (!Session.isStarted()) {
        Session.start(this.expressReq, this.sessionOptions);
      }

      if (typeof Session.save === 'function') {
        await Session.save();
      }
    } catch (e) {
      this._log('save error:', e.message);
    }
  }
}

module.exports = SessionStorage;