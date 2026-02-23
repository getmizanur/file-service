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

    if(this.allowip4 && this.validateIp4(value)) {
      return true;
    } else {
      if(this.allowip6 && this.validateIp6(value)) {
        return true;
      }
    }

    this.message = this.messageTemplate.NOT_IP_ADDRESS;
    return false;
  }

  validateIp4(value) {
    let regex = new RegExp(/^(([0-9]{1,3}\.){3}[0-9]{1,3})$/);
    if(regex.test(value)) {
      let arInput = value.split(".")
      for(let i of arInput) {
        if(i.length > 1 && i.charAt(0) === '0')
          return false;
        else {
          if(parseInt(i) < 0 || parseInt(i) >= 256)
            return false;
        }
      }
    } else
      return false;
    return true;
  }

  validateIp6(value) {
    let regex = new RegExp(/^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$/gm);
    if(regex.test(value)) {
      return true;
    }

    return false;
  }

}

module.exports = Ip