class AbstractViewHelperFactory {

  /**
   * Create service instance with dependencies
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {Object} - Service instance
   */
  createService(serviceManager) {
    throw new Error('AbstractViewHelperFactory::createService() must be implemented by subclass');
  }

}

module.exports = AbstractViewHelperFactory;
