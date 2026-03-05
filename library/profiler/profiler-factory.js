// library/profiler/profiler-factory.js
const Profiler = require('./profiler');

module.exports = class ProfilerFactory {
  createService(serviceManager) {
    const profiler = new Profiler();
    const enabled = process.env.PROFILER_ENABLED === 'true';
    profiler.setEnabled(enabled);

    if (enabled) {
      try {
        const dbAdapter = serviceManager.get('DbAdapter');
        profiler.instrumentDbAdapter(dbAdapter);
      } catch (e) {
        console.warn('[Profiler] Could not instrument DbAdapter:', e.message);
      }
    }

    return profiler;
  }
};
