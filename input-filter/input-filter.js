// library/input-filter/input-filter.js
const Input = require('./input');
const VarUtil = require('../util/var-util');

class InputFilter {

  constructor() {
    // was [] but used like an object map
    this.inputs = {};
    this.invalidInputs = {};
    this.data = {};
  }

  add(input) {
    this.inputs[input.getName()] = input;
  }

  get(name) {
    return this.inputs[name];
  }

  getValue(name) {
    return this.inputs[name]?.getValue();
  }

  getRawValue(name) {
    if (Object.prototype.hasOwnProperty.call(this.data, name)) {
      return this.data[name];
    }
    return null;
  }

  /**
   * Returns filtered/normalized values from inputs.
   * Filters (StringTrim, StripTags, etc.) are applied during populate().
   */
  getValues() {
    const out = {};
    Object.keys(this.inputs).forEach((name) => {
      out[name] = this.inputs[name].getValue();
    });
    return out;
  }

  /**
   * Returns the original unfiltered input data.
   */
  getRawValues() {
    return this.data;
  }

  setData(data) {
    this.data = data || {};
    this.populate();
  }

  /**
   * Apply filters to provided values and store on each input.
   * If the field isn't present in input data, we set null.
   */
  populate() {
    Object.keys(this.inputs).forEach((name) => {
      let value = null;

      if (Object.prototype.hasOwnProperty.call(this.data, name)) {
        const filterChain = this.inputs[name].getFilters();
        value = this.data[name];

        // set initial raw
        this.inputs[name].setValue(value);

        // apply filters in order
        filterChain.forEach((filter) => {
          value = filter.filter(value);
        });
      }

      // store filtered (or null if missing)
      this.inputs[name].setValue(value);
    });
  }

  getInvalidInputs() {
    return this.invalidInputs;
  }

  /**
   * Aggregate validation messages from all invalid inputs.
   * Returns ZF2-style map: { fieldName: [message1, message2, ...] }
   */
  getMessages() {
    const messages = {};
    Object.keys(this.invalidInputs).forEach((name) => {
      const input = this.invalidInputs[name];
      if (input && typeof input.getMessages === 'function') {
        messages[name] = input.getMessages();
      }
    });
    return messages;
  }

  /**
   * Validate all inputs.
   * - resets invalidInputs each run (prevents stale errors)
   * - passes context (defaults to original data)
   */
  isValid(context = null) {
    let isValid = true;
    const inputContext = context || this.data;

    // IMPORTANT: reset each run
    this.invalidInputs = {};

    Object.keys(this.inputs).forEach((name) => {
      const valid = this.inputs[name].isValid(inputContext);
      if (!valid) {
        this.invalidInputs[name] = this.inputs[name];
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Factory for creating an InputFilter from config.
   *
   * Supports:
   * - required (bool)
   * - requiredMessage (string)
   * - allow_empty / allowEmpty (bool)
   * - continue_if_empty / continueIfEmpty (bool)
   * - filters[]: [{ name: 'StringTrim', options? }]
   * - validators[]: [{ name: 'EmailAddress', options?, messages? }]
   */
  static factory(items) {
    const inputFilter = new InputFilter();

    for (let inputName in items) {
      const spec = items[inputName] || {};
      const input = new Input(inputName);

      const {
        validators,
        filters,
        required,
        requiredMessage
      } = spec;

      // ZF2 naming + JS naming aliases
      const allowEmpty =
        VarUtil.isBool(spec.allow_empty) ? spec.allow_empty :
          (VarUtil.isBool(spec.allowEmpty) ? spec.allowEmpty : undefined);

      const continueIfEmpty =
        VarUtil.isBool(spec.continue_if_empty) ? spec.continue_if_empty :
          (VarUtil.isBool(spec.continueIfEmpty) ? spec.continueIfEmpty : undefined);

      // required
      if (VarUtil.isBool(required)) {
        input.setRequired(required);
      }

      // Set custom required message if provided
      if (VarUtil.isString(requiredMessage) && !VarUtil.empty(requiredMessage)) {
        input.setRequiredMessage(requiredMessage);
      }

      /**
       * allow_empty / continue_if_empty (ZF2-like)
       *
       * These depend on Input implementing:
       *  - setAllowEmpty(bool)
       *  - setContinueIfEmpty(bool)
       *
       * If your Input class doesn't have these setters, we store the flags
       * on the instance as a non-breaking fallback.
       */
      if (VarUtil.isBool(allowEmpty)) {
        if (typeof input.setAllowEmpty === 'function') {
          input.setAllowEmpty(allowEmpty);
        } else {
          // non-breaking fallback
          input.allowEmpty = allowEmpty;
        }
      }

      if (VarUtil.isBool(continueIfEmpty)) {
        if (typeof input.setContinueIfEmpty === 'function') {
          input.setContinueIfEmpty(continueIfEmpty);
        } else {
          input.continueIfEmpty = continueIfEmpty;
        }
      }

      // filters
      if (Array.isArray(filters)) {
        filters.forEach((filter) => {
          try {
            const { name } = filter || {};
            if (VarUtil.isString(name) && !VarUtil.empty(name)) {
              // Convert name to kebab-case for requiring files
              const fileName = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
              const Instance = require(`./filters/${fileName}`);
              const obj = new Instance();

              if (typeof obj.filter === 'function') {
                input.setFilters(obj);
              }
            }
          } catch (err) {
            console.log(`Error: ${err.message}`);
          }
        });
      }

      // validators
      if (Array.isArray(validators)) {
        validators.forEach((validator) => {
          try {
            const { name, options, messages } = validator || {};
            if (VarUtil.isString(name) && !VarUtil.empty(name)) {
              // Convert name to kebab-case for requiring files
              const fileName = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
              const Instance = require(`./validators/${fileName}`);
              const obj = (VarUtil.isObject(options) ? new Instance(options) : new Instance());

              if (typeof obj.isValid === 'function') {
                // Set custom messages on validator if provided
                if (VarUtil.isObject(messages)) {
                  Object.keys(messages).forEach((messageKey) => {
                    if (obj.setMessage && typeof obj.setMessage === 'function') {
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
            console.log(`Error: ${err.message}`);
          }
        });
      }

      inputFilter.add(input);
    }

    return inputFilter;
  }
}

module.exports = InputFilter;