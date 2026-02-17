const Input = require('./input');
const VarUtil = require('../util/var-util');

class InputFilter {

  constructor() {
    this.inputs = [];
    this.invalidInputs = [];
    this.data = {};
  }

  add(input) {
    this.inputs[input.getName()] = input;
  }

  get(name) {
    return this.inputs[name];
  }

  getValue(name) {
    return this.inputs[name].getValue();
  }

  getRawValue(name) {
    if (Object.prototype.hasOwnProperty.call(this.data, name))
      return this.data[name];

    return null;
  }

  getValues() {
    return this.data;
  }

  setData(data) {
    this.data = data || {};
    this.populate();
  }

  populate() {
    Object.keys(this.inputs).forEach((name) => {
      let value = null;
      if (Object.prototype.hasOwnProperty.call(this.data, name)) {
        const filterChain = this.inputs[name].getFilters();

        value = this.data[name];
        this.inputs[name].setValue(value);

        filterChain.forEach((filter) => {
          value = filter.filter(value);
        });
      }
      this.inputs[name].setValue(value);
    });
  }

  getInvalidInputs() {
    return this.invalidInputs;
  }

  isValid(context = null) {
    let isValid = true;
    let inputContext = context || this.data;
    Object.keys(this.inputs).forEach((name) => {
      let valid = this.inputs[name].isValid(inputContext);
      if (!valid) {
        this.invalidInputs[name] = this.inputs[name];

        isValid = false;
      }
    });

    return isValid;
  }

  static factory(items) {
    const inputFilter = new InputFilter();
    for (let name in items) {
      const input = new Input(name);

      //const { validators, filters, required, requiredMessage, allowEmpty, continueIfEmpty } = items[name];
      const {
        validators,
        filters,
        required,
        requiredMessage
      } = items[name];
      if (VarUtil.isBool(required)) {
        input.setRequired(required);
      }

      // Set custom required message if provided
      if (VarUtil.isString(requiredMessage) && !VarUtil.empty(requiredMessage)) {
        input.setRequiredMessage(requiredMessage);
      }

      /*if(VarUtil.isBool(allowEmpty)) {
          input.setAllowEmpty(allowEmpty);
      }

      if(VarUtil.isBool(continueIfEmpty)) {
          input.setContinueIfEmpty(continueIfEmpty);
      }*/

      if (Array.isArray(filters)) {
        filters.forEach((filter) => {
          try {
            const {
              name
            } = filter;
            if (VarUtil.isString(name) && !VarUtil.empty(name)) {
              // Convert name to kebab-case for requiring files
              const fileName = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
              const Instance = require(`./filters/${fileName}`);
              const obj = new Instance();
              /* istanbul ignore next */
              if (typeof (obj.filter) === 'function') {
                input.setFilters(obj);
              }
            }
          } catch (err) {
            /* istanbul ignore next */
            console.log(`Error: ${err.message}`);
          }
        });
      }

      if (Array.isArray(validators)) {
        validators.forEach((validator) => {
          try {
            const {
              name,
              options,
              messages
            } = validator;
            if (VarUtil.isString(name) && !VarUtil.empty(name)) {
              // Convert name to kebab-case for requiring files
              const fileName = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
              const Instance = require(`./validators/${fileName}`);
              const obj = (VarUtil.isObject(options) ?
                new Instance(options) : new Instance());
              /* istanbul ignore next */
              if (typeof (obj.isValid) === 'function') {
                // Set custom messages on validator if provided
                if (VarUtil.isObject(messages)) {
                  Object.keys(messages).forEach((messageKey) => {
                    if (obj.setMessage && typeof (obj.setMessage) === 'function') {
                      obj.setMessage(messages[messageKey], messageKey);
                    } else {
                      // Fallback: override the default message
                      obj.message = messages[messageKey];
                    }
                  });
                }
                input.setValidators(obj);
              }
            }
          } catch (err) {
            /* istanbul ignore next */
            console.log(`Error: ${err.message}`);
          }
        });
      }
      inputFilter.add(input);
    }

    return inputFilter;
  }

}

module.exports = InputFilter