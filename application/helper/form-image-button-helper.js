// application/helper/form-image-button-helper.js
const FormXhtml = require(globalThis.applicationPath('/library/mvc/view/helper/form-xhtml'));

/**
 * Renders a FormImageButton element as a <button> with inner HTML content.
 *
 * Extends FormXhtml — inherits the full open/close tag rendering.
 * Registered as 'formImageButton' in the view helper config, so templates use:
 *
 *   {{ formImageButton(searchForm.get('search-clear')) | safe }}
 */
class FormImageButtonHelper extends FormXhtml {
}

module.exports = FormImageButtonHelper;
