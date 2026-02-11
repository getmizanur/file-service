const AbstractHelper = require('./abstract-helper');

class Form extends AbstractHelper {

  render(...args) {
    const cleanArgs = this._extractContext(args);
    return this;
  }

  openTag(form) {
    var tag = '<form ';

    var attribs = form.getAttribs();
    for(var key in attribs) {
      tag += key + '="' + attribs[key] + '" ';
    }
    tag += '>';

    return tag;
  }

  closeTag() {
    return '</form>';
  }

}

module.exports = Form;
