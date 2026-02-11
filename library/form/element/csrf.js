const Element = require('../element');
const crypto = require('crypto');

class Csrf extends Element {
  constructor(name = 'csrf', options = {}) {
    super();
    this.setName(name);
    this.setAttribute('type', 'hidden');
    this.setAttribute('autocomplete', 'off');
    this.tokenLength = options.tokenLength || 32;
    this.token = options.token || this.generateToken();
    this.setValue(this.token);
  }

  generateToken() {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  getToken() {
    return this.token;
  }

  validate(submittedToken) {
    // Use constant-time comparison for security
    return submittedToken && this.token &&
      crypto.timingSafeEqual(Buffer.from(submittedToken), Buffer.from(this.token));
  }
}

module.exports = Csrf;