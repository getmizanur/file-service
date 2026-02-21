/**
 * SQL Server Database Adapter
 *
 * Provides SQL Server-specific implementation of the DatabaseAdapter interface.
 * Includes SQL Server-specific features like OUTPUT clause, TOP clause,
 * and connection pooling with proper SQL Server syntax.
 *
 * Dependencies:
 * - npm install mssql
 */

const DatabaseAdapter = require('./database-adapter');
const sql = require('mssql');

class SqlServerAdapter extends DatabaseAdapter {
  /**
   * Initialize SQL Server adapter
   * @param {Object} config Database configuration
   */
  constructor(config = {}) {
    // IMPORTANT: pass config to base adapter so getConnectionInfo() works
    super(config);

    this.config = {
      server: config.server || 'localhost',
      port: config.port || 1433,
      database: config.database,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.options?.encrypt !== false, // default true
        trustServerCertificate: config.options?.trustServerCertificate || false,
        enableArithAbort: true
      },
      pool: {
        max: config.pool?.max || 10,
        min: config.pool?.min || 0,
        idleTimeoutMillis: config.pool?.idleTimeoutMillis || 30000,
        acquireTimeoutMillis: config.pool?.acquireTimeoutMillis || 60000,
        createTimeoutMillis: config.pool?.createTimeoutMillis || 30000,
        destroyTimeoutMillis: config.pool?.destroyTimeoutMillis || 5000,
        reapIntervalMillis: config.pool?.reapIntervalMillis || 1000
      },
      requestTimeout: config.requestTimeout || 30000,
      connectionTimeout: config.connectionTimeout || 30000
    };

