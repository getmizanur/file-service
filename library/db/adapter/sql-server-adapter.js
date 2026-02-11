/**
 * SQL Server Database Adapter
 * 
 * Provides SQL Server-specific implementation of the DatabaseAdapter interface.
 * Includes SQL Server-specific features like OUTPUT clause, TOP clause,
 * and connection pooling with proper SQL Server syntax.
 * 
 * Dependencies:
 * - npm install mssql
 * 
 * @author Database Query Builder Framework
 */

const DatabaseAdapter = require('./database-adapter');
const sql = require('mssql');

class SqlServerAdapter extends DatabaseAdapter {
  /**
   * Initialize SQL Server adapter
   * @param {Object} config Database configuration
   * @param {string} config.server SQL Server instance
   * @param {number} config.port Port (default: 1433)
   * @param {string} config.database Database name
   * @param {string} config.user Username
   * @param {string} config.password Password
   * @param {Object} config.options Additional options
   * @param {boolean} config.options.encrypt Use encryption (default: true)
   * @param {boolean} config.options.trustServerCertificate Trust server certificate
   * @param {Object} config.pool Pool configuration
   */
  constructor(config) {
    super();
    this.config = {
      server: config.server || 'localhost',
      port: config.port || 1433,
      database: config.database,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.options?.encrypt !== false, // Default to true
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
  }

  /**
   * Connect to SQL Server database
   * Creates connection pool for efficient connection management
   */
  async connect() {
    try {
      this.pool = new sql.ConnectionPool(this.config);
      await this.pool.connect();

      this.connected = true;
      console.log('SQL Server connection pool established');
    } catch (error) {
      throw new Error(`SQL Server connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if(this.pool) {
      await this.pool.close();
      this.pool = null;
      this.connected = false;
      console.log('SQL Server connection pool closed');
    }
  }

  /**
   * Execute raw SQL query
   * @param {string} sqlQuery SQL query
   * @param {Array} params Query parameters
   * @returns {Object} Query result
   */
  async query(sqlQuery, params = []) {
    if(!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const request = this.pool.request();

      // Add parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      // Replace ? placeholders with @param0, @param1, etc.
      let processedSql = sqlQuery;
      let paramIndex = 0;
      processedSql = processedSql.replace(/\?/g, () => `@param${paramIndex++}`);

      const result = await request.query(processedSql);

      return {
        rows: result.recordset || [],
        rowCount: result.rowsAffected?.[0] || 0,
        insertedId: this.extractInsertedId(result)
      };
    } catch (error) {
      throw new Error(`SQL Server query failed: ${error.message}\nSQL: ${sqlQuery}`);
    }
  }

  /**
   * Extract inserted ID from SQL Server result
   * @param {Object} result SQL Server result
   * @returns {number|null} Inserted ID
   */
  extractInsertedId(result) {
    // If OUTPUT clause was used, the ID will be in recordset
    if(result.recordset && result.recordset.length > 0 && result.recordset[0].InsertedId) {
      return result.recordset[0].InsertedId;
    }
    return null;
  }

  /**
   * Insert record with SQL Server OUTPUT clause
   * @param {string} table Table name
   * @param {Object} data Data to insert
   * @returns {Object} Insert result with insertedId
   */
  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `@param${index}`).join(', ');

    // Use OUTPUT clause to get inserted ID
    const sqlQuery = `
            INSERT INTO [${table}] ([${columns.join('], [')}])
            OUTPUT INSERTED.* 
            VALUES (${placeholders})
        `;

    const result = await this.query(sqlQuery, values);

    // Extract the inserted record
    const insertedRecord = result.rows[0] || {};

    return {
      insertedId: this.extractIdentityValue(insertedRecord),
      insertedRecord: insertedRecord,
      affectedRows: result.rowCount,
      success: result.rowCount > 0
    };
  }

  /**
   * Extract identity value from inserted record
   * @param {Object} record Inserted record
   * @returns {number|null} Identity value
   */
  extractIdentityValue(record) {
    // Common identity column names
    const identityKeys = ['id', 'Id', 'ID', 'identity', 'Identity'];
    for(const key of identityKeys) {
      if(record[key] !== undefined) {
        return record[key];
      }
    }

    // Return first numeric value as fallback
    const firstNumericValue = Object.values(record).find(value =>
      typeof value === 'number' && Number.isInteger(value)
    );

    return firstNumericValue || null;
  }

  /**
   * Insert multiple records with batch optimization
   * @param {string} table Table name
   * @param {Array} dataArray Array of objects to insert
   * @returns {Object} Insert result
   */
  async insertBatch(table, dataArray) {
    if(!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('Data array must be non-empty array');
    }

    const columns = Object.keys(dataArray[0]);

    // Build values for each row
    const valuesClauses = dataArray.map((_, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) =>
        `@param${rowIndex}_${colIndex}`
      ).join(', ');
      return `(${rowPlaceholders})`;
    }).join(', ');

    const sqlQuery = `
            INSERT INTO [${table}] ([${columns.join('], [')}])
            VALUES ${valuesClauses}
        `;

    // Flatten parameters with unique names
    const allParams = [];
    dataArray.forEach((row, rowIndex) => {
      columns.forEach((col, colIndex) => {
        allParams.push(row[col]);
      });
    });

    const result = await this.query(sqlQuery, allParams);

    return {
      insertedCount: result.rowCount,
      success: result.rowCount > 0
    };
  }

  /**
   * Update records with OUTPUT clause support
   * @param {string} table Table name
   * @param {Object} data Data to update
   * @param {string} whereClause WHERE clause
   * @param {Array} whereParams WHERE parameters
   * @param {boolean} returnUpdated Whether to return updated records
   * @returns {Object} Update result
   */
  async update(table, data, whereClause, whereParams = [], returnUpdated = false) {
    const setPairs = Object.keys(data).map((key, index) => `[${key}] = @param${index}`);
    const values = Object.values(data);

    let sqlQuery = `UPDATE [${table}] SET ${setPairs.join(', ')}`;

    if(returnUpdated) {
      sqlQuery += ` OUTPUT INSERTED.*`;
    }

    if(whereClause) {
      // Adjust parameter indices for WHERE clause
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
   * @param {string} table Table name
   * @param {string} whereClause WHERE clause
   * @param {Array} whereParams WHERE parameters
   * @param {boolean} returnDeleted Whether to return deleted records
   * @returns {Object} Delete result
   */
  async delete(table, whereClause, whereParams = [], returnDeleted = false) {
    let sqlQuery = `DELETE FROM [${table}]`;

    if(returnDeleted) {
      sqlQuery += ` OUTPUT DELETED.*`;
    }

    if(whereClause) {
      sqlQuery += ` WHERE ${whereClause}`;
    }

    const result = await this.query(sqlQuery, whereParams);

    return {
      affectedRows: result.rowCount,
      deletedRecords: returnDeleted ? result.rows : null,
      success: result.rowCount > 0
    };
  }

  /**
   * Execute transaction
   * @param {Function} callback Transaction callback
   * @returns {*} Transaction result
   */
  async transaction(callback) {
    const transaction = new sql.Transaction(this.pool);

    try {
      await transaction.begin();

      // Create temporary adapter for this transaction
      const transactionAdapter = {
        query: async (sqlQuery, params) => {
          const request = transaction.request();

          params.forEach((param, index) => {
            request.input(`param${index}`, param);
          });

          let processedSql = sqlQuery;
          let paramIndex = 0;
          processedSql = processedSql.replace(/\?/g, () => `@param${paramIndex++}`);

          const result = await request.query(processedSql);

          return {
            rows: result.recordset || [],
            rowCount: result.rowsAffected?.[0] || 0,
            insertedId: this.extractInsertedId(result)
          };
        }
      };

      const result = await callback(transactionAdapter);
      await transaction.commit();

      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Escape string value for SQL Server
   * @param {string} value Value to escape
   * @returns {string} Escaped value
   */
  escape(value) {
    if(typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }

  /**
   * Quote identifier (table/column name) for SQL Server
   * @param {string} identifier Identifier to quote
   * @returns {string} Quoted identifier
   */
  quoteIdentifier(identifier) {
    return `[${identifier.replace(/\]/g, ']]')}]`;
  }

  /**
   * Get table information
   * @param {string} tableName Table name
   * @returns {Object} Table information
   */
  async getTableInfo(tableName) {
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
      tableName: tableName,
      columns: result.rows.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        identity: col.is_identity === 1
      }))
    };
  }

  /**
   * List all tables in database
   * @returns {Array} Array of table names
   */
  async listTables() {
    const sqlQuery = `
            SELECT TABLE_NAME as table_name
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = SCHEMA_NAME()
            ORDER BY TABLE_NAME
        `;

    const result = await this.query(sqlQuery);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Get SQL Server version
   * @returns {string} SQL Server version
   */
  async getVersion() {
    const result = await this.query('SELECT @@VERSION as version');
    return result.rows[0].version;
  }

  /**
   * Check if table exists
   * @param {string} tableName Table name
   * @returns {boolean} True if table exists
   */
  async tableExists(tableName) {
    const sqlQuery = `
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = ? AND TABLE_SCHEMA = SCHEMA_NAME()
        `;

    const result = await this.query(sqlQuery, [tableName]);
    return result.rows[0].count > 0;
  }

  /**
   * SQL Server-specific: Get next identity value
   * @param {string} tableName Table name
   * @returns {number} Next identity value
   */
  async getNextIdentity(tableName) {
    const sqlQuery = `SELECT IDENT_CURRENT(?) + IDENT_INCR(?) as next_id`;
    const result = await this.query(sqlQuery, [tableName, tableName]);
    return result.rows[0]?.next_id || 1;
  }

  /**
   * SQL Server-specific: Execute with TOP clause
   * @param {string} table Table name
   * @param {number} limit Number of records to select
   * @param {string} whereClause Optional WHERE clause
   * @param {Array} whereParams WHERE parameters
   * @returns {Array} Query results
   */
  async selectTop(table, limit, whereClause = '', whereParams = []) {
    let sqlQuery = `SELECT TOP (${limit}) * FROM [${table}]`;

    if(whereClause) {
      sqlQuery += ` WHERE ${whereClause}`;
    }

    const result = await this.query(sqlQuery, whereParams);
    return result.rows;
  }

  /**
   * SQL Server-specific: Get table size information
   * @param {string} tableName Table name
   * @returns {Object} Table size information
   */
  async getTableSize(tableName) {
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

  /**
   * Create a new prepared statement for SQL Server
   * @param {string} sql - SQL query string
   * @returns {SQLServerStatement} - SQL Server statement instance
   */
  prepare(sql) {
    const SQLServerStatement = require('../statement/sqlServerStatement');
    return new SQLServerStatement(this, sql);
  }

  /**
   * Get the parameter placeholder for SQL Server (@param0, @param1, etc.)
   * @param {number} index - Parameter index (0-based)
   * @returns {string} - Parameter placeholder
   */
  getParameterPlaceholder(index) {
    return `@param${index}`;
  }
}

module.exports = SqlServerAdapter;