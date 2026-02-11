const crypto = require('crypto');

class SessionSecurity {

  constructor() {
    // Use environment variable or fallback secret
    this.secret = process.env.SESSION_SECURITY_SECRET || 'your-secret-key-change-in-production';
  }

  /**
   * Create a signed session ID for URL propagation
   * Format: sessionId.signature
   */
  signSessionId(sessionId) {
    if(!sessionId) return null;

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(sessionId)
      .digest('hex')
      .substring(0, 16); // Truncate to 16 chars for shorter URLs

    return `${sessionId}.${signature}`;
  }

  /**
   * Verify and extract session ID from signed URL parameter
   * Returns null if signature is invalid or missing
   */
  verifySessionId(signedSessionId) {
    if(!signedSessionId || typeof signedSessionId !== 'string') {
      return null;
    }

    const parts = signedSessionId.split('.');
    if(parts.length !== 2) {
      return null; // Invalid format
    }

    const [sessionId, signature] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(sessionId)
      .digest('hex')
      .substring(0, 16);

    if(signature !== expectedSignature) {
      console.warn('Session ID signature verification failed:', {
        provided: signature,
        expected: expectedSignature,
        sessionId: sessionId
      });
      return null; // Invalid signature
    }

    return sessionId;
  }

  /**
   * Validate session ID format (basic validation)
   */
  isValidSessionIdFormat(sessionId) {
    if(!sessionId || typeof sessionId !== 'string') {
      return false;
    }

    // Express session IDs are typically 32+ characters of alphanumeric + special chars
    return /^[a-zA-Z0-9\-_]{20,}$/.test(sessionId);
  }

  /**
   * Generate secure session token for additional validation
   */
  generateSecureToken(sessionId, userAgent = '') {
    const data = `${sessionId}:${userAgent}:${Date.now()}`;
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex')
      .substring(0, 32);
  }
}

module.exports = SessionSecurity;