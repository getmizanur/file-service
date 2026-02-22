const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

class ErrorDecoratorHelper extends AbstractHelper {
  /**
   * Returns the error class if the element has error messages
   * @param {Element} element - The form element instance
   * @param {string} errorClass - The class to return if error exists (default: 'dp-input--error')
   * @returns {string}
   */
  render(...args) {
    // Extract Nunjucks context from arguments
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element, errorClass = 'dp-input--error'] = cleanArgs;

    if (!element || typeof element.getMessages !== 'function') {
      return '';
    }
    const messages = element.getMessages();
    if (Array.isArray(messages) && messages.length > 0) {
      return errorClass;
    }
    return '';
  }
}

module.exports = ErrorDecoratorHelper;
