const Element = require('../../../form/element');
const AbstractHelper = require('./abstract-helper');

class FormLabel extends AbstractHelper {

  render(...args) {
    const cleanArgs = this._extractContext(args);
    const [elementOrAttribs, labelContent = null] = cleanArgs;

    let isRequired = false;
    if (elementOrAttribs instanceof Element) {
      if (elementOrAttribs.getAttribute('required')) {
        isRequired = true;
      }
    } else if (elementOrAttribs && elementOrAttribs.required) {
      isRequired = true;
    }

    const asterisk = isRequired ? ' <span class="dp-required-asterisk" aria-hidden="true">*</span>' : '';

    if (elementOrAttribs instanceof Element) {
      return this.openTag(elementOrAttribs) +
        ((labelContent) ? labelContent : elementOrAttribs.getLabel()) +
        asterisk +
        this.closeTag();
    }
    return this.openTag(elementOrAttribs) + labelContent + asterisk + this.closeTag();
  }

  openTag(elementOrAttribs = null) {
    if (elementOrAttribs == null) {
      return '<label>';
    }

    if (elementOrAttribs instanceof Element) {
      let labelAttributes = elementOrAttribs.getLabelAttributes();
      if (labelAttributes.length < 0) {
        return '<label>';
      }

      let label = '<label ';
      for (let key in labelAttributes) {
        label += key + '="' + labelAttributes[key] + '" ';
      }
      let forAttrib = elementOrAttribs.getAttribute('id');
      label += ((forAttrib == undefined) ? '' : 'for="' + forAttrib + '"');
      label += '>';

      return label;
    }

    if (elementOrAttribs.constructor !== Object) {
      throw new Error('Expect an Element or an array');
    }

    let label = '<label ';
    for (let key in elementOrAttribs) {
      label += key + '="' + elementOrAttribs[key] + '" ';
    }
    let forAttrib = elementOrAttribs['id'];
    label += ((forAttrib == undefined) ? '' : 'for="' + forAttrib + '"');
    label += '>'

    return label;
  }

  closeTag() {
    return '</label>';
  }

}

module.exports = FormLabel;