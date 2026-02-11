const AbstractHelper = require('./abstract-helper');

class FormFile extends AbstractHelper {

  render(...args) {
    const cleanArgs = this._extractContext(args);
    const [element] = cleanArgs;

    if(element == undefined) {
      return;
    }

    var input = '<input ';

    var attributes = element.getAttributes();
    for(var key in attributes) {
      input += key + '="' + attributes[key] + '" ';
    }

    input += '/>';

    return input;
  }

}

module.exports = FormFile;