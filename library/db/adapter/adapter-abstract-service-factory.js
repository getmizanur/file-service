class AdapterAbstractServiceFactory {
  canCreate(sm, requestedName) {
    const config = sm.get('Config') || {};
    const db = config.database || {};
    const adapters = db.adapters || {};

    // If you want only DbAdapter:
    // return requestedName === 'DbAdapter' && !!adapters.DbAdapter;

    // Or: allow multiple adapters configured under database.adapters
    return !!adapters[requestedName];
  }

  createService(sm, requestedName) {
    const config = sm.get('Config') || {};
    const db = config.database || {};
    const spec = (db.adapters || {})[requestedName];

    if (!spec || !spec.adapter || !spec.connection) {
      throw new Error(`Missing database.adapters.${requestedName} configuration`);
    }

    const adapterName = (spec.adapter || 'postgresql').toLowerCase();
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

    return new AdapterClass(spec.connection);
  }
}

module.exports = AdapterAbstractServiceFactory;