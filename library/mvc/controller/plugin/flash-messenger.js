const Session = require(global.applicationPath('/library/session/session'));
const VarUtil = require(global.applicationPath('/library/util/var-util'));
const BasePlugin = require(
  global.applicationPath('/library/mvc/controller/base-plugin'));


class FlashMessenger extends BasePlugin {

  constructor(options = {}) {
    super(options);

    this.namespace = options.namespace || 'FlashMessenger';
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

    // Use new session namespace instead of Container
    this.sessionNamespace = null;

    // Initialize session and perform hop
    this._init();
  }

  _init() {
    try {
      const sessionNs = this.getSessionNamespace();

      // ZF1 Logic: Move 'next' messages to 'current' (the hop)
      // We use a specific key structure in the session namespace:
      // {
      //    'next': { 'error': [], 'success': [], ... },
      //    'current': { 'error': [], 'success': [], ... }
      // }

      const nextMessages = sessionNs.get('next', {});

      // Move next -> current
      sessionNs.set('current', nextMessages);

      // Clear next
      sessionNs.set('next', {});

    } catch (error) {
      console.warn('FlashMessenger init error:', error.message);
    }
  }

  setNamespace(namespace = this.NAMESPACE_DEFAULT) {
    this.namespace = namespace;

    return this;
  }

  getNamespace() {
    return this.namespace;
  }

  getContainer() {
    return null;
  }

  /**
   * Get session namespace for flash messages
   * @returns {SessionNamespace}
   */
  getSessionNamespace() {
    if(!this.sessionNamespace) {
      this.sessionNamespace = Session.getNamespace('FlashMessenger');
    }
    return this.sessionNamespace;
  }

  resetNamespace() {
    this.setNamespace();
    return this;
  }