    this.pool = null;
    this.connected = false;
    this.connection = null; // keep base heuristic in sync
  }

  /**
   * Connect to SQL Server database (idempotent + defensive)
   */
  async connect() {
    try {
      // Fast path
      if (this.pool && this.connected && this.pool.connected) {
        this.connection = this.pool;
        return;
      }

      // Recreate pool if it exists but is in a bad state
      if (this.pool && (this.pool.connecting || this.pool.connected)) {
        // If connecting, wait a bit by awaiting connect() (mssql handles it)
        if (!this.pool.connected) {
          await this.pool.connect();
        }
      } else {
        // Create a new pool
        this.pool = new sql.ConnectionPool(this.config);
        await this.pool.connect();
      }

      this.connected = true;
      this.connection = this.pool;

      console.log('SQL Server connection pool established');
    } catch (error) {
      // cleanup to avoid half-open state
      try {
        if (this.pool) {
          await this.pool.close();
        }
      } catch (_) {
        // ignore cleanup errors
      }

      this.pool = null;
      this.connected = false;
      this.connection = null;
      this._markDisconnected?.();

      throw new Error(`SQL Server connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.close();
      }

      this.pool = null;
      this.connected = false;
      this.connection = null;

      this._markDisconnected?.();

      console.log('SQL Server connection pool closed');
    } catch (error) {
      throw new Error(`SQL Server disconnection failed: ${error.message}`);
    }
  }

  /**
   * Replace placeholders with SQL Server @paramN style.
   *
   * Supports:
   * - '?' placeholders (MySQL style)
   * - '$1, $2, ...' placeholders (PostgreSQL builder style)
   *
   * Returns:
   * - processedSql
   * - paramOrder: array of param indexes in the order they appear in SQL
   *   (so we can bind the right values)
   */
  _processPlaceholders(sqlQuery) {
    // If query contains $n placeholders, prefer that mode.
    // Builders like Select/Update/Delete emit $1..$n.
    const hasDollarParams = /\$\d+/.test(sqlQuery);

    if (hasDollarParams) {
      // Map each $n -> @param(n-1)
      // Also build param order: [$1,$2,...] in appearance order
      const paramOrder = [];
      const processedSql = sqlQuery.replace(/\$(\d+)/g, (_, nStr) => {
        const n = parseInt(nStr, 10);
        if (!Number.isFinite(n) || n <= 0) return _;
        paramOrder.push(n - 1); // zero-based into params[]
        return `@param${n - 1}`;
      });

      return { processedSql, paramOrder, mode: '$' };
    }

    // Fallback: '?' placeholders
    let idx = 0;
    const paramOrder = [];
    const processedSql = sqlQuery.replace(/\?/g, () => {
      paramOrder.push(idx);
      return `@param${idx++}`;
    });

    return { processedSql, paramOrder, mode: '?' };
  }

  /**
   * Bind inputs to a request, honoring param order.
   */
  _bindParams(request, params, paramOrder, mode) {
    if (!Array.isArray(params) || params.length === 0) return;

    if (mode === '$') {
      // We still bind all params by index since SQL refers to @param0..@paramN.
      // This is safe even if query doesn't use every param.
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      return;
    }

    // mode '?': paramOrder is sequential anyway, but keep it explicit
    // Also bind by index, because SQL refers to @param0.. etc.
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
  }

  /**
   * Execute raw SQL query
   * @param {string} sqlQuery SQL query
   * @param {Array} params Query parameters
   * @returns {Promise<{rows:any[], rowCount:number, insertedId:any}>}
   */
  async query(sqlQuery, params = []) {
    await this.ensureConnected();

    try {
      const request = this.pool.request();

      const { processedSql, paramOrder, mode } = this._processPlaceholders(sqlQuery);
      this._bindParams(request, params, paramOrder, mode);

      const result = await request.query(processedSql);

      return {
        rows: result.recordset || [],
        rowCount: Array.isArray(result.rowsAffected) ? (result.rowsAffected[0] || 0) : 0,
        insertedId: this.extractInsertedId(result)
      };
    } catch (error) {
      throw new Error(`SQL Server query failed: ${error.message}\nSQL: ${sqlQuery}`);
    }
  }

  /**
   * Extract inserted ID from SQL Server result if present.
   * (Typically present when you OUTPUT something like InsertedId.)
   */
  extractInsertedId(result) {
    if (result?.recordset && result.recordset.length > 0) {
      const row = result.recordset[0];
      // prefer InsertedId (your previous convention)
      if (row.InsertedId !== undefined) return row.InsertedId;

      // otherwise try common identity keys
      const keys = ['id', 'Id', 'ID'];
      for (const k of keys) {
        if (row[k] !== undefined) return row[k];
      }
    }
    return null;
  }

  /**
   * Insert record with SQL Server OUTPUT clause
   */
  async insert(table, data) {
    await this.ensureConnected();

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `@param${index}`).join(', ');

    const sqlQuery = `
      INSERT INTO [${table}] ([${columns.join('], [')}])
      OUTPUT INSERTED.*
      VALUES (${placeholders})
    `;

    const result = await this.query(sqlQuery, values);

    const insertedRecord = result.rows[0] || {};
    return {
      insertedId: this.extractIdentityValue(insertedRecord),
      insertedRecord,
      affectedRows: result.rowCount,
      success: result.rowCount > 0
    };
  }

  /**
   * Extract identity value from inserted record
   */
  extractIdentityValue(record) {
    const identityKeys = ['id', 'Id', 'ID', 'identity', 'Identity'];
    for (const key of identityKeys) {
      if (record[key] !== undefined) return record[key];
    }

    const firstNumericValue = Object.values(record).find(
      value => typeof value === 'number' && Number.isInteger(value)
    );

    return firstNumericValue || null;
  }

  /**
   * Insert multiple records with batch optimization
   */
  async insertBatch(table, dataArray) {
    await this.ensureConnected();

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('Data array must be non-empty array');
    }

    const columns = Object.keys(dataArray[0]);

    const valuesClauses = dataArray
      .map((_, rowIndex) => {
        const rowPlaceholders = columns
          .map((_, colIndex) => `@param${rowIndex}_${colIndex}`)
          .join(', ');
        return `(${rowPlaceholders})`;
      })
      .join(', ');

    const sqlQuery = `
      INSERT INTO [${table}] ([${columns.join('], [')}])
      VALUES ${valuesClauses}
    `;

    // Flatten values
    const flatValues = [];
    dataArray.forEach(row => {
      columns.forEach(col => flatValues.push(row[col]));
    });

    // Rewrite @param{row}_{col} to sequential @paramN
    let rewrittenSql = sqlQuery;
    let seq = 0;
    rewrittenSql = rewrittenSql.replace(/@param\d+_\d+/g, () => `@param${seq++}`);

    const result = await this.query(rewrittenSql, flatValues);

    return {
      insertedCount: result.rowCount,
      success: result.rowCount > 0
    };
  }

  /**
   * Update records with OUTPUT clause support
   */
  async update(table, data, whereClause, whereParams = [], returnUpdated = false) {
    await this.ensureConnected();

    const setPairs = Object.keys(data).map((key, index) => `[${key}] = @param${index}`);
    const values = Object.values(data);

    let sqlQuery = `UPDATE [${table}] SET ${setPairs.join(', ')}`;

    if (returnUpdated) sqlQuery += ` OUTPUT INSERTED.*`;

    if (whereClause) {
      const whereParamIndices = whereParams.map((_, index) => `@param${values.length + index}`);
      const adjustedWhereClause = whereClause.replace(/\?/g, () => whereParamIndices.shift());
      sqlQuery += ` WHERE ${adjustedWhereClause}`;
      values.push(...whereParams);
    }

    const result = await this.query(sqlQuery, values);

    return {
      affectedRows: result.rowCount,
      updatedRecords: returnUpdated ? result.rows : null,
      success: result.rowCount > 0
    };
  }

  /**
   * Delete records with OUTPUT clause support
   */
  async delete(table, whereClause, whereParams = [], returnDeleted = false) {
    await this.ensureConnected();

    let sqlQuery = `DELETE FROM [${table}]`;
    if (returnDeleted) sqlQuery += ` OUTPUT DELETED.*`;

    if (whereClause) sqlQuery += ` WHERE ${whereClause}`;

    const result = await this.query(sqlQuery, whereParams);

    return {
      affectedRows: result.rowCount,
      deletedRecords: returnDeleted ? result.rows : null,
      success: result.rowCount > 0
    };
  }

  /**
   * Execute transaction
   * callback receives: { query(sql, params) }
   */
  async transaction(callback) {
    await this.ensureConnected();

    const transaction = new sql.Transaction(this.pool);

    await transaction.begin();

    try {
      const transactionAdapter = {
        query: async (sqlQuery, params = []) => {
          const request = transaction.request();

          const { processedSql, paramOrder, mode } = this._processPlaceholders(sqlQuery);
          this._bindParams(request, params, paramOrder, mode);

          const result = await request.query(processedSql);

          return {
            rows: result.recordset || [],
            rowCount: Array.isArray(result.rowsAffected) ? (result.rowsAffected[0] || 0) : 0,
            insertedId: this.extractInsertedId(result)
          };
        }
      };

      const result = await callback(transactionAdapter);
      await transaction.commit();
      return result;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_) {
        // ignore rollback errors; keep original error
      }
      throw error;
    }
  }

  escape(value) {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }

  quoteIdentifier(identifier) {
    return `[${identifier.replace(/\]/g, ']]')}]`;
  }

  async getTableInfo(tableName) {
    await this.ensureConnected();

    const sqlQuery = `
      SELECT
        c.COLUMN_NAME as column_name,
        c.DATA_TYPE as data_type,
        c.IS_NULLABLE as is_nullable,
        c.COLUMN_DEFAULT as column_default,
        COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') as is_identity
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_NAME = ? AND c.TABLE_SCHEMA = SCHEMA_NAME()
      ORDER BY c.ORDINAL_POSITION
    `;

    const result = await this.query(sqlQuery, [tableName]);

    return {
      tableName,
      columns: result.rows.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        identity: col.is_identity === 1
      }))
    };
  }

  async listTables() {
    await this.ensureConnected();

    const sqlQuery = `
      SELECT TABLE_NAME as table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = SCHEMA_NAME()
      ORDER BY TABLE_NAME
    `;

    const result = await this.query(sqlQuery);
    return result.rows.map(row => row.table_name);
  }

  async getVersion() {
    await this.ensureConnected();

    const result = await this.query('SELECT @@VERSION as version');
    return result.rows[0]?.version;
  }

  async tableExists(tableName) {
    await this.ensureConnected();

    const sqlQuery = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = ? AND TABLE_SCHEMA = SCHEMA_NAME()
    `;

    const result = await this.query(sqlQuery, [tableName]);
    return (result.rows[0]?.count || 0) > 0;
  }

  async getNextIdentity(tableName) {
    await this.ensureConnected();

    const sqlQuery = `SELECT IDENT_CURRENT(?) + IDENT_INCR(?) as next_id`;
    const result = await this.query(sqlQuery, [tableName, tableName]);
    return result.rows[0]?.next_id || 1;
  }

  async selectTop(table, limit, whereClause = '', whereParams = []) {
    await this.ensureConnected();

    let sqlQuery = `SELECT TOP (${limit}) * FROM [${table}]`;
    if (whereClause) sqlQuery += ` WHERE ${whereClause}`;

    const result = await this.query(sqlQuery, whereParams);
    return result.rows;
  }

  async getTableSize(tableName) {
    await this.ensureConnected();

    const sqlQuery = `
      SELECT
        SUM(a.total_pages) * 8 AS TotalSpaceKB,
        SUM(a.used_pages) * 8 AS UsedSpaceKB,
        (SUM(a.total_pages) - SUM(a.used_pages)) * 8 AS UnusedSpaceKB
      FROM sys.tables t
      INNER JOIN sys.indexes i ON t.object_id = i.object_id
      INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
      WHERE t.name = ?
      GROUP BY t.name
    `;

    const result = await this.query(sqlQuery, [tableName]);
    return result.rows[0] || null;
  }

  prepare(sqlText) {
    const SQLServerStatement = require('../statement/sqlServerStatement');
    return new SQLServerStatement(this, sqlText);
  }

  getParameterPlaceholder(index) {
    return `@param${index}`;
  }
}

module.exports = SqlServerAdapter;