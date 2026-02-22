class ViewManager {
  constructor(config = {}) {
    this.config = {
      display_not_found_reason: config.display_not_found_reason || false,
      display_exceptions: config.display_exceptions || false,
      doctype: config.doctype || "HTML5",
      not_found_template: config.not_found_template || "error/404",
      exception_template: config.exception_template || "error/500",
      template_map: config.template_map || {},
      template_path_stack: Array.isArray(config.template_path_stack) ? config.template_path_stack : []
    };
  }

  getNotFoundTemplate() {
    return this.config.not_found_template;
  }

  getExceptionTemplate() {
    return this.config.exception_template;
  }

  shouldDisplayNotFoundReason() {
    return !!this.config.display_not_found_reason;
  }

  shouldDisplayExceptions() {
    return !!this.config.display_exceptions;
  }

  getDoctype() {
    return this.config.doctype;
  }

  /**
   * Resolve template path using template_map or default resolution
   * - If template exists in template_map => return mapped value
   * - If template already has an extension => return as-is
   * - Otherwise => append ".njk"
   */
  resolveTemplate(template) {
    if (!template) {
      return 'error/500.njk';
    }

    const map = this.config.template_map || {};
    if (Object.prototype.hasOwnProperty.call(map, template)) {
      return map[template];
    }

    // If it already ends with ".something", don't force ".njk"
    if (/\.[a-zA-Z0-9]+$/.test(template)) {
      return template;
    }

    return template.endsWith('.njk') ? template : `${template}.njk`;
  }

  getTemplatePathStack() {
    return this.config.template_path_stack;
  }

  /**
   * Convenience accessor for Nunjucks environment setup
   */
  getNunjucksPaths() {
    return this.getTemplatePathStack();
  }

  /**
   * Create error view model with configuration-driven settings
   */
  createErrorViewModel(statusCode, message, error = null) {
    let template;
    let title;
    let defaultMessage;

    switch (statusCode) {
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
        break;
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

    // Add error details if configured
    if (error && this.shouldDisplayExceptions()) {
      viewModel.variables.errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    // Add debug info if configured
    if (statusCode === 404 && this.shouldDisplayNotFoundReason()) {
      viewModel.variables.debugInfo = {
        requestUrl: (error && error.requestUrl) ? error.requestUrl : 'Unknown',
        timestamp: new Date().toISOString()
      };
    }

    return viewModel;
  }
}

module.exports = ViewManager;