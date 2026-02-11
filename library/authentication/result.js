// library/authentication/result.js
// Authentication result class based on Zend Framework Authentication\Result

/**
 * Authentication Result
 * Provides a consistent authentication result with status code, identity, and messages
 */
class Result {
  /**
   * General Failure
   */
  static FAILURE = 0;

  /**
   * Failure due to identity not being found
   */
  static FAILURE_IDENTITY_NOT_FOUND = -1;

  /**
   * Failure due to identity being ambiguous
   */
  static FAILURE_IDENTITY_AMBIGUOUS = -2;

  /**
   * Failure due to invalid credential being supplied
   */
  static FAILURE_CREDENTIAL_INVALID = -3;

  /**
   * Failure due to uncategorized reasons
   */
  static FAILURE_UNCATEGORIZED = -4;

  /**
   * Authentication success
   */
  static SUCCESS = 1;

  /**
   * Authentication result code
   * @type {number}
   */
  code;

  /**
   * The identity used in the authentication attempt
   * @type {*}
   */
  identity;

  /**
   * An array of string reasons why the authentication attempt was unsuccessful
   * @type {Array<string>}
   */
  messages;

  /**
   * Sets the result code, identity, and failure messages
   * @param {number} code - Result code (use class constants)
   * @param {*} identity - Identity data
   * @param {Array<string>} messages - Array of messages
   */
  constructor(code, identity, messages = []) {
    this.code = code;
    this.identity = identity;
    this.messages = messages;
  }

  /**
   * Returns whether the result represents a successful authentication attempt
   * @returns {boolean}
   */
  isValid() {
    return this.code > 0;
  }

  /**
   * Returns the result code
   * @returns {number}
   */
  getCode() {
    return this.code;
  }

  /**
   * Returns the identity used in the authentication attempt
   * @returns {*}
   */
  getIdentity() {
    return this.identity;
  }

  /**
   * Returns an array of string reasons why the authentication attempt was unsuccessful
   * @returns {Array<string>}
   */
  getMessages() {
    return this.messages;
  }
}

module.exports = Result;
