// library/form/element/submit.js
const Element = require('../element');
const StrUtil = require('../../util/string-util');

class Submit extends Element {

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);

      // Optional convenience: default label/value
      if (this.getValue() === null) {
        this.setValue(StrUtil.ucfirst(name));
      }
    }

    this.setAttribute('type', 'submit');
  }

}

module.exports = Submit;
