// library/mvc/mvc-event.js
/**
 * MvcEvent - per-request event/context container.
 * Holds request-scoped state: request, response, routeMatch, result, error, etc.
 */
class MvcEvent {
  request = null;
  response = null;
  routeMatch = null;

  viewModel = null;
  result = null;

  error = null;
  exception = null;

  params = Object.create(null);

  serviceManager = null;

  dispatched = false;

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

  setDispatched(flag = true) {
    this.dispatched = !!flag;
    return this;
  }

  isDispatched() {
    return this.dispatched;
  }

  setParam(name, value) {
    this.params[name] = value;
    return this;
  }

  getParam(name, defaultValue = null) {
    return Object.hasOwn(this.params, name)
      ? this.params[name]
      : defaultValue;
  }

  getParams() {
    return this.params;
  }
}

module.exports = MvcEvent;
