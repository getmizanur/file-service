// Load environment variables from .env (project root)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});

const path = require('path');
const ServiceManager = require('../library/mvc/service/service-manager');

// Safer global resolver
global.applicationPath = function (filePath) {
  return path.join(__dirname, '..', filePath);
};

try {
  // Load application configuration
  const config = require('../application/config/application.config');

  // Create Service Manager
  const sm = new ServiceManager(config);

  // Bootstrap + run application
  const app = sm
    .get('Application')
    .bootstrap()
    .run();

  module.exports = app;

} catch (error) {
  console.error('Application failed to start:', error);
  process.exit(1);
}