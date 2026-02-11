const Element = require('../element');

class Radio extends Element {

  constructor(name = null) {
    super();

    this.valueOptions = {};
    this.labelOptions = {};

    this.LABEL_APPEND = 'append';
    this.LABEL_PREPEND = 'prepend';

    this.labelPosition = null;

    this.setName(name);
    this.setAttribute('type', 'radio');
  }

  setValueOptions(options) {
    this.valueOptions = options;

    return this;
  }

  getValueOptions() {
    return this.valueOptions;
  }

  setLabelOptions(options) {
    this.labelOptions = options;

    return this;
  }

  getLabelOptions() {
    return this.labelOptions;
  }

  setLabelPosition(labelPosition) {
    if([this.LABEL_APPEND, this.LABEL_PREPEND].includes(labelPosition)) {
      this.labelPostion = labelPosition;
    }

    return this;
  }

  getLabelPosition() {
    return this.labelPosition;
  }

}

module.exports = Radio;