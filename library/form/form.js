class Form {

  constructor(options = {}) {
    this.elements = {};
    this.attribs = {};

    this.data = null;
  }

  add(element) {
    this.elements[element.getName()] = element;

    return this;
  }

  get(field) {
    return this.elements[field];
  }

  has(name) {
    if(this.elements.hasOwnProperty(name)) {
      return true;
    }

    return false;
  }

  remove(name) {
    if(!this.elements.hasOwnProperty(name)) {
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
    return this.getAttribute('action');
  }

  setMethod(method) {
    this.setAttrib('method', method);

    return this;
  }

  getMethod() {
    return this.getAttrib('method');
  }

  addAttribs(attribs) {}

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
  }

  getAttrib(key) {
    if(!this.attribs.hasOwnProperty(key)) {
      return null;
    }

    return this.attribs[key];
  }

  getAttribs() {
    return this.attribs;
  }

  /**
   * Set form data and populate form elements (ZF2 style)
   * @param {Object} data - Data object to populate form with
   * @returns {Form}
   */
  setData(data) {
    this.data = data || {};
    this.populateValues(this.data);
    return this;
  }

  /**
   * Get form data
   * @returns {Object}
   */
  getData() {
    return this.data;
  }

  /**
   * Populate form elements with data (ZF2 style)
   * @param {Object} data - Data to populate elements with
   * @returns {Form}
   */
  populateValues(data) {
    if(!data || typeof data !== 'object') {
      return this;
    }

    // Iterate through all form elements
    Object.keys(this.elements).forEach((elementName) => {
      const element = this.elements[elementName];

      // Check if data contains value for this element
      if(Object.prototype.hasOwnProperty.call(data, elementName)) {
        const value = data[elementName];
        // Handle different element types
        this._populateElementValue(element, value, elementName);
      }
    });

    return this;
  }

  /**
   * Populate individual element based on its type
   * @param {Element} element - Form element to populate
   * @param {*} value - Value to set
   * @param {string} elementName - Element name for debugging
   * @private
   */
  _populateElementValue(element, value, elementName) {
    try {
      // Only skip if truly absent
      if(value === undefined) return;

      // If your request parser returns null for missing fields, treat null as empty string
      if(value === null) value = '';

      const elementType = element.getAttribute('type');

      switch(elementType) {
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
          // Text, password, hidden, textarea, etc.
          element.setValue(value);
          break;
      }
    } catch (error) {
      console.warn(`Error populating element '${elementName}':`, error.message);
      // Fallback to basic setValue
      element.setValue(value);
    }
  }

  /**
   * Populate checkbox element
   * @param {Element} element 
   * @param {*} value 
   * @private
   */
  _populateCheckbox(element, value) {
    const elementValue = element.getAttribute('value') || 'on';

    // Check if checkbox should be checked
    if(Array.isArray(value)) {
      // Multiple checkboxes with same name
      const isChecked = value.includes(elementValue);
      element.setAttribute('checked', isChecked ? 'checked' : null);
    } else {
      // Single checkbox
      const isChecked = (value === elementValue) ||
        (value === true) ||
        (value === 1) ||
        (value === '1') ||
        (value === 'on');
      element.setAttribute('checked', isChecked ? 'checked' : null);
    }
  }

  /**
   * Populate radio button element
   * @param {Element} element 
   * @param {*} value 
   * @private
   */
  _populateRadio(element, value) {
    // Radio group element (Radio class has valueOptions)
    if(element.getValueOptions && typeof element.getValueOptions === 'function') {
      // Store the select value on the group
      element.setValue(value);
      return;
    }

    // Single radio input element (one <input type="radio"> represent as an Element)
    const elementValue = element.getAttribute('value');
    const isChecked = (String(value) === String(elementValue));
    element.setAttribute('checked', isChecked ? 'checked' : null);
  }

  /**
   * Populate select element
   * @param {Element} element 
   * @param {*} value 
   * @private
   */
  _populateSelect(element, value) {
    element.setValue(value);
    // Note: Individual option selection would require option elements
    // This basic implementation sets the value attribute
  }

  /**
   * Get values from all form elements
   * @returns {Object}
   */
  getValues() {
    const values = {};

    Object.keys(this.elements).forEach((elementName) => {
      const element = this.elements[elementName];
      const elementType = element.getAttribute('type');

      if(elementType === 'checkbox') {
        const isChecked = element.getAttribute('checked') === 'checked';
        if(isChecked) {
          const value = element.getAttribute('value') || 'on';
          // Handle multiple checkboxes with same name
          if(values[elementName]) {
            if(!Array.isArray(values[elementName])) {
              values[elementName] = [values[elementName]];
            }
            values[elementName].push(value);
          } else {
            values[elementName] = value;
          }
        }
      } else if(elementType === 'radio') {
        // For radio buttons, check if element has valueOptions (Radio class)
        if(element.getValueOptions && typeof element.getValueOptions === 'function') {
          // This is a Radio element with multiple options
          const selectedValue = element.getValue();
          if(selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
            values[elementName] = selectedValue;
          }
        } else {
          // Single radio button
          const isChecked = element.getAttribute('checked') === 'checked';
          if(isChecked) {
            values[elementName] = element.getAttribute('value');
          }
        }
      } else {
        // Text, password, hidden, select, etc.
        const value = element.getValue();
        if(value !== null && value !== undefined && value !== '') {
          values[elementName] = value;
        }
      }
    });

    return values;
  }

  /**
   * Check if form is valid using InputFilter 
   * @param {Object} data - Data to validate (optional, uses form raw data if not provided)
   * @returns {boolean}
   */
  isValid(data = null) {
    if(!this.inputFilter) {
      console.warn('No InputFilter set for form validation');
      return true;
    }

    // Use the raw data set by setData(), not the parsed form values
    const validationData = data || this.data || {};
    this.inputFilter.setData(validationData);

    return this.inputFilter.isValid();
  }

  /**
   * Set InputFilter for form validation
   * @param {InputFilter} inputFilter 
   * @returns {Form}
   */
  setInputFilter(inputFilter) {
    this.inputFilter = inputFilter;
    return this;
  }

  /**
   * Get InputFilter
   * @returns {InputFilter}
   */
  getInputFilter() {
    return this.inputFilter;
  }

  /**
   * Get validation messages from InputFilter
   * @returns {Object}
   */
  getMessages() {
    if(!this.inputFilter) {
      return {};
    }

    const messages = {};
    const invalidInputs = this.inputFilter.getInvalidInputs();

    Object.keys(invalidInputs).forEach((fieldName) => {
      messages[fieldName] = invalidInputs[fieldName].getMessages();
    });

    return messages;
  }

  /**
   * Check if form has validation errors
   * @returns {boolean}
   */
  hasErrors() {
    const messages = this.getMessages();
    return Object.keys(messages).length > 0;
  }

  /**
   * Bind data to form (alias for setData for ZF2 compatibility)
   * @param {Object} data 
   * @returns {Form}
   */
  bind(data) {
    return this.setData(data);
  }

  /**
   * Reset form to empty values
   * @returns {Form}
   */
  reset() {
    Object.keys(this.elements).forEach((elementName) => {
      const element = this.elements[elementName];
      const elementType = element.getAttribute('type');

      if(elementType === 'checkbox' || elementType === 'radio') {
        element.setAttribute('checked', null);
      } else {
        element.setValue('');
      }
    });

    this.data = {};
    return this;
  }

}

module.exports = Form