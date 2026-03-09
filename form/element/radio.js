// library/form/element/radio.js
const Element = require('../element');

class Radio extends Element {

  valueOptions = {};
  labelOptions = {};
  LABEL_APPEND = 'append';
  LABEL_PREPEND = 'prepend';
  labelPosition = null;

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }

    this.setAttribute('type', 'radio');
  }

  setValueOptions(options) {
    if (options && typeof options === 'object') {
      this.valueOptions = options;
    }
    return this;
  }

  getValueOptions() {
    return this.valueOptions;
  }

  setLabelOptions(options) {
    if (options && typeof options === 'object') {
      this.labelOptions = options;
    }
    return this;
  }

  getLabelOptions() {
    return this.labelOptions;
  }

  setLabelPosition(labelPosition) {
    if ([this.LABEL_APPEND, this.LABEL_PREPEND].includes(labelPosition)) {
      this.labelPosition = labelPosition; // ✅ fixed typo
    }
    return this;
  }

  getLabelPosition() {
    return this.labelPosition;
  }

}

module.exports = Radio;