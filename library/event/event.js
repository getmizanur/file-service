// library/event/event.js

class Event {
  constructor(name, params = {}) {
    this.name = name;
    this.params = params;
    this.propagationStopped = false;
  }

  getName() {
    return this.name;
  }

  getParam(name, defaultValue = null) {
    return Object.prototype.hasOwnProperty.call(this.params, name)
      ? this.params[name]
      : defaultValue;
  }

  getParams() {
    return this.params;
  }

  stopPropagation(flag = true) {
    this.propagationStopped = !!flag;
    return this;
  }

  isPropagationStopped() {
    return this.propagationStopped;
  }
}

module.exports = Event;