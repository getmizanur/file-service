// library/event-manager/event-manager.js
/**
 * EventManager - minimal priority-based event manager (ZF2-inspired).
 * Listeners are called in descending priority.
 *
 * Listener signature: (event) => any
 * If a listener returns a non-undefined value, trigger() will store it and
 * continue (ZF2 style). Callers can decide how to interpret results.
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
      try {
        const out = listener(event);
        if (out !== undefined) results.push(out);
      } catch (err) {
        // If a listener throws during non-error event, surface via event and continue
        try {
          if (event && typeof event.setException === 'function') event.setException(err);
          if (event && typeof event.setError === 'function') event.setError(err);
        } catch (_) {}
        results.push(err);
      }
    }
    return results;
  }
}

module.exports = EventManager;
