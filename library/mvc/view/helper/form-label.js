// library/mvc/view/helper/form-label.js
const Element = require('../../../form/element');
const AbstractHelper = require('./abstract-helper');

class FormLabel extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [elementOrAttribs, labelContent = null] = cleanArgs;

    return this.withContext(context, () => {
      const isRequired = this._isRequired(elementOrAttribs);
      const asterisk = isRequired
        ? ' <span class="dp-required-asterisk" aria-hidden="true">*</span>'
        : '';

      const labelText = this._resolveLabelText(elementOrAttribs, labelContent);
      return this.openTag(elementOrAttribs) + this._escapeHtml(labelText) + asterisk + this.closeTag();
    });
  }

  _isRequired(elementOrAttribs) {
    if (elementOrAttribs instanceof Element) {
      return !!(elementOrAttribs.getAttribute && elementOrAttribs.getAttribute('required'));
    }
    return !!(elementOrAttribs && typeof elementOrAttribs === 'object' && elementOrAttribs.required);
  }

  _resolveLabelText(elementOrAttribs, labelContent) {
    if (labelContent !== null && labelContent !== undefined) return labelContent;
    if (elementOrAttribs instanceof Element && elementOrAttribs.getLabel) {
      return elementOrAttribs.getLabel();
    }
    return '';
  }

  openTag(elementOrAttribs = null) {
    if (elementOrAttribs == null) return '<label>';

    if (elementOrAttribs instanceof Element) {
      return this._openTagFromElement(elementOrAttribs);
    }

    if (typeof elementOrAttribs !== 'object' || Array.isArray(elementOrAttribs)) {
      throw new Error('Expect an Element or an attributes object');
    }

    return this._openTagFromAttribs(elementOrAttribs, elementOrAttribs.id);
  }

  _openTagFromElement(element) {
    const labelAttributes = (element.getLabelAttributes && element.getLabelAttributes()) || {};
    const id = element.getAttribute ? element.getAttribute('id') : undefined;
    return this._openTagFromAttribs(labelAttributes, id);
  }

  _openTagFromAttribs(attribs, forId) {
    let label = '<label ';
    label += this._serializeAttributes(attribs);

    if (forId !== undefined && forId !== null && forId !== '') {
      label += `for="${this._escapeAttr(forId)}" `;
    }

    label += '>';
    return label;
  }

  _serializeAttributes(attribs) {
    let result = '';
    if (!attribs || typeof attribs !== 'object') return result;

    for (const key in attribs) {
      if (!Object.prototype.hasOwnProperty.call(attribs, key)) continue;
      const val = attribs[key];
      if (val === null || val === undefined || val === false) continue;
      if (val === true) { result += `${key} `; continue; }
      result += `${key}="${this._escapeAttr(val)}" `;
    }
    return result;
  }

  closeTag() {
    return '</label>';
  }
}

module.exports = FormLabel;