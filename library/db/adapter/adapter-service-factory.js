// library/db/adapter/adapter-service-factory.js
class AdapterServiceFactory {
  createService(sm) {
    const config = sm.get('Config') || {};
    const db = config.database || {};

    if (!db || db.enabled === false) {
      throw new Error('Database is disabled (config.database.enabled=false)');
    }

    // Support either:
    // A) config.database.adapter + config.database.connection
    // B) config.database.adapters.DbAdapter
    const spec =
      (db.adapters && (db.adapters.DbAdapter || db.adapters.dbAdapter)) ||
      { adapter: db.adapter, connection: db.connection };

    if (!spec || !spec.adapter || !spec.connection) {
      throw new Error('Missing database configuration for DbAdapter');
    }

    const adapterName = (spec.adapter || 'postgresql').toLowerCase();

    // Map names to your adapter implementations
    const fileMap = {
      postgresql: 'postgre-sql-adapter',
      postgres: 'postgre-sql-adapter',
      mysql: 'mysql-adapter',
      sqlserver: 'sql-server-adapter',
      mssql: 'sql-server-adapter',
      sqlite: 'sqlite-adapter',
    };

    const file = fileMap[adapterName] || `${adapterName}-adapter`;
    const AdapterClass = require(global.applicationPath(`/library/db/adapter/${file}`));

    // IMPORTANT: This should be synchronous construction.
    // If your adapter requires async connect(), do it lazily inside adapter.query()
    // OR keep request-level init. (ZF2 adapter is sync.)
    return new AdapterClass(spec.connection);
  }
}

module.exports = AdapterServiceFactory;