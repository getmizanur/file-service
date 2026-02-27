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
      // Get the Request object — prefer MvcEvent (request-scoped), fall back to Application
      let request = null;
      try {
        const event = serviceManager.get('MvcEvent');
        if (event && typeof event.getRequest === 'function') {
          request = event.getRequest();
        }
      } catch (_) {}

      if (!request) {
        const app = serviceManager.get('Application');
        request = app.getRequest();
      }

      if(!request) {
        throw new Error('Request not available in Application service');
      }

      // Get the Express request object for SessionStorage
      const expressReq = request.getExpressRequest();

      if(!expressReq || !expressReq.session) {
        throw new Error('Express session not available in request');
      }

      console.log('[AuthServiceFactory] Session ID:', expressReq.sessionID);

      // Create SessionStorage with the Express request (Session.start expects req, not req.session)
      const storage = new SessionStorage(expressReq);

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