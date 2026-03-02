// library/authentication/result.js
// Authentication result class based on Zend Framework Authentication\Result

class Result {
  static FAILURE = 0;
  static FAILURE_IDENTITY_NOT_FOUND = -1;
  static FAILURE_IDENTITY_AMBIGUOUS = -2;
  static FAILURE_CREDENTIAL_INVALID = -3;
  static FAILURE_UNCATEGORIZED = -4;
  static SUCCESS = 1;

  /**
   * @param {number} code
   * @param {*} identity
   * @param {string[]|string} messages
   */
  constructor(code, identity, messages = []) {
    this.code = Number.isFinite(code) ? code : Result.FAILURE_UNCATEGORIZED;
    this.identity = identity;

    // Normalize messages
    if (typeof messages === 'string') {
      this.messages = [messages];
    } else if (Array.isArray(messages)) {
      this.messages = messages.filter(m => typeof m === 'string');
    } else {
      this.messages = [];
    }
  }

  /**
   * Returns whether the result represents a successful authentication attempt
   * @returns {boolean}
   */
  isValid() {
    return this.code > 0;
  }

  /**
   * @returns {number}
   */
  getCode() {
    return this.code;
  }

  /**
   * @returns {*}
   */
  getIdentity() {
    return this.identity;
  }

  /**
   * @returns {string[]}
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Add a message (useful when composing results)
   * @param {string} message
   * @returns {Result}
   */
  addMessage(message) {
    if (typeof message === 'string' && message.length > 0) {
      this.messages.push(message);
    }
    return this;
  }

  /**
   * Add multiple messages
   * @param {string[]} messages
   * @returns {Result}
   */
  addMessages(messages = []) {
    if (Array.isArray(messages)) {
      messages.forEach(m => this.addMessage(m));
    }
    return this;
  }

  /**
   * Useful for logs / API responses
   */
  toJSON() {
    return {
      code: this.code,
      valid: this.isValid(),
      identity: this.identity,
      messages: [...this.messages]
    };
  }
}

module.exports = Result;