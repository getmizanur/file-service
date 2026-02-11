const path = require('path');

class ViewManager {
  constructor(config = {}) {
    this.config = {
      display_not_found_reason: config.display_not_found_reason || false,
      display_exceptions: config.display_exceptions || false,
      doctype: config.doctype || "HTML5",
      not_found_template: config.not_found_template || "error/404",
      exception_template: config.exception_template || "error/500",
      template_map: config.template_map || {},
      template_path_stack: config.template_path_stack || []
    };
  }

  /**
   * Get the template path for 404 errors
   * @returns {string} Template path
   */
  getNotFoundTemplate() {
    return this.config.not_found_template;
  }

  /**
   * Get the template path for server errors (500)
   * @returns {string} Template path
   */
  getExceptionTemplate() {
    return this.config.exception_template;
  }

  /**
   * Check if not found reasons should be displayed
   * @returns {boolean}
   */
  shouldDisplayNotFoundReason() {
    return this.config.display_not_found_reason;
  }

  /**
   * Check if exception details should be displayed
   * @returns {boolean}
   */
  shouldDisplayExceptions() {
    return this.config.display_exceptions;
  }

  /**
   * Get the doctype setting
   * @returns {string}
   */
  getDoctype() {
    return this.config.doctype;
  }

  /**
   * Resolve template path using template map or default resolution
   * @param {string} template - Template identifier
   * @returns {string} Resolved template path
   */
  resolveTemplate(template) {
    // Check if template is in the map
    if(this.config.template_map && this.config.template_map[template]) {
      return this.config.template_map[template];
    }

    // Default resolution - add .njk extension if not present
    if(!template.endsWith('.njk')) {
      template += '.njk';
    }

    return template;
  }

  /**
   * Get template path stack
   * @returns {array} Array of template paths
   */
  getTemplatePathStack() {
    return this.config.template_path_stack;
  }

  /**
   * Create error view model with configuration-driven settings
   * @param {number} statusCode - HTTP status code (404, 500, etc.)
   * @param {string} message - Error message
   * @param {Error} error - Optional error object for debugging
   * @returns {Object} View model configuration
   */
  createErrorViewModel(statusCode, message, error = null) {
    let template;
    let title;
    let defaultMessage;

    switch(statusCode) {
      case 404:
        template = this.getNotFoundTemplate();
        title = 'Page Not Found';
        defaultMessage = 'The page you are looking for could not be found.';
        break;
      case 500:
        template = this.getExceptionTemplate();
        title = 'Internal Server Error';
        defaultMessage = 'Something went wrong on our end. Please try again later.';
        break;
      default:
        template = this.getExceptionTemplate();
        title = 'Error';
        defaultMessage = 'An error occurred while processing your request.';
    }

    const viewModel = {
      template: this.resolveTemplate(template),
      variables: {
        pageTitle: title,
        errorMessage: message || defaultMessage,
        errorCode: statusCode,
        _status: statusCode
      }
    };

    // Add error details in development mode if configured
    if(error && this.shouldDisplayExceptions()) {
      viewModel.variables.errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    // Add debug information if configured
    if(statusCode === 404 && this.shouldDisplayNotFoundReason()) {
      viewModel.variables.debugInfo = {
        requestUrl: error?.requestUrl || 'Unknown',
        timestamp: new Date().toISOString()
      };
    }

    return viewModel;
  }
}

module.exports = ViewManager;