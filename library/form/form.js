class Form {

  constructor(options = {}) {
    this.elements = {};
    this.attribs = {};
    this.data = null;

    // Optional (ZF2-style)
    this.inputFilter = null;

    // Optional small knobs
    this.options = options || {};
    this.debug = !!this.options.debug;
  }

  _log(...args) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.debug('[Form]', ...args);
    }
  }

  add(element) {
    if (!element || typeof element.getName !== 'function') {
      throw new Error('Form.add(): element must implement getName()');
    }

    this.elements[element.getName()] = element;
    return this;
  }

  get(field) {
    return this.elements[field];
  }

  has(name) {
    return Object.prototype.hasOwnProperty.call(this.elements, name);
  }

  remove(name) {
    if (!Object.prototype.hasOwnProperty.call(this.elements, name)) {
      return this;
    }
    delete this.elements[name];
    return this;
  }

  getElements() {
    return this.elements;
  }

  setAction(action) {
    this.setAttrib('action', action);
    return this;
  }

  getAction() {
    return this.getAttrib('action');
  }

  setMethod(method) {
    this.setAttrib('method', method);
    return this;
  }

  getMethod() {
    return this.getAttrib('method');
  }

  /**
   * Add multiple attributes without clearing existing ones
   * @param {Object} attribs
   * @returns {Form}
   */
  addAttribs(attribs) {
    if (!attribs || typeof attribs !== 'object') {
      return this;
    }

    for (const key in attribs) {
      if (!Object.prototype.hasOwnProperty.call(attribs, key)) continue;
      this.setAttrib(key, attribs[key]);
    }

    return this;
  }

  setAttrib(key, value) {
    this.attribs[key] = value;
    return this;
  }

  setAttribs(attribs) {
    this.clearAttribs();
    this.addAttribs(attribs);
    return this;
  }

  clearAttribs() {
    this.attribs = {};
    return this;
  }

  removeAttrib(key) {
    delete this.attribs[key];
    return this;
  }

  getAttrib(key) {
    if (!Object.prototype.hasOwnProperty.call(this.attribs, key)) {
      return null;
    }
    return this.attribs[key];
  }

  getAttribs() {
    return this.attribs;
  }

  /**
   * Alias (some helpers call getAttributes())
   */
  getAttributes() {
    return this.getAttribs();
  }

  /**
   * Set form data and populate form elements (ZF2 style)
   * @param {Object} data
   * @returns {Form}
   */
  setData(data) {
    this.data = data || {};
    this.populateValues(this.data);
    return this;
  }

  /**
   * Get raw form data (what was set via setData)
   * @returns {Object|null}
   */
  getData() {
    return this.data;
  }

  /**
   * Populate form elements with data (ZF2 style)
   * @param {Object} data
   * @returns {Form}
   */
  populateValues(data) {
    if (!data || typeof data !== 'object') {
      return this;
    }

    Object.keys(this.elements).forEach((elementName) => {
      const element = this.elements[elementName];

      if (Object.prototype.hasOwnProperty.call(data, elementName)) {
        const value = data[elementName];
        this._populateElementValue(element, value, elementName);
      }
    });

    return this;
  }

  _populateElementValue(element, value, elementName) {
    try {
      if (value === undefined) return;
      if (value === null) value = '';

      const elementType = (typeof element.getAttribute === 'function')
        ? element.getAttribute('type')
        : null;

      switch (elementType) {
        case 'checkbox':
          this._populateCheckbox(element, value);
          break;

        case 'radio':
          this._populateRadio(element, value);
          break;

        case 'select':
        case 'select-one':
        case 'select-multiple':
          this._populateSelect(element, value);
          break;

        default:
          if (typeof element.setValue === 'function') {
            element.setValue(value);
          }
          break;
      }
    } catch (error) {
      this._log(`Error populating element '${elementName}': ${error.message}`);
      // Fallback
      if (element && typeof element.setValue === 'function') {
        element.setValue(value);
      }
    }
  }

  _populateCheckbox(element, value) {
    const elementValue = (typeof element.getAttribute === 'function' && element.getAttribute('value')) || 'on';

    if (Array.isArray(value)) {
      const isChecked = value.includes(elementValue);
      if (typeof element.setAttribute === 'function') {
        element.setAttribute('checked', isChecked ? 'checked' : null);
      }
    } else {
      const isChecked =
        (value === elementValue) ||
        (value === true) ||
        (value === 1) ||
        (value === '1') ||
        (value === 'on');

      if (typeof element.setAttribute === 'function') {
        element.setAttribute('checked', isChecked ? 'checked' : null);
      }
    }
  }

  _populateRadio(element, value) {
    // Radio group element
    if (element.getValueOptions && typeof element.getValueOptions === 'function') {
      if (typeof element.setValue === 'function') {
        element.setValue(value);
      }
      return;
    }

    // Single radio input
    const elementValue = (typeof element.getAttribute === 'function') ? element.getAttribute('value') : null;
    const isChecked = (String(value) === String(elementValue));
    if (typeof element.setAttribute === 'function') {
      element.setAttribute('checked', isChecked ? 'checked' : null);
    }
  }

  _populateSelect(element, value) {
    if (typeof element.setValue === 'function') {
      element.setValue(value);
    }
  }

  /**
   * Extract values from elements (best-effort)
   * @returns {Object}
   */
  getValues() {
    const values = {};

    Object.keys(this.elements).forEach((elementName) => {
      const element = this.elements[elementName];
      const elementType = (typeof element.getAttribute === 'function')
        ? element.getAttribute('type')
        : null;

      if (elementType === 'checkbox') {
        const isChecked = (typeof element.getAttribute === 'function') && (element.getAttribute('checked') === 'checked');
        if (isChecked) {
          const value = (typeof element.getAttribute === 'function' && element.getAttribute('value')) || 'on';

          if (Object.prototype.hasOwnProperty.call(values, elementName)) {
            if (!Array.isArray(values[elementName])) {
              values[elementName] = [values[elementName]];
            }
            values[elementName].push(value);
          } else {
            values[elementName] = value;
          }
        }

      } else if (elementType === 'radio') {
        if (element.getValueOptions && typeof element.getValueOptions === 'function') {
          const selectedValue = (typeof element.getValue === 'function') ? element.getValue() : null;
          if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
            values[elementName] = selectedValue;
          }
        } else {
          const isChecked = (typeof element.getAttribute === 'function') && (element.getAttribute('checked') === 'checked');
          if (isChecked) {
            values[elementName] = (typeof element.getAttribute === 'function') ? element.getAttribute('value') : null;
          }
        }

      } else {
        const value = (typeof element.getValue === 'function') ? element.getValue() : null;
        if (value !== null && value !== undefined && value !== '') {
          values[elementName] = value;
        }
      }
    });

    return values;
  }

  /**
   * Validate form via InputFilter
   * @param {Object|null} data
   * @returns {boolean}
   */
  isValid(data = null) {
    if (!this.inputFilter) {
      // keep existing behavior: no filter => valid
      this._log('No InputFilter set for form validation');
      return true;
    }

    const validationData = data || this.data || {};
    this.inputFilter.setData(validationData);

    return this.inputFilter.isValid();
  }

  setInputFilter(inputFilter) {
    this.inputFilter = inputFilter;
    return this;
  }

  getInputFilter() {
    return this.inputFilter;
  }

  getMessages() {
    if (!this.inputFilter) {
      return {};
    }

    const messages = {};
    const invalidInputs = this.inputFilter.getInvalidInputs();

    Object.keys(invalidInputs).forEach((fieldName) => {
      messages[fieldName] = invalidInputs[fieldName].getMessages();
    });

    return messages;
  }

  hasErrors() {
    const messages = this.getMessages();
    return Object.keys(messages).length > 0;
  }

  bind(data) {
    return this.setData(data);
  }

  reset() {
    Object.keys(this.elements).forEach((elementName) => {
      const element = this.elements[elementName];
      const elementType = (typeof element.getAttribute === 'function')
        ? element.getAttribute('type')
        : null;

      if (elementType === 'checkbox' || elementType === 'radio') {
        if (typeof element.setAttribute === 'function') {
          element.setAttribute('checked', null);
        }
      } else {
        if (typeof element.setValue === 'function') {
          element.setValue('');
        }
      }
    });

    this.data = {};
    return this;
  }
}

module.exports = Form;