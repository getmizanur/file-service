const VarUtil = require('../util/var-util');
const express = require('express');

class Application {

  constructor(config = {}, serviceManager = null) {
    this.app = express();

    this.config = config;
    this.serviceManager = serviceManager;

    this._bootstrap = null;

    this.routeMatch = null;
    this.request = null;
    this.response = null;
  }

  bootstrap(resource = null) {
    if(this._bootstrap == null) {
      const Bootstrap = require(global.applicationPath('/application/bootstrap'));
      this._bootstrap = new Bootstrap(this.app, this.serviceManager);
    }

    let resources = this._bootstrap.getClassResources(this._bootstrap)
      .filter((item) => item.match(/^init/g));
    for(const resourceName of resources) {
      this._bootstrap._executeResources(resourceName);
    }

    return this;
  }

  getConfig() {
    if(VarUtil.empty(this.config)) {
      this.config = require('../../application/config/application.config');
      return this.config;
    }

    return this.config;
  }

  getServiceManager() {
    return this.serviceManager;
  }

  getBootstrap() {
    return this._bootstrap;
  }

  run() {
    this.getBootstrap().run();
  }

  /**
   * Get the RouteMatch instance containing matched route information
   * @returns {RouteMatch|null} RouteMatch instance or null if not set
   */
  getRouteMatch() {
    return this.routeMatch;
  }

  /**
   * Set the RouteMatch instance
   * @param {RouteMatch} routeMatch - RouteMatch instance
   * @returns {Application} For method chaining
   */
  setRouteMatch(routeMatch) {
    this.routeMatch = routeMatch;
    return this;
  }

  /**
   * Get the Request instance
   * @returns {Request|null} Request instance or null if not set
   */
  getRequest() {
    return this.request;
  }

  /**
   * Set the Request instance
   * @param {Request} request - Request instance
   * @returns {Application} For method chaining
   */
  setRequest(request) {
    this.request = request;
    return this;
  }

  /**
   * Get the Response instance
   * @returns {Response|null} Response instance or null if not set
   */
  getResponse() {
    return this.response;
  }

  /**
   * Set the Response instance
   * @param {Response} response - Response instance
   * @returns {Application} For method chaining
   */
  setResponse(response) {
    this.response = response;
    return this;
  }

}

module.exports = Application;