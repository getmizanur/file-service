const Element = require('../element');
const crypto = require('crypto');

class Csrf extends Element {
  constructor(name = 'csrf', options = {}) {
    super();

    this.setName(name);
    this.setAttribute('type', 'hidden');
    this.setAttribute('autocomplete', 'off');

    this.tokenLength = Number.isInteger(options.tokenLength) ? options.tokenLength : 32;

    // tokenLength is bytes; hex string length will be tokenLength * 2
    const provided = (options.token !== undefined && options.token !== null) ? String(options.token) : null;

    this.token = (provided && this._isValidTokenFormat(provided))
      ? provided
      : this.generateToken();

    this.setValue(this.token);
  }

  generateToken() {
    // returns hex string
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  getToken() {
    return this.token;
  }

  /**
   * Validate a submitted token using constant-time comparison.
   * Safe against length mismatch and malformed inputs.
   */
  validate(submittedToken) {
    if (!submittedToken || !this.token) return false;

    const submitted = String(submittedToken);

    // Quick format + length checks to avoid timingSafeEqual throwing
    if (!this._isValidTokenFormat(submitted)) return false;
    if (submitted.length !== this.token.length) return false;

    try {
      // Compare as UTF-8 strings is ok since both are normalized hex,
      // but ensure equal length above to prevent throws.
      return crypto.timingSafeEqual(
        Buffer.from(submitted, 'utf8'),
        Buffer.from(this.token, 'utf8')
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Validate that a token looks like the expected hex token.
   * @private
   */
  _isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') return false;

    // Expected hex length
    const expectedLen = this.tokenLength * 2;
    if (token.length !== expectedLen) return false;

    // Hex check
    return /^[0-9a-fA-F]+$/.test(token);
  }
}

module.exports = Csrf;