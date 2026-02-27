// library/mvc/mvc-event.js
/**
 * MvcEvent - per-request event/context container (ZF2-inspired).
 * Holds request-scoped state: request, response, routeMatch, result, error, etc.
 */
class MvcEvent {
  constructor() {
    this.request = null;
    this.response = null;
    this.routeMatch = null;

    this.viewModel = null;
    this.result = null;

    this.error = null;
    this.exception = null;

    this.params = Object.create(null);

    this.serviceManager = null;
  }

  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    return this;
  }

  getServiceManager() {
    return this.serviceManager;
  }

  setRequest(request) {
    this.request = request;
    return this;
  }

  getRequest() {
    return this.request;
  }

  setResponse(response) {
    this.response = response;
    return this;
  }

  getResponse() {
    return this.response;
  }

  setRouteMatch(routeMatch) {
    this.routeMatch = routeMatch;
    return this;
  }

  getRouteMatch() {
    return this.routeMatch;
  }

  setViewModel(viewModel) {
    this.viewModel = viewModel;
    return this;
  }

  getViewModel() {
    return this.viewModel;
  }

  setResult(result) {
    this.result = result;
    return this;
  }

  getResult() {
    return this.result;
  }

  setError(error) {
    this.error = error;
    return this;
  }

  getError() {
    return this.error;
  }

  setException(exception) {
    this.exception = exception;
    return this;
  }

  getException() {
    return this.exception;
  }

  setParam(name, value) {
    this.params[name] = value;
    return this;
  }

  getParam(name, defaultValue = null) {
    return Object.prototype.hasOwnProperty.call(this.params, name)
      ? this.params[name]
      : defaultValue;
  }

  getParams() {
    return this.params;
  }
}

module.exports = MvcEvent;
