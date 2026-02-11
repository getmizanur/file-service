const DatabaseAdapter = require('./database-adapter');

/**
 * PostgreSQL Database Adapter - Concrete implementation for PostgreSQL
 * Uses pg (node-postgres) library for database connectivity
 */
class PostgreSQLAdapter extends DatabaseAdapter {

  constructor(config) {
    super(config);
    this.client = null;
    this.pool = null;
  }

  /**
   * Connect to PostgreSQL database
   * @returns {Promise} - Connection promise
   */
  async connect() {
    try {
      // Use pg library (must be installed: npm install pg)
      const {
        Pool
      } = require('pg');

      const poolConfig = {
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        max: this.config.max_connections || 10,
        idleTimeoutMillis: this.config.idle_timeout || 30000,
        connectionTimeoutMillis: this.config.connection_timeout || 2000,
      };

      this.pool = new Pool(poolConfig);

      // Test connection
      this.client = await this.pool.connect();
      this.connection = this.client;

      console.log(`Connected to PostgreSQL database: ${this.config.database}`);
      return this.connection;

    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from PostgreSQL database
   * @returns {Promise} - Disconnection promise
   */
  async disconnect() {
    try {
      if(this.client) {
        this.client.release();
        this.client = null;
      }

      if(this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      this.connection = null;
      console.log('Disconnected from PostgreSQL database');

    } catch (error) {
      throw new Error(`PostgreSQL disconnection failed: ${error.message}`);
    }
  }

  /**
   * Execute a raw SQL query with parameters
   * @param {string} sql - SQL query string
   * @param {array} params - Query parameters
   * @returns {Promise} - Query result promise
   */
  async query(sql, params = []) {
    if(!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      console.log('Executing SQL:', sql);
      if(params.length > 0) {
        console.log('Parameters:', params);
      }

      const result = await this.pool.query(sql, params);
      return result.rows;

    } catch (error) {
      throw new Error(`PostgreSQL query failed: ${error.message}`);
    }
  }

  /**
   * Execute an INSERT statement and return inserted row
   * @param {string} table - Table name
   * @param {object} data - Column-value pairs to insert
   * @returns {Promise} - Insert result with inserted row
   */
  async insert(table, data) {
    const columns = Object.keys(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const values = Object.values(data);

    // Use RETURNING clause to get inserted data
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await this.query(sql, values);

    return {
      insertedId: result[0] ? result[0].id : null,
      insertedRow: result[0] || null,
      rowsAffected: result.length
    };
  }

  /**
   * Execute an UPDATE statement
   * @param {string} table - Table name
   * @param {object} data - Column-value pairs to update
   * @param {string} where - WHERE clause condition
   * @param {array} whereParams - Parameters for WHERE clause
   * @returns {Promise} - Update result
   */
  async update(table, data, where, whereParams = []) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    const setClause = columns.map((col, index) => `${col} = $${index + 1}`);

    // Adjust parameter placeholders in WHERE clause for PostgreSQL
    let adjustedWhere = where;
    whereParams.forEach((_, index) => {
      const oldPlaceholder = `$${index + 1}`;
      const newPlaceholder = `$${values.length + index + 1}`;
      adjustedWhere = adjustedWhere.replace(oldPlaceholder, newPlaceholder);
    });

    const sql = `UPDATE ${table} SET ${setClause.join(', ')} WHERE ${adjustedWhere} RETURNING *`;
    const result = await this.query(sql, values.concat(whereParams));

    return {
      rowsAffected: result.length,
      updatedRows: result
    };
  }

  /**
   * Execute a DELETE statement
   * @param {string} table - Table name
   * @param {string} where - WHERE clause condition
   * @param {array} whereParams - Parameters for WHERE clause
   * @returns {Promise} - Delete result
   */
  async delete(table, where, whereParams = []) {
    const sql = `DELETE FROM ${table} WHERE ${where} RETURNING *`;
    const result = await this.query(sql, whereParams);

    return {
      rowsAffected: result.length,
      deletedRows: result
    };
  }

  /**
   * Quote an identifier for PostgreSQL
   * @param {string} identifier - Identifier to quote
   * @returns {string} - Quoted identifier
   */
  quoteIdentifier(identifier) {
    return `"${identifier}"`;
  }

  /**
   * Get the last inserted ID from sequence
   * @param {string} sequence - Sequence name (optional)
   * @returns {Promise} - Last insert ID
   */
  async lastInsertId(sequence = null) {
    if(sequence) {
      const result = await this.query('SELECT currval($1)', [sequence]);
      return result[0] ? result[0].currval : null;
    }

    // If no sequence specified, try to get last value from recent insert
    const result = await this.query('SELECT lastval()');
    return result[0] ? result[0].lastval : null;
  }

  /**
   * Get PostgreSQL version and connection info
   * @returns {Promise<object>} - Database information
   */
  async getDatabaseInfo() {
    try {
      const versionResult = await this.query('SELECT version()');
      const dbSizeResult = await this.query(`
                SELECT pg_size_pretty(pg_database_size($1)) as size
            `, [this.config.database]);

      return {
        ...this.getConnectionInfo(),
        version: versionResult[0] ? versionResult[0].version : 'Unknown',
        database_size: dbSizeResult[0] ? dbSizeResult[0].size : 'Unknown',
        client_encoding: await this.query('SHOW client_encoding')
      };
    } catch (error) {
      return {
        ...this.getConnectionInfo(),
        error: error.message
      };
    }
  }

  /**
   * Check if a table exists
   * @param {string} tableName - Name of the table to check
   * @returns {Promise<boolean>} - True if table exists
   */
  async tableExists(tableName) {
    const result = await this.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )
        `, [tableName]);

    return result[0] ? result[0].exists : false;
  }

  /**
   * Get table columns information
   * @param {string} tableName - Table name
   * @returns {Promise<Array>} - Array of column information
   */
  async getTableColumns(tableName) {
    const result = await this.query(`
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position
        `, [tableName]);

    return result;
  }

  /**
   * Create a new prepared statement for PostgreSQL
   * @param {string} sql - SQL query string
   * @returns {PostgreSQLStatement} - PostgreSQL statement instance
   */
  prepare(sql) {
    const PostgreSQLStatement = require('../statement/postgreSQLStatement');
    return new PostgreSQLStatement(this, sql);
  }

  /**
   * Get the parameter placeholder for PostgreSQL ($1, $2, etc.)
   * @param {number} index - Parameter index (0-based)
   * @returns {string} - Parameter placeholder
   */
  getParameterPlaceholder(index) {
    return `$${index + 1}`;
  }
}

module.exports = PostgreSQLAdapter;