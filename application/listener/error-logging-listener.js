// application/listener/error-logging-listener.js
const AbstractListener = require(globalThis.applicationPath('/library/event/abstract-listener'));

/**
 * Logs errors from dispatch.error, render.error and error events
 * to the application error log file (logs/error-YYYY-MM-DD.log).
 *
 * Extracts request context (method, URL, route, IP) from the MvcEvent
 * to provide actionable error traces in production.
 */
class ErrorLoggingListener extends AbstractListener {
  serviceManager = null;

  setServiceManager(sm) { this.serviceManager = sm; }
  getServiceManager() { return this.serviceManager; }

  handle(event) {
    const error = event.getError?.() || event.getException?.();
    if (!error) return;

    const context = this._buildTraceContext(event);

    if (globalThis.logger && typeof globalThis.logger.logError === 'function') {
      globalThis.logger.logError(error, context);
    } else {
      console.error('[ErrorLoggingListener]', error);
    }
  }

  _buildTraceContext(event) {
    const context = {};

    // Generate a trace ID for correlating related log entries
    context.traceId = this._generateTraceId();

    // Request context
    const request = event.getRequest?.();
    if (request) {
      context.method = request.getMethod?.() || undefined;
      context.url = request.getUrl?.() || request.getPath?.() || undefined;

      const expressReq = request.getExpressRequest?.();
      if (expressReq) {
        context.ip = expressReq.ip || expressReq.socket?.remoteAddress || undefined;
      }
    }

    // Route context
    const routeMatch = event.getRouteMatch?.();
    if (routeMatch) {
      const module = routeMatch.getModule?.() || '?';
      const controller = routeMatch.getController?.() || '?';
      const action = routeMatch.getAction?.() || '?';
      context.route = `${module}/${controller}/${action}`;
    }

    return context;
  }

  _generateTraceId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${timestamp}-${random}`;
  }
}

module.exports = ErrorLoggingListener;
