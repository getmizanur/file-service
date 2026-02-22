const Session = require(global.applicationPath('/library/session/session'));
const VarUtil = require(global.applicationPath('/library/util/var-util'));
const BasePlugin = require(global.applicationPath('/library/mvc/controller/base-plugin'));

class FlashMessenger extends BasePlugin {

  constructor(options = {}) {
    super(options);

    this.namespace = options.namespace || 'FlashMessenger';

    // local cache (mostly for backward compat / debugging)
    this.messages = {
      default: [],
      success: [],
      warning: [],
      error: [],
      info: []
    };

    this.messageAdded = false;

    this.NAMESPACE_DEFAULT = 'default';
    this.NAMESPACE_SUCCESS = 'success';
    this.NAMESPACE_WARNING = 'warning';
    this.NAMESPACE_ERROR = 'error';
    this.NAMESPACE_INFO = 'info';

    this.sessionNamespace = null;
  }

  // ----------------------------
  // Session namespace
  // ----------------------------

  /**
   * Ensure session is started with the Express request.
   * Uses controller's session plugin if available.
   */
  _ensureSessionStarted() {
    try {
      const controller = this.getController();
      if (!controller || typeof controller.plugin !== 'function') return;

      const sessionPlugin = controller.plugin('session');
      if (sessionPlugin && typeof sessionPlugin.start === 'function') {
        // start() is idempotent in our updated session plugin
        sessionPlugin.start();
      }
    } catch (e) {
      console.debug('FlashMessenger._ensureSessionStarted:', e.message);
    }
  }

  /**
   * Get session namespace for flash messages
   * @returns {SessionNamespace}
   */
  getSessionNamespace() {
    if (!this.sessionNamespace) {
      // Ensure Session.start(req) has happened (best effort)
      this._ensureSessionStarted();

      this.sessionNamespace = Session.getNamespace('FlashMessenger');
    }
    return this.sessionNamespace;
  }

  /**
   * Persist session when running on express-session (best effort).
   * Useful when resave:false and you redirect immediately after setting flash.
   */
  async _saveSession() {
    try {
      const controller = this.getController();
      if (controller && typeof controller.plugin === 'function') {
        const sessionPlugin = controller.plugin('session');
        if (sessionPlugin && typeof sessionPlugin.save === 'function') {
          await sessionPlugin.save();
          return;
        }
      }

      if (typeof Session.save === 'function') {
        await Session.save();
      }
    } catch (e) {
      console.debug('FlashMessenger._saveSession:', e.message);
    }
  }

  // ----------------------------
  // Namespace helpers
  // ----------------------------

  setNamespace(namespace = this.NAMESPACE_DEFAULT) {
    this.namespace = namespace;
    return this;
  }

  getNamespace() {
    return this.namespace;
  }

  resetNamespace() {
    this.setNamespace();
    return this;
  }

  getContainer() {
    // legacy/deprecated
    return null;
  }

  _keyCurrent(namespace) {
    return `${namespace}_current`;
  }

  _keyNext(namespace) {
    return `${namespace}_next`;
  }

  _allNamespaces() {
    return [
      this.NAMESPACE_DEFAULT,
      this.NAMESPACE_SUCCESS,
      this.NAMESPACE_WARNING,
      this.NAMESPACE_ERROR,
      this.NAMESPACE_INFO
    ];
  }

  // ----------------------------
  // Add messages (ZF1-style: store in *_next)
  // ----------------------------

  async addMessage(message, namespace = this.NAMESPACE_DEFAULT) {
    try {
      const sessionNs = this.getSessionNamespace();

      const keyNext = this._keyNext(namespace);
      let messages = sessionNs.get(keyNext, []);

      if (!Array.isArray(messages)) messages = [];

      messages.push(message);
      sessionNs.set(keyNext, messages);

      // local cache
      if (!this.messages[namespace]) this.messages[namespace] = [];
      this.messages[namespace].push(message);

      this.messageAdded = true;

      await this._saveSession();
    } catch (error) {
      console.warn('FlashMessenger addMessage error:', error.message);

      // still keep local cache
      if (!this.messages[namespace]) this.messages[namespace] = [];
      this.messages[namespace].push(message);
    }

    return this;
  }

  addInfoMessage(message) {
    this.addMessage(message, this.NAMESPACE_INFO);
    return this;
  }

  addSuccessMessage(message) {
    this.addMessage(message, this.NAMESPACE_SUCCESS);
    return this;
  }

  addWarningMessage(message) {
    this.addMessage(message, this.NAMESPACE_WARNING);
    return this;
  }

  addErrorMessage(message) {
    // If we're adding an error, any pending SUCCESS is no longer valid.
    this._clearNamespacePair(this.NAMESPACE_SUCCESS);
    this.addMessage(message, this.NAMESPACE_ERROR);
    return this;
  }

  // ----------------------------
  // Read messages
  // ----------------------------

  hasMessages(namespace = this.NAMESPACE_DEFAULT) {
    try {
      const sessionNs = this.getSessionNamespace();

      const current = sessionNs.get(this._keyCurrent(namespace), []);
      if (Array.isArray(current) && current.length > 0) return true;

      const next = sessionNs.get(this._keyNext(namespace), []);
      if (Array.isArray(next) && next.length > 0) return true;

      // local fallback
      return Array.isArray(this.messages[namespace]) && this.messages[namespace].length > 0;
    } catch (error) {
      return false;
    }
  }

