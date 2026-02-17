const AbstractService = require('./abstract-service');

/**
 * Database Service
 *
 * Centralized service for managing database connections
 * Provides database adapter instances to other services
 */
class DatabaseService extends AbstractService {

  constructor() {
    super();
    this.dbAdapter = null;
  }

  /**
   * Initialize and return database adapter
   * @returns {Promise<Object>} Database adapter instance
   */
  async initializeDatabase() {
    if (!this.dbAdapter) {
      const config = this.loadApplicationConfig();

      if (!config.database?.enabled) {
        throw new Error('Database is not enabled in configuration');
      }

      // Load the appropriate database adapter
      const adapterName = config.database.adapter || 'postgresql';
      // Map adapter names to kebab-case filenames
      const adapterFileMap = {
        'postgresql': 'postgre-sql-adapter',
        'mysql': 'mysql-adapter',
        'sqlserver': 'sql-server-adapter',
        'sqlite': 'sqlite-adapter'
      };
      const adapterFile = adapterFileMap[adapterName] || `${adapterName}-adapter`;
      const AdapterClass = require(`../../library/db/adapter/${adapterFile}`);

      this.dbAdapter = new AdapterClass(config.database.connection);

      // Connect to database
      await this.dbAdapter.connect();
    }

    return this.dbAdapter;
  }

  /**
   * Get database adapter (initializes if not already initialized)
   * @returns {Promise<Object>} Database adapter instance
   */
  async getAdapter() {
    return await this.initializeDatabase();
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async closeConnection() {
    if (this.dbAdapter) {
      await this.dbAdapter.disconnect();
      this.dbAdapter = null;
    }
  }
}

module.exports = DatabaseService;
