const VarUtil = require(global.applicationPath('/library/util/var-util'));

class Element {

  constructor() {
    this.attributes = {};
    this.labelAttributes = {};
    this.messages = [];
    this.label = null;

    // Optional ZF-ish options bucket (e.g. value_options)
    this.options = {};
  }

  setLabel(label) {
    this.label = label;
    return this;
  }

  getLabel() {
    return this.label;
  }

  setAttribute(key, value) {
    this.attributes[key] = value;
    return this;
  }

  /**
   * Set many attributes
   */
  setAttributes(attribs) {
    if (!VarUtil.isObject(attribs)) {
      return this; // keep chaining
    }

    for (const key in attribs) {
      if (!Object.prototype.hasOwnProperty.call(attribs, key)) continue;
      this.setAttribute(key, attribs[key]);
    }

    return this;
  }

  /**
   * Get attribute value with optional default
   */
  getAttribute(key, defaultValue = null) {
    if (!Object.prototype.hasOwnProperty.call(this.attributes, key)) {
      return defaultValue;
    }
    return this.attributes[key];
  }

  hasAttribute(key) {
    return Object.prototype.hasOwnProperty.call(this.attributes, key);
  }

  setLabelAttribute(key, value) {
    this.labelAttributes[key] = value;
    return this;
  }

  setLabelAttributes(attribs) {
    if (!VarUtil.isObject(attribs)) {
      return this; // keep chaining
    }

    for (const key in attribs) {
      if (!Object.prototype.hasOwnProperty.call(attribs, key)) continue;
      this.setLabelAttribute(key, attribs[key]);
    }

    return this;
  }

  getLabelAttribute(key, defaultValue = null) {
    if (!Object.prototype.hasOwnProperty.call(this.labelAttributes, key)) {
      return defaultValue;
    }
    return this.labelAttributes[key];
  }

  hasLabelAttribute(key) {
    return Object.prototype.hasOwnProperty.call(this.labelAttributes, key);
  }

  setName(name) {
    this.setAttribute('name', name);
    return this;
  }

  getName() {
    return this.getAttribute('name');
  }

  setType(type) {
    this.setAttribute('type', type);
    return this;
  }

  getType(defaultValue = null) {
    return this.getAttribute('type', defaultValue);
  }

  removeAttribute(key) {
    delete this.attributes[key];
    return this;
  }

  removeLabelAttribute(key) {
    delete this.labelAttributes[key];
    return this;
  }

  getAttributes() {
    return this.attributes;
  }

  getLabelAttributes() {
    return this.labelAttributes;
  }

  clearAttributes() {
    this.attributes = {};
    return this;
  }

  clearLabelAttributes() {
    this.labelAttributes = {};
    return this;
  }

  setValue(value) {
    this.setAttribute('value', value);
    return this;
  }

  getValue(defaultValue = null) {
    return this.getAttribute('value', defaultValue);
  }

  /**
   * ZF-ish options container (not attributes)
   */
  setOption(key, value) {
    this.options[key] = value;
    return this;
  }

  setOptions(options) {
    if (!VarUtil.isObject(options)) {
      return this;
    }
    for (const key in options) {
      if (!Object.prototype.hasOwnProperty.call(options, key)) continue;
      this.setOption(key, options[key]);
    }
    return this;
  }

  getOption(key, defaultValue = null) {
    if (!Object.prototype.hasOwnProperty.call(this.options, key)) {
      return defaultValue;
    }
    return this.options[key];
  }

  getOptions() {
    return this.options;
  }

  setMessages(messages) {
    this.messages = Array.isArray(messages) ? messages : [];
    return this;
  }

  getMessages() {
    return this.messages;
  }

}

module.exports = Element;