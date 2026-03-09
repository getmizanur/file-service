// library/input-filter/validators/ip.js
const AbstractValidator = require('./abstract-validator');

class Ip extends AbstractValidator {

  constructor(options = {}) {
    super();
    this.name = options.name || 'input';
    this.allowip4 = options.allowip4 || true;
    this.allowip6 = options.allowip6 || false;

    this.message = null;
    this.messageTemplate = {
      INVALID: 'Invalid type given. String expected',
      NOT_IP_ADDRESS: `The ${options.input} does not appear to be a valid IP address`
    }
  }

  isValid(value) {
    if(typeof value !== 'string') {
      this.message = this.messageTemplate.INVALID;
      return false;
    }

    if((this.allowip4 && this.validateIp4(value)) || (this.allowip6 && this.validateIp6(value))) {
      return true;
    }

    this.message = this.messageTemplate.NOT_IP_ADDRESS;
    return false;
  }

  validateIp4(value) {
    let regex = new RegExp(/^(([0-9]{1,3}\.){3}[0-9]{1,3})$/);
    if(regex.test(value)) {
      let arInput = value.split(".")
      for(let i of arInput) {
        if((i.length > 1 && i.charAt(0) === '0') || Number.parseInt(i) < 0 || Number.parseInt(i) >= 256)
          return false;
      }
    } else
      return false;
    return true;
  }

  validateIp6(value) {
    const net = require('node:net');
    return net.isIPv6(value);
  }

}

module.exports = Ip