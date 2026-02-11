const VarUtil = require(
  global.applicationPath('/library/util/var-util'));

class Element {

  constructor() {
    this.attributes = {};
    this.labelAttributes = {};
    this.messages = [];

    this.label = null;
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

  setAttributes(attribs) {
    if(!VarUtil.isObject(attribs)) {
      return;
    }

    for(var key in attribs) {
      this.setAttribute(key, attribs[key]);
    }

    return this;
  }

  getAttribute(key) {
    return this.attributes[key];
  }

  setLabelAttribute(key, value) {
    this.labelAttributes[key] = value;

    return this;
  }

  setLabelAttributes(attribs) {
    if(!VarUtil.isObject(attribs)) {
      return;
    }

    for(var key in attribs) {
      this.setLabelAttribute(key, attribs[key]);
    }

    return this;
  }

  getLabelAttribute(key) {
    return this.labelAttributes[key];
  }

  setName(name) {
    this.setAttribute('name', name);

    return this;
  }

  getName() {
    return this.getAttribute('name');
  }

  removeAttribute(key) {
    delete this.attributes[key]

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

  getValue() {
    return this.getAttribute('value');
  }

  setMessages(messages) {
    this.messages = messages;

    return this;
  }

  getMessages() {
    return this.messages;
  }

}

module.exports = Element