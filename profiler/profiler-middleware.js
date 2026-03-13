// library/profiler/profiler-middleware.js

/**
 * Creates Express middleware that wraps each request in a profiler context.
 * @param {Profiler} profiler
 * @returns {Function} Express middleware
 */
function createProfilerMiddleware(profiler) {
  return function profilerMiddleware(req, res, next) {
    if (!profiler.isEnabled()) {
      return next();
    }

    const routeInfo = {
      method: req.method,
      path: req.originalUrl || req.url,
      module: null,
      controller: null,
      action: null,
      routeName: null
    };

    const store = profiler.createContext(routeInfo);

    // Capture request details for the Request tab
    store.request = {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: { ...req.headers },
      query: { ...req.query },
      body: req.body && typeof req.body === 'object' ? { ...req.body } : req.body || null,
      params: { ...req.params },
      cookies: req.cookies ? { ...req.cookies } : {},
      ip: req.ip || req.connection?.remoteAddress
    };

    // Make profiler available to view helpers via res.locals → template context
    res.locals._profiler = profiler;

    // Print summary when response finishes
    res.on('finish', () => {
      try {
        profiler.runInContext(store, () => {
          // Capture route info set by dispatcher
          if (req.routeName) store.route.routeName = req.routeName;
          profiler.printSummary();
        });
      } catch (e) {
        console.error('[Profiler] Error printing summary:', e.message);
      }
    });

    // Run the rest of the middleware chain within the profiler context
    profiler.runInContext(store, () => next());
  };
}

module.exports = createProfilerMiddleware;
