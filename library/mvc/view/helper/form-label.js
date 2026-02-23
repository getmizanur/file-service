// library/mvc/view/helper/form-label.js
const Element = require('../../../form/element');
const AbstractHelper = require('./abstract-helper');

class FormLabel extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [elementOrAttribs, labelContent = null] = cleanArgs;

    return this.withContext(context, () => {
      let isRequired = false;

      if (elementOrAttribs instanceof Element) {
        if (elementOrAttribs.getAttribute && elementOrAttribs.getAttribute('required')) {
          isRequired = true;
        }
      } else if (elementOrAttribs && typeof elementOrAttribs === 'object' && elementOrAttribs.required) {
        isRequired = true;
      }

      const asterisk = isRequired
        ? ' <span class="dp-required-asterisk" aria-hidden="true">*</span>'
        : '';

      if (elementOrAttribs instanceof Element) {
        const labelText = (labelContent !== null && labelContent !== undefined)
          ? labelContent
          : (elementOrAttribs.getLabel ? elementOrAttribs.getLabel() : '');

        return (
          this.openTag(elementOrAttribs) +
          this._escapeHtml(labelText) +
          asterisk +
          this.closeTag()
        );
      }

      // elementOrAttribs is attributes object (or null)
      const safeLabelText = (labelContent !== null && labelContent !== undefined) ? labelContent : '';
      return this.openTag(elementOrAttribs) + this._escapeHtml(safeLabelText) + asterisk + this.closeTag();
    });
  }

  openTag(elementOrAttribs = null) {
    // Default
    if (elementOrAttribs == null) {
      return '<label>';
    }

    // Element: use label attributes + for=id
    if (elementOrAttribs instanceof Element) {
      const labelAttributes = (elementOrAttribs.getLabelAttributes && elementOrAttribs.getLabelAttributes()) || {};
      const id = elementOrAttribs.getAttribute ? elementOrAttribs.getAttribute('id') : undefined;

      let label = '<label ';

      if (labelAttributes && typeof labelAttributes === 'object') {
        for (const key in labelAttributes) {
          if (!Object.prototype.hasOwnProperty.call(labelAttributes, key)) continue;

          const val = labelAttributes[key];
          if (val === null || val === undefined || val === false) continue;

          if (val === true) {
            label += `${key} `;
            continue;
          }

          label += `${key}="${this._escapeAttr(val)}" `;
        }
      }

      if (id !== undefined && id !== null && id !== '') {
        label += `for="${this._escapeAttr(id)}" `;
      }

      label += '>';
      return label;
    }

    // Attributes object
    if (typeof elementOrAttribs !== 'object' || Array.isArray(elementOrAttribs)) {
      throw new Error('Expect an Element or an attributes object');
    }

    let label = '<label ';

    for (const key in elementOrAttribs) {
      if (!Object.prototype.hasOwnProperty.call(elementOrAttribs, key)) continue;

      const val = elementOrAttribs[key];
      if (val === null || val === undefined || val === false) continue;

      if (val === true) {
        label += `${key} `;
        continue;
      }

      label += `${key}="${this._escapeAttr(val)}" `;
    }

    const forAttrib = elementOrAttribs.id;
    if (forAttrib !== undefined && forAttrib !== null && forAttrib !== '') {
      label += `for="${this._escapeAttr(forAttrib)}" `;
    }

    label += '>';
    return label;
  }

  closeTag() {
    return '</label>';
  }
}

module.exports = FormLabel;