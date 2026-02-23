// library/db/sql/insert.js
/**
 * Insert Query Builder
 *
 * Provides a fluent interface for constructing INSERT queries safely and efficiently.
 * Supports single and batch inserts, ON CONFLICT/DUPLICATE KEY handling, and
 * database-specific features like RETURNING clauses.
 */

class Insert {
  /**
   * Initialize Insert query builder
   * @param {DatabaseAdapter} adapter - Database adapter instance
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.query = {
      table: null,
      columns: [],
      values: [],
      onConflict: null,
      returning: []
    };
    this.parameters = [];
  }

  into(table) {
    this.query.table = table;
    return this;
  }

  columns(columns) {
    this.query.columns = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  values(data) {
    if (Array.isArray(data)) {
      this.query.values.push(data);
    } else if (typeof data === 'object' && data !== null) {
      if (this.query.columns.length === 0) {
        this.query.columns = Object.keys(data);
      }
      this.query.values.push(Object.values(data));
    }
    return this;
  }

  batchValues(dataArray) {
    if (!Array.isArray(dataArray)) {
      throw new Error('batchValues() requires an array');
    }
    dataArray.forEach(data => this.values(data));
    return this;
  }

  set(data) {
    if (typeof data !== 'object' || data == null) {
      throw new Error('set() requires an object');
    }

    this.query.columns = Object.keys(data);
    this.query.values = [Object.values(data)];
    return this;
  }

  returning(columns) {
    if (typeof columns === 'string') {
      this.query.returning.push(columns);
    } else if (Array.isArray(columns)) {
      this.query.returning = this.query.returning.concat(columns);
    }
    return this;
  }

  /**
   * Handle conflicts:
   *
   * Backwards-compatible signatures:
   *   onConflict('IGNORE')
   *   onConflict('UPDATE', {col: val})
   *
   * New signatures (PostgreSQL target support):
   *   onConflict('UPDATE', {col: val}, ['tenant_id','file_id','user_id'])
   *   onConflict('IGNORE', null, ['tenant_id','file_id','user_id'])
   *
   * Also supports an options object:
   *   onConflict({
   *     action: 'UPDATE'|'IGNORE',
   *     updateData: {...},
   *     target: ['col1','col2'],      // ON CONFLICT (col1,col2)
   *     constraint: 'uq_name'         // OR: ON CONFLICT ON CONSTRAINT uq_name
   *   })
   */
  onConflict(actionOrOptions, updateData = null, target = null) {
    if (typeof actionOrOptions === 'object' && actionOrOptions !== null) {
      const opts = actionOrOptions;
      this.query.onConflict = {
        action: opts.action,
        updateData: opts.updateData ?? null,
        target: opts.target ?? null,
        constraint: opts.constraint ?? null
      };
      return this;
    }

    this.query.onConflict = {
      action: actionOrOptions,
      updateData: updateData,
      target: target,
      constraint: null
    };
    return this;
  }

  _adapterName() {
    return this.adapter?.constructor?.name || '';
  }

  _quoteIdentifier(name) {
    const adapterName = this._adapterName();
    if (adapterName === 'MySQLAdapter') return `\`${name}\``;
    if (adapterName === 'SqlServerAdapter') return `[${name}]`;
    return `"${name}"`; // default PostgreSQL style
  }

  _isSimpleIdentifier(s) {
    return typeof s === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
  }

  _quoteIfSimpleIdentifier(s) {
    return this._isSimpleIdentifier(s) ? this._quoteIdentifier(s) : s;
  }

  _addParameter(value) {
    this.parameters.push(value);

    const adapterName = this._adapterName();
    if (adapterName === 'PostgreSQLAdapter') {
      return `$${this.parameters.length}`;
    } else if (adapterName === 'SqlServerAdapter') {
      return `@param${this.parameters.length - 1}`;
    } else {
      return '?';
    }
  }

  _buildPgConflictTargetClause() {
    const oc = this.query.onConflict;
    if (!oc) return '';

    // If a named constraint is given
    if (oc.constraint && typeof oc.constraint === 'string') {
      return ` ON CONFLICT ON CONSTRAINT ${this._quoteIdentifier(oc.constraint)}`;
    }

    // If a target is given
    const target = oc.target;
    if (!target) return ' ON CONFLICT';

    const cols = Array.isArray(target) ? target : [target];
    const quotedCols = cols.map(c => this._quoteIdentifier(c));
    return ` ON CONFLICT (${quotedCols.join(', ')})`;
  }

  toString() {
    if (!this.query.table) {
      throw new Error('Table name is required for INSERT');
    }

    if (this.query.columns.length === 0 || this.query.values.length === 0) {
      throw new Error('Columns and values are required for INSERT');
    }

    const adapterName = this._adapterName();

    let sql = 'INSERT INTO ' + this._quoteIdentifier(this.query.table);

    // Add columns
    const quotedColumns = this.query.columns.map(col => this._quoteIdentifier(col));
    sql += ` (${quotedColumns.join(', ')})`;

    // SQL Server OUTPUT (if returning set)
    if (adapterName === 'SqlServerAdapter' && this.query.returning.length > 0) {
      const outputCols = this.query.returning.map(col => {
        const safe = this._isSimpleIdentifier(col) ? col : col;
        return `INSERTED.${safe}`;
      });
      sql += ` OUTPUT ${outputCols.join(', ')}`;
    }

    // VALUES
    sql += ' VALUES ';
    const valuePlaceholders = this.query.values.map(row => {
      const placeholders = row.map(value => this._addParameter(value));
      return `(${placeholders.join(', ')})`;
    });
    sql += valuePlaceholders.join(', ');

    // Conflict handling
    if (this.query.onConflict) {
      const oc = this.query.onConflict;

      if (adapterName === 'PostgreSQLAdapter') {
        const targetClause = this._buildPgConflictTargetClause();

        if (oc.action === 'IGNORE') {
          sql += `${targetClause} DO NOTHING`;
        } else if (oc.action === 'UPDATE' && oc.updateData) {
          const updatePairs = Object.keys(oc.updateData).map(key => {
            const value = oc.updateData[key];
            return `${this._quoteIdentifier(key)} = ${this._addParameter(value)}`;
          });
          sql += `${targetClause} DO UPDATE SET ${updatePairs.join(', ')}`;
        }
      } else if (adapterName === 'MySQLAdapter') {
        if (oc.action === 'IGNORE') {
          sql = sql.replace('INSERT INTO', 'INSERT IGNORE INTO');
        } else if (oc.action === 'UPDATE' && oc.updateData) {
          const updatePairs = Object.keys(oc.updateData).map(key => {
            const value = oc.updateData[key];
            return `${this._quoteIdentifier(key)} = ${this._addParameter(value)}`;
          });
          sql += ` ON DUPLICATE KEY UPDATE ${updatePairs.join(', ')}`;
        }
      }
      // (SqlServerAdapter upsert not implemented here)
    }

    // PostgreSQL RETURNING
    if (adapterName === 'PostgreSQLAdapter' && this.query.returning.length > 0) {
      const returningCols = this.query.returning.map(col => this._quoteIfSimpleIdentifier(col));
      sql += ` RETURNING ${returningCols.join(', ')}`;
    }

    return sql;
  }

  /**
   * Normalize adapter results:
   * - legacy adapters may return rows[]
   * - new adapters return { rows, rowCount, insertedId }
   */
  _normalizeResult(result) {
    if (!result) {
      return { rows: [], rowCount: 0, insertedId: null };
    }

    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length, insertedId: null };
    }

    if (typeof result === 'object') {
      const rows = Array.isArray(result.rows) ? result.rows : [];
      const rowCount =
        typeof result.rowCount === 'number'
          ? result.rowCount
          : (typeof result.affectedRows === 'number' ? result.affectedRows : rows.length);

      return {
        rows,
        rowCount,
        insertedId: result.insertedId ?? null
      };
    }

    return { rows: [], rowCount: 0, insertedId: null };
  }

  _inferInsertedIdFromRow(row) {
    if (!row || typeof row !== 'object') return null;

    // common ids in your schema/entities
    return (
      row.id ??
      row.file_id ??
      row.folder_id ??
      row.user_id ??
      row.event_id ??
      row.share_id ??
      row.tenant_id ??
      null
    );
  }

  async execute() {
    const sql = this.toString();
    const raw = await this.adapter.query(sql, this.parameters);
    const result = this._normalizeResult(raw);

    const insertedRow = result.rows[0] || null;

    // Prefer adapter-provided insertedId, fallback to inferring from RETURNING row
    const insertedId = result.insertedId ?? this._inferInsertedIdFromRow(insertedRow);

    return {
      insertedId,
      insertedRecord: insertedRow,
      affectedRows: result.rowCount,
      success: result.rowCount > 0
    };
  }

  reset() {
    this.query = {
      table: null,
      columns: [],
      values: [],
      onConflict: null,
      returning: []
    };
    this.parameters = [];
    return this;
  }

  clone() {
    const cloned = new Insert(this.adapter);
    cloned.query = JSON.parse(JSON.stringify(this.query));
    cloned.parameters = [...this.parameters];
    return cloned;
  }
}

module.exports = Insert;