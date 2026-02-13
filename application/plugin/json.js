const BasePlugin = require(global.applicationPath('/library/mvc/controller/base-plugin'));

class JsonPlugin extends BasePlugin {
  constructor(options = {}) {
    super(options);
    this.statusCode = 200;
  }

  /**
   * Send a JSON response
   * Sets Content-Type and status code on the framework Response,
   * then sends via Express (which sets res.headersSent so the
   * bootstrapper skips view rendering)
   * @param {Object} data - Data to serialize as JSON
   * @param {number} statusCode - HTTP status code (default: 200)
   * @returns {void}
   */
  send(data = {}, statusCode = null) {
    const code = statusCode || this.statusCode;
    const controller = this.getController();
    const response = controller.getResponse();

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHttpResponseCode(code);

    const expressRes = controller.getRequest().getExpressRequest().res;
    expressRes
      .status(code)
      .set('Content-Type', 'application/json; charset=utf-8')
      .json(data);

    // Reset for next use
    this.statusCode = 200;
  }

  /**
   * Set HTTP status code for the response
   * Chainable — call before send()
   * @param {number} code - HTTP status code
   * @returns {Json} This plugin for method chaining
   */
  status(code) {
    this.statusCode = code;
    return this;
  }
}

module.exports = JsonPlugin;
