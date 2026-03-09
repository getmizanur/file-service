// library/input-filter/input-filter.js
const Input = require('./input');
const VarUtil = require('../util/var-util');

class InputFilter {

  // was [] but used like an object map
  inputs = {};
  invalidInputs = {};
  data = {};

  constructor() {
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
    if (Object.hasOwn(this.data, name)) {
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

      if (Object.hasOwn(this.data, name)) {
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
   * Returns map: { fieldName: [message1, message2, ...] }
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

      InputFilter._applyInputFlags(input, spec);
      InputFilter._applyFilters(input, spec.filters);
      InputFilter._applyValidators(input, spec.validators);

      inputFilter.add(input);
    }

    return inputFilter;
  }

  static _applyInputFlags(input, spec) {
    const { required, requiredMessage } = spec;

    if (VarUtil.isBool(required)) {
      input.setRequired(required);
    }
    if (VarUtil.isString(requiredMessage) && !VarUtil.empty(requiredMessage)) {
      input.setRequiredMessage(requiredMessage);
    }

    InputFilter._applyBoolFlag(input, 'AllowEmpty', spec.allow_empty, spec.allowEmpty);
    InputFilter._applyBoolFlag(input, 'ContinueIfEmpty', spec.continue_if_empty, spec.continueIfEmpty);
  }

  static _applyBoolFlag(input, setterSuffix, snakeVal, camelVal) {
    let value;
    if (VarUtil.isBool(snakeVal)) {
      value = snakeVal;
    } else if (VarUtil.isBool(camelVal)) {
      value = camelVal;
    }
    if (!VarUtil.isBool(value)) return;

    const setter = `set${setterSuffix}`;
    if (typeof input[setter] === 'function') input[setter](value);
    else input[setterSuffix.charAt(0).toLowerCase() + setterSuffix.slice(1)] = value;
  }

  static _toKebabFileName(name) {
    return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  static _applyFilters(input, filters) {
    if (!Array.isArray(filters)) return;

    filters.forEach((filter) => {
      try {
        const { name } = filter || {};
        if (!VarUtil.isString(name) || VarUtil.empty(name)) return;

        const Instance = require(`./filters/${InputFilter._toKebabFileName(name)}`);
        const obj = new Instance();
        if (typeof obj.filter === 'function') {
          input.setFilters(obj);
        }
      } catch (err) {
        console.log(`Error: ${err.message}`);
      }
    });
  }

  static _applyValidators(input, validators) {
    if (!Array.isArray(validators)) return;

    validators.forEach((validator) => {
      try {
        const { name, options, messages } = validator || {};
        if (!VarUtil.isString(name) || VarUtil.empty(name)) return;

        const Instance = require(`./validators/${InputFilter._toKebabFileName(name)}`);
        const obj = VarUtil.isObject(options) ? new Instance(options) : new Instance();

        if (typeof obj.isValid === 'function') {
          InputFilter._applyValidatorMessages(obj, messages);
          input.setValidators(obj);
        }
      } catch (err) {
        console.log(`Error: ${err.message}`);
      }
    });
  }

  static _applyValidatorMessages(obj, messages) {
    if (!VarUtil.isObject(messages)) return;

    Object.keys(messages).forEach((messageKey) => {
      if (obj.setMessage && typeof obj.setMessage === 'function') {
        obj.setMessage(messages[messageKey], messageKey);
      } else {
        obj.message = messages[messageKey];
      }
    });
  }
}

module.exports = InputFilter;