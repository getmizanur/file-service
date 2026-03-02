// library/form/element/button.js
const Element = require('../element');
const StrUtil = require('../../util/string-util');

class Button extends Element {

  constructor(name = null) {
    super();

    this.setAttribute('type', 'button');

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
      this.setValue(StrUtil.ucfirst(name));
    }
  }

}

module.exports = Button;