// Load environment variables from .env file
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});

const ServiceManager = require('../library/mvc/service/service-manager');
const path = require('path');

global.applicationPath = function(filePath) {
  return path.resolve(__dirname) + '/..' + filePath;
}

const sm = new ServiceManager(
  require('../application/config/application.config')
)
const app = sm.get('Application')
  .bootstrap()
  .run();

module.exports = app;