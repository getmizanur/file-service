// application/service/factory/authenticationServiceFactory.js
// Factory for creating AuthenticationService with session storage

const AbstractFactory = require(global.applicationPath('/library/mvc/service/abstract-factory'));
const AuthenticationService = require(global.applicationPath('/library/authentication/authentication-service'));
const SessionStorage = require(global.applicationPath('/library/authentication/storage/session-storage'));

/**
 * AuthenticationServiceFactory
 * Creates AuthenticationService with session storage from Request
 */
class AuthenticationServiceFactory extends AbstractFactory {
  /**
   * Create AuthenticationService instance
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {AuthenticationService} AuthenticationService instance
   */
  createService(serviceManager) {
    try {
      // Get the Request object from Application service
      const app = serviceManager.get('Application');
      const request = app.getRequest();

      if(!request) {
        throw new Error('Request not available in Application service');
      }

      // Get the session from the Request
      const session = request.getSession();

      if(!session) {
        throw new Error('Session not available in request');
      }

      console.log('[AuthServiceFactory] Session ID:', session.id);
      console.log('[AuthServiceFactory] Session.AuthIdentity:', JSON.stringify(session.AuthIdentity));

      // Create SessionStorage with the session
      const storage = new SessionStorage(session);

      // Create and return AuthenticationService with session storage
      const authService = new AuthenticationService(storage);

      return authService;

    } catch (error) {
      console.error('Could not create AuthenticationService:', error.message);
      throw error;
    }
  }
}

module.exports = AuthenticationServiceFactory;