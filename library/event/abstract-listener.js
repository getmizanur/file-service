// library/event/event-manager.js

class AbstractListener {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Must be implemented by subclasses
   *
   * @param {Object} event
   * @returns {any}
   */
  handle(event) {
    throw new Error(
      `${this.constructor.name} must implement handle(event)`
    );
  }

  /**
   * Allows listener to be used as a callable
   * (nice for EventManager.on(...))
   */
  __invoke(event) {
    return this.handle(event);
  }

  /**
   * Optional: async wrapper
   */
  async handleAsync(event) {
    return this.handle(event);
  }

  /**
   * Optional: helper for safe execution
   */
  execute(event) {
    try {
      return this.handle(event);
    } catch (err) {
      this.onError(err, event);
      throw err;
    }
  }

  /**
   * Optional override hook
   */
  onError(error, event) {
    // default no-op (override if needed)
  }
}

module.exports = AbstractListener;