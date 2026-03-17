// library/event/event-manager.js
/**
 * EventManager - minimal priority-based event manager.
 * Listeners are called in descending priority.
 *
 * Listener signature: (event) => any
 * If a listener returns a non-undefined value, trigger() will store it and
 * continue. Callers can decide how to interpret results.
 */
class EventManager {
  constructor() {
    this.listeners = Object.create(null);
  }

  attach(eventName, listener, priority = 0) {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];
    this.listeners[eventName].push({ listener, priority: Number(priority) || 0 });
    // keep sorted
    this.listeners[eventName].sort((a, b) => b.priority - a.priority);
    return this;
  }

  /**
   * Trigger an event. Returns an array of listener return values (excluding undefined).
   */
  trigger(eventName, event) {
    const list = this.listeners[eventName] || [];
    const results = [];
    for (const { listener } of list) {
      results.push(...this._invokeListener(listener, event));
    }
    return results;
  }

  /**
   * Internal listener executor
   */
  _invokeListener(listener, event) {
    try {
      let out;

      // FUNCTION listener (existing behavior)
      if (typeof listener === 'function') {
        out = listener(event);

      // OBJECT listener (new behavior)
      } else if (listener && typeof listener.handle === 'function') {
        out = listener.handle(event);

      //invalid listener
      } else {
        throw new Error(
          `Invalid listener: must be function or object with handle()`
        );
      }

      return out === undefined ? [] : [out];

    } catch (err) {
      try {
        if (event && typeof event.setException === 'function') {
          event.setException(err);
        }

        if (event && typeof event.setError === 'function') {
          event.setError(err);
        }
      } catch {
        // ignore
      }

      return [err];
    }
  }
}

module.exports = EventManager;