  addMessage(message, namespace = this.NAMESPACE_DEFAULT) {
    try {
      const sessionNs = this.getSessionNamespace();

      // Use "next" bucket ZF1-style
      const keyNext = `${namespace}_next`;
      let messages = sessionNs.get(keyNext, []);

      if(!Array.isArray(messages)) {
        messages = [];
      }

      messages.push(message);
      sessionNs.set(keyNext, messages);

      // local cache for debug/backward compat
      if(!this.messages[namespace]) {
        this.messages[namespace] = [];
      }
      this.messages[namespace].push(message);

      this.messageAdded = true;
    } catch (error) {
      console.warn('FlashMessenger addMessage error:', error.message);
      if(!this.messages[namespace]) {
        this.messages[namespace] = [];
      }
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
    // If we’re adding an error, any pending SUCCESS is no longer valid.
    this._clearNamespacePair(this.NAMESPACE_SUCCESS);

    this.addMessage(message, this.NAMESPACE_ERROR);
    return this;
  }

  hasMessages(namespace = this.NAMESPACE_DEFAULT) {
    try {
      const sessionNs = this.getSessionNamespace();

      // Check 'next' queue first (messages added in current request)
      const keyNext = `${namespace}_next`;
      const nextMessages = sessionNs.get(keyNext, []);
      if(Array.isArray(nextMessages) && nextMessages.length > 0) {
        return true;
      }

      // Check 'current' queue (messages from previous request that hopped)
      const keyCurrent = `${namespace}_current`;
      const currentMessages = sessionNs.get(keyCurrent, []);
      if(Array.isArray(currentMessages) && currentMessages.length > 0) {
        return true;
      }

      // Check local messages (backward compatibility)
      return this.messages[namespace] && this.messages[namespace].length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get messages for a specific namespace
   * @param {string} namespace - Specific namespace to get messages from
   * @param {boolean} clearAfterRead - Whether to clear messages after reading (default: true for flash behavior)
   * @returns {Array} Messages for the specified namespace
   */
  getMessages(namespace = this.NAMESPACE_DEFAULT, clearAfterRead = true) {
    try {
      let messages = [];

      const sessionNs = this.getSessionNamespace();

      // First check 'next' (messages added during this request)
      const nextMessages = sessionNs.get('next', {});
      if(nextMessages[namespace] && nextMessages[namespace].length > 0) {
        messages = [...nextMessages[namespace]];

        // Clear from next if clearAfterRead is true
        if(clearAfterRead) {
          nextMessages[namespace] = [];
          sessionNs.set('next', nextMessages);
        }
      } else {
        // If no messages in 'next', check 'current' (messages from previous request)
        const currentMessages = sessionNs.get('current', {});
        if(currentMessages[namespace] && currentMessages[namespace].length > 0) {
          messages = [...currentMessages[namespace]];

          // Clear messages after reading if clearAfterRead is true
          if(clearAfterRead) {
            currentMessages[namespace] = [];
            sessionNs.set('current', currentMessages);
          }
        }
      }

      return messages;
    } catch (error) {
      console.warn('FlashMessenger getMessages error:', error.message);
      return [];
    }
  }

  /**
   * Get all messages organized by type - this is what controllers should use
   * @param {boolean} clearAfterRead - Whether to clear messages after reading
   * @returns {Object} Object containing arrays for each message type
   */
  getAllMessages(clearAfterRead = true) {
    return {
      errors: this.getMessages(this.NAMESPACE_ERROR, clearAfterRead),
      success: this.getMessages(this.NAMESPACE_SUCCESS, clearAfterRead),
      warnings: this.getMessages(this.NAMESPACE_WARNING, clearAfterRead),
      info: this.getMessages(this.NAMESPACE_INFO, clearAfterRead)
    };
  }

  /**
   * Helper method to clear messages from all storage locations for a namespace
   * @param {string} namespace 
   */
  _clearAllStorageForNamespace(namespace) {
    try {
      // Clear from session namespace
      const sessionNs = this.getSessionNamespace();
      if(sessionNs.has(namespace)) {
        sessionNs.remove(namespace);
      }

      // Clear from local messages
      if(this.messages[namespace]) {
        this.messages[namespace] = [];
      }
    } catch (error) {
      console.warn('Error clearing all storage for namespace:', namespace, error.message);
    }
  }

  clearMessages(namespace) {
    if(VarUtil.isString(namespace) ||
      VarUtil.empty(namespace)) {
      namespace = this.getNamespace();
    }

    // Use the comprehensive clearing method
    this._clearAllStorageForNamespace(namespace);
    return true;
  }

  /**
   * Peek at messages without clearing them (for debugging/testing)
   * @param {string} namespace 
   * @returns {Array}
   */
  peekMessages(namespace = this.NAMESPACE_DEFAULT) {
    // Use the unified getMessages method with clearAfterRead = false
    return this.getMessages(namespace, false);
  }

  /**
   * Peek at all messages organized by type without clearing them
   * @returns {Object} Object containing arrays for each message type
   */
  peekAllMessages() {
    return this.getAllMessages(false);
  }

  /**
   * Clear all messages from all namespaces (useful for testing)
   */
  clearAllMessages() {
    try {
      // Clear session namespace
      const sessionNs = this.getSessionNamespace();
      sessionNs.clear();

      // Clear all local message namespaces
      Object.keys(this.messages).forEach(namespace => {
        this.messages[namespace] = [];
      });

      // Reset message added flag
      this.messageAdded = false;
    } catch (error) {
      console.warn('Error clearing all messages:', error.message);
    }
  }

  getMessagesFromContainer() {
    // Deprecated
  }

  /**
   * Prepare flash messages for the current request:
   * - promote "next" messages into "current"
   * - inject into view variables
   * - clear "current" so they only show once
   */
  prepareForView() {
    // ZF1-style promotion (we'll define this helper below)
    this._promoteNextToCurrent();

    // Inject current messages into the view + clear them
    this._injectTemplateVariables();
  }

  /**
   * Auto-inject flash message arrays into template variables
   * This is called automatically when messages are added
   * Private method - use underscore prefix to indicate internal use
   */
  _injectTemplateVariables() {
    try {
      const controller = this.getController();
      if(!controller) return;

      const view = controller.getView();
      if(!view || typeof view.setVariable !== 'function') return;

      const sessionNs = this.getSessionNamespace();

      const errorsCurrent = sessionNs.get(`${this.NAMESPACE_ERROR}_current`, []);
      let successCurrent = sessionNs.get(`${this.NAMESPACE_SUCCESS}_current`, []);
      const warningCurrent = sessionNs.get(`${this.NAMESPACE_WARNING}_current`, []);
      const infoCurrent = sessionNs.get(`${this.NAMESPACE_INFO}_current`, []);

      // If we have errors, suppress success banners
      if(errorsCurrent && errorsCurrent.length > 0) {
        successCurrent = [];
        this._clearNamespacePair(this.NAMESPACE_SUCCESS);
      }

      view.setVariable('error_flash_messages', errorsCurrent || []);
      view.setVariable('success_flash_messages', successCurrent || []);
      view.setVariable('warning_flash_messages', warningCurrent || []);
      view.setVariable('info_flash_messages', infoCurrent || []);

      // Clear "current" buckets after injection (one-time display)
      sessionNs.set(`${this.NAMESPACE_ERROR}_current`, []);
      sessionNs.set(`${this.NAMESPACE_SUCCESS}_current`, []);
      sessionNs.set(`${this.NAMESPACE_WARNING}_current`, []);
      sessionNs.set(`${this.NAMESPACE_INFO}_current`, []);
    } catch (error) {
      // swallow – no flash is fine
    }
  }

  /**
   * Promote "next" messages into "current" for all namespaces.
   * This should be called once per request before we inject into the view.
   * Mirrors ZF1 behaviour (next → current).
   */
  _promoteNextToCurrent() {
    try {
      /*const req = this.getController()?.getRequest();
      if (req && req.method === 'GET') {
          return; // skip promoting on GET
      }*/

      const sessionNs = this.getSessionNamespace();
      const allNamespaces = [
        this.NAMESPACE_DEFAULT,
        this.NAMESPACE_SUCCESS,
        this.NAMESPACE_WARNING,
        this.NAMESPACE_ERROR,
        this.NAMESPACE_INFO,
      ];

      allNamespaces.forEach(ns => {
        const keyCurrent = `${ns}_current`;
        const keyNext = `${ns}_next`;

        const nextMessages = sessionNs.get(keyNext, []);

        // Move "next" to "current"
        if(Array.isArray(nextMessages) && nextMessages.length > 0) {
          sessionNs.set(keyCurrent, nextMessages);
          sessionNs.set(keyNext, []); // clear next bucket
        }
      });
    } catch (error) {
      console.warn('FlashMessenger _promoteNextToCurrent error:', error.message);
    }
  }

  /**
   * Clear both "current" and "next" buckets for a namespace.
   */
  _clearNamespacePair(namespace) {
    try {
      const sessionNs = this.getSessionNamespace();

      const keyCurrent = `${namespace}_current`;
      const keyNext = `${namespace}_next`;

      sessionNs.set(keyCurrent, []);
      sessionNs.set(keyNext, []);

      if(this.messages[namespace]) {
        this.messages[namespace] = [];
      }
    } catch (err) {
      console.warn('FlashMessenger _clearNamespacePair error:', namespace, err.message);
    }
  }

}

module.exports = FlashMessenger;