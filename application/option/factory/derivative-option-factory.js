// application/option/factory/derivative-option-factory.js
const AbstractFactory = require(global.applicationPath('/library/mvc/service/abstract-factory'));
const DerivativeOption = require(global.applicationPath('/application/option/derivative-option'));

class DerivativeOptionFactory extends AbstractFactory {

  createService(serviceManager) {
    const config = serviceManager.get('config');
    const derivativeOptionConfig = this.getNestedConfig(config, 'derivative_option', {});
    return new DerivativeOption(derivativeOptionConfig);
  }

  getRequiredConfigKeys() {
    return ['derivative_option'];
  }

  validateConfiguration(config) {
    const sofficeBin = this.getNestedConfig(config, 'derivative_option.soffice_bin');
    if (sofficeBin !== null && typeof sofficeBin !== 'string') {
      console.error('derivative_option.soffice_bin must be a string or null');
      return false;
    }
    return true;
  }
}

module.exports = DerivativeOptionFactory;