  getMessages(namespace = this.NAMESPACE_DEFAULT, clearAfterRead = true) {
    try {
      const sessionNs = this.getSessionNamespace();

      const keyCurrent = this._keyCurrent(namespace);
      const keyNext = this._keyNext(namespace);

      let current = sessionNs.get(keyCurrent, []);
      if (!Array.isArray(current)) current = [];

      if (current.length > 0) {
        const out = [...current];
        if (clearAfterRead) sessionNs.set(keyCurrent, []);
        return out;
      }

      // fallback: allow reading queued next messages (same-request display)
      let next = sessionNs.get(keyNext, []);
      if (!Array.isArray(next)) next = [];

      const out = [...next];
      if (clearAfterRead && out.length > 0) sessionNs.set(keyNext, []);
      return out;
    } catch (error) {
      console.warn('FlashMessenger getMessages error:', error.message);
      return [];
    }
  }

  getAllMessages(clearAfterRead = true) {
    return {
      errors: this.getMessages(this.NAMESPACE_ERROR, clearAfterRead),
      success: this.getMessages(this.NAMESPACE_SUCCESS, clearAfterRead),
      warnings: this.getMessages(this.NAMESPACE_WARNING, clearAfterRead),
      info: this.getMessages(this.NAMESPACE_INFO, clearAfterRead)
    };
  }

  // ----------------------------
  // Clear helpers
  // ----------------------------

  _clearNamespacePair(namespace) {
    try {
      const sessionNs = this.getSessionNamespace();
      sessionNs.set(this._keyCurrent(namespace), []);
      sessionNs.set(this._keyNext(namespace), []);

      if (this.messages[namespace]) this.messages[namespace] = [];
    } catch (err) {
      console.warn('FlashMessenger _clearNamespacePair error:', namespace, err.message);
    }
  }

  clearMessages(namespace) {
    if (!VarUtil.isString(namespace) || VarUtil.empty(namespace)) {
      namespace = this.getNamespace();
    }
    this._clearNamespacePair(namespace);
    return true;
  }

  clearAllMessages() {
    try {
      const sessionNs = this.getSessionNamespace();

      this._allNamespaces().forEach(ns => {
        sessionNs.set(this._keyCurrent(ns), []);
        sessionNs.set(this._keyNext(ns), []);
      });

      Object.keys(this.messages).forEach(ns => {
        this.messages[ns] = [];
      });

      this.messageAdded = false;
    } catch (error) {
      console.warn('Error clearing all messages:', error.message);
    }
  }

  // ----------------------------
  // Peek helpers (no clearing)
  // ----------------------------

  peekMessages(namespace = this.NAMESPACE_DEFAULT) {
    return this.getMessages(namespace, false);
  }

  peekAllMessages() {
    return this.getAllMessages(false);
  }

  // ----------------------------
  // ZF1-style hop + view injection
  // ----------------------------

  _promoteNextToCurrent() {
    try {
      const sessionNs = this.getSessionNamespace();

      this._allNamespaces().forEach(ns => {
        const keyCurrent = this._keyCurrent(ns);
        const keyNext = this._keyNext(ns);

        let next = sessionNs.get(keyNext, []);
        if (!Array.isArray(next)) next = [];

        if (next.length > 0) {
          sessionNs.set(keyCurrent, next);
          sessionNs.set(keyNext, []);
        }
      });
    } catch (error) {
      console.warn('FlashMessenger _promoteNextToCurrent error:', error.message);
    }
  }

  _injectTemplateVariables() {
    try {
      const controller = this.getController();
      if (!controller) return;

      const view = controller.getView();
      if (!view || typeof view.setVariable !== 'function') return;

      const sessionNs = this.getSessionNamespace();

      const errorsCurrent = sessionNs.get(this._keyCurrent(this.NAMESPACE_ERROR), []);
      let successCurrent = sessionNs.get(this._keyCurrent(this.NAMESPACE_SUCCESS), []);
      const warningCurrent = sessionNs.get(this._keyCurrent(this.NAMESPACE_WARNING), []);
      const infoCurrent = sessionNs.get(this._keyCurrent(this.NAMESPACE_INFO), []);

      const errors = Array.isArray(errorsCurrent) ? errorsCurrent : [];
      const warnings = Array.isArray(warningCurrent) ? warningCurrent : [];
      const info = Array.isArray(infoCurrent) ? infoCurrent : [];
      let success = Array.isArray(successCurrent) ? successCurrent : [];

      // If we have errors, suppress success banners
      if (errors.length > 0) {
        success = [];
        this._clearNamespacePair(this.NAMESPACE_SUCCESS);
      }

      view.setVariable('error_flash_messages', errors);
      view.setVariable('success_flash_messages', success);
      view.setVariable('warning_flash_messages', warnings);
      view.setVariable('info_flash_messages', info);

      // clear current buckets after injection (one-time display)
      sessionNs.set(this._keyCurrent(this.NAMESPACE_ERROR), []);
      sessionNs.set(this._keyCurrent(this.NAMESPACE_SUCCESS), []);
      sessionNs.set(this._keyCurrent(this.NAMESPACE_WARNING), []);
      sessionNs.set(this._keyCurrent(this.NAMESPACE_INFO), []);
    } catch (error) {
      console.debug('FlashMessenger._injectTemplateVariables:', error.message);
    }
  }

  prepareForView() {
    this._promoteNextToCurrent();
    this._injectTemplateVariables();
  }

  getMessagesFromContainer() {
    // Deprecated
  }
}

module.exports = FlashMessenger;