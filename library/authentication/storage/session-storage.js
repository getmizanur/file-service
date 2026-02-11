// library/authentication/storage/session.js
// Session-based storage for authentication identity
// Stores directly in express-session for maximum compatibility

/**
 * Session Storage
 * Stores authentication identity directly in express-session
 * Simple and reliable approach that works with both file and Redis stores
 */
class Session {
  /**
   * Session key for storing identity
   * @type {string}
   */
  static IDENTITY_KEY = 'authIdentity';

  /**
   * Constructor
   * @param {Object} expressSession - Express-session req.session instance
   */
  constructor(expressSession = null) {
    // Store the express session reference directly
    this.expressSession = expressSession;

    // Fallback to global.locals.expressSession if not provided
    if(!this.expressSession && global.locals && global.locals.expressSession) {
      this.expressSession = global.locals.expressSession;
    }
  }

  /**
   * Returns true if and only if storage is empty
   * @returns {boolean}
   */
  isEmpty() {
    if(!this.expressSession) {
      console.log(`[SessionStorage.isEmpty] No express session available, returning: true`);
      return true;
    }

    const hasIdentity = this.expressSession.hasOwnProperty(Session.IDENTITY_KEY) &&
      this.expressSession[Session.IDENTITY_KEY] !== null &&
      this.expressSession[Session.IDENTITY_KEY] !== undefined;

    console.log(`[SessionStorage.isEmpty] session.${Session.IDENTITY_KEY} exists: ${hasIdentity}, returning: ${!hasIdentity}`);
    if(hasIdentity) {
      console.log(`[SessionStorage.isEmpty] Identity value:`, JSON.stringify(this.expressSession[Session.IDENTITY_KEY]));
    }

    return !hasIdentity;
  }

  /**
   * Returns the contents of storage
   * @returns {*|null}
   */
  read() {
    if(!this.expressSession) {
      console.log(`[SessionStorage.read] No express session available`);
      return null;
    }

    const identity = this.expressSession[Session.IDENTITY_KEY] || null;
    console.log(`[SessionStorage.read] Returning identity:`, identity ? 'EXISTS' : 'NULL');
    return identity;
  }

  /**
   * Writes contents to storage
   * @param {*} contents - Data to store
   */
  write(contents) {
    if(!this.expressSession) {
      console.error(`[SessionStorage.write] No express session available!`);
      return;
    }

    console.log(`[SessionStorage.write] *** IDENTITY BEING WRITTEN ***`);
    console.log(`[SessionStorage.write] Session ID:`, this.expressSession.id);
    console.log(`[SessionStorage.write] Writing identity to session.${Session.IDENTITY_KEY}`);
    console.log(`[SessionStorage.write] Identity data:`, JSON.stringify(contents));
    console.log(`[SessionStorage.write] Call stack:`);
    console.trace();

    this.expressSession[Session.IDENTITY_KEY] = contents;

    // Touch the session to mark it as modified
    this.expressSession._modifiedAt = Date.now();

    console.log(`[SessionStorage.write] Identity written, session.${Session.IDENTITY_KEY}:`,
      this.expressSession[Session.IDENTITY_KEY] ? 'EXISTS' : 'NULL');
  }

  /**
   * Clears contents from storage
   */
  clear() {
    if(!this.expressSession) {
      console.log(`[SessionStorage.clear] No express session available`);
      return;
    }

    console.log(`[SessionStorage.clear] Clearing identity from session.${Session.IDENTITY_KEY}`);
    console.log(`[SessionStorage.clear] Session before delete:`, JSON.stringify(this.expressSession));

    delete this.expressSession[Session.IDENTITY_KEY];

    // CRITICAL: Force express-session to recognize this as a modification
    // With resave:false, we must explicitly touch the session
    if(typeof this.expressSession.touch === 'function') {
      this.expressSession.touch();
      console.log(`[SessionStorage.clear] Session touched via touch() method`);
    }

    // Also set a modification timestamp as backup
    this.expressSession._modifiedAt = Date.now();

    console.log(`[SessionStorage.clear] Session after delete:`, JSON.stringify(this.expressSession));
    console.log(`[SessionStorage.clear] authIdentity should be undefined:`, this.expressSession[Session.IDENTITY_KEY]);
  }
}

module.exports = Session;