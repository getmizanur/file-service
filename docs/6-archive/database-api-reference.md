# Database Query Builder - API Reference

This document provides detailed API documentation for all classes and methods in the database query builder system.

## Classes Overview

- [Select](#select-class) - Fluent query builder
- [DatabaseAdapter](#databaseadapter-class) - Abstract database interface
- [PostgreSQLAdapter](#postgresqladapter-class) - PostgreSQL implementation

---

## Select Class

The main query builder class providing a fluent interface for constructing SQL SELECT queries.

### Constructor

#### `new Select(dbAdapter = null)`

Creates a new Select instance.

**Parameters:**
- `dbAdapter` (DatabaseAdapter, optional) - Database adapter for query execution

**Example:**
```javascript
const select = new Select();
// or
const select = db.select(); // From adapter
```

### Query Building Methods

#### `from(table, columns = ['*'])`

Set the FROM clause and optionally select columns.

**Parameters:**
- `table` (string|object) - Table name or aliased object `{alias: 'tableName'}`
- `columns` (string|array|object, optional) - Columns to select

**Returns:** `Select` - This instance for method chaining

**Examples:**
```javascript
select.from('users');                           // FROM users
select.from('users', 'name');                  // SELECT name FROM users
select.from('users', ['id', 'name']);          // SELECT id, name FROM users
select.from({u: 'users'}, ['u.id', 'u.name']); // FROM users AS u
select.from('users', {user_id: 'id'});         // SELECT id AS user_id FROM users
```

#### `columns(columns)`

Add columns to the SELECT clause.

**Parameters:**
- `columns` (string|array|object) - Columns to add

**Returns:** `Select` - This instance for method chaining

**Examples:**
```javascript
select.columns('email');
select.columns(['phone', 'address']);
select.columns({full_name: 'CONCAT(first_name, " ", last_name)'});
```

#### `where(condition, value = null)`

Add WHERE condition (AND).

**Parameters:**
- `condition` (string) - SQL condition with `?` placeholders
- `value` (any, optional) - Value to bind to placeholder

**Returns:** `Select` - This instance for method chaining

**Examples:**
```javascript
select.where('active = ?', true);
select.where('age > ?', 18);
select.where('name LIKE ?', '%john%');
select.where('department IN (?)', ['IT', 'Engineering']);
```

#### `orWhere(condition, value = null)`

Add OR WHERE condition.

**Parameters:**
- `condition` (string) - SQL condition with `?` placeholders  
- `value` (any, optional) - Value to bind to placeholder

**Returns:** `Select` - This instance for method chaining

**Example:**
```javascript
select.where('department = ?', 'IT')
      .orWhere('priority = ?', 'high');
// WHERE department = $1 OR priority = $2
```

#### `join(table, condition, columns = [])`

Add INNER JOIN.

**Parameters:**
- `table` (string|object) - Table name or aliased object
- `condition` (string) - JOIN condition
- `columns` (array, optional) - Columns to select from joined table

**Returns:** `Select` - This instance for method chaining

**Examples:**
```javascript
select.join('profiles', 'users.id = profiles.user_id');
select.join('profiles', 'users.id = profiles.user_id', ['bio']);
select.join({p: 'profiles'}, 'u.id = p.user_id', ['p.bio']);
```

#### `joinLeft(table, condition, columns = [])`

Add LEFT JOIN.

**Parameters:** Same as `join()`

**Returns:** `Select` - This instance for method chaining

#### `joinRight(table, condition, columns = [])`

Add RIGHT JOIN.

**Parameters:** Same as `join()`

**Returns:** `Select` - This instance for method chaining

#### `group(columns)`

Add GROUP BY clause.

**Parameters:**
- `columns` (string|array) - Column(s) to group by

**Returns:** `Select` - This instance for method chaining

**Examples:**
```javascript
select.group('department');
select.group(['department', 'status']);
```

#### `having(condition, value = null)`

Add HAVING clause.

**Parameters:**
- `condition` (string) - HAVING condition with `?` placeholders
- `value` (any, optional) - Value to bind to placeholder

**Returns:** `Select` - This instance for method chaining

**Example:**
```javascript
select.group('department')
      .having('COUNT(*) > ?', 5);
```

#### `order(column, direction = 'ASC')`

Add ORDER BY clause.

**Parameters:**
- `column` (string) - Column to order by
- `direction` (string, optional) - 'ASC' or 'DESC' (default: 'ASC')

**Returns:** `Select` - This instance for method chaining

**Examples:**
```javascript
select.order('name');                    // ORDER BY name ASC
select.order('created_at', 'DESC');      // ORDER BY created_at DESC
```

#### `limit(count, offset = null)`

Add LIMIT clause.

**Parameters:**
- `count` (number) - Maximum number of rows
- `offset` (number, optional) - Number of rows to skip

**Returns:** `Select` - This instance for method chaining

**Examples:**
```javascript
select.limit(10);        // LIMIT 10
select.limit(20, 40);    // LIMIT 20 OFFSET 40
```

#### `offset(offset)`

Add OFFSET clause.

**Parameters:**
- `offset` (number) - Number of rows to skip

**Returns:** `Select` - This instance for method chaining

### Query Execution Methods

#### `toString()`

Build and return the SQL query string.

**Returns:** `string` - Complete SQL SELECT statement

**Example:**
```javascript
const sql = select.from('users').where('active = ?', true).toString();
console.log(sql); // SELECT * FROM users WHERE active = $1
```

#### `getParameters()`

Get the bound parameters array.

**Returns:** `array` - Array of parameter values in order

**Example:**
```javascript
select.where('age > ?', 18).where('department = ?', 'IT');
console.log(select.getParameters()); // [18, 'IT']
```

#### `async execute()`

Execute the query using the database adapter.

**Returns:** `Promise<Array>` - Query results

**Throws:** Error if no database adapter is set

**Example:**
```javascript
const results = await select.from('users').where('active = ?', true).execute();
```

### Utility Methods

#### `reset()`

Reset the query builder to initial state.

**Returns:** `Select` - This instance for method chaining

#### `clone()`

Create a copy of the current query builder.

**Returns:** `Select` - New Select instance with same state

**Example:**
```javascript
const baseQuery = db.select().from('products').where('active = ?', true);
const featuredQuery = baseQuery.clone().where('featured = ?', true);
```

---

## DatabaseAdapter Class

Abstract base class providing a consistent interface for database operations.

### Constructor

#### `new DatabaseAdapter(config = {})`

Creates a new DatabaseAdapter instance.

**Parameters:**
- `config` (object, optional) - Database configuration

### Connection Methods

#### `async connect()`

Connect to the database.

**Returns:** `Promise` - Connection promise

**Note:** Must be implemented by concrete adapters.

#### `async disconnect()`

Disconnect from the database.

**Returns:** `Promise` - Disconnection promise

**Note:** Must be implemented by concrete adapters.

### Query Methods

#### `select()`

Create a new Select query builder.

**Returns:** `Select` - New Select instance linked to this adapter

#### `async query(sql, params = [])`

Execute a raw SQL query.

**Parameters:**
- `sql` (string) - SQL query string
- `params` (array, optional) - Query parameters

**Returns:** `Promise` - Query result

**Note:** Must be implemented by concrete adapters.

#### `async fetchAll(query, params = [])`

Execute query and return all rows.

**Parameters:**
- `query` (string|Select) - SQL string or Select object
- `params` (array, optional) - Parameters (if using SQL string)

**Returns:** `Promise<Array>` - Array of result rows

#### `async fetchRow(query, params = [])`

Execute query and return first row.

**Parameters:**
- `query` (string|Select) - SQL string or Select object
- `params` (array, optional) - Parameters (if using SQL string)

**Returns:** `Promise<object|null>` - Single row or null

#### `async fetchOne(query, params = [])`

Execute query and return single value.

**Parameters:**
- `query` (string|Select) - SQL string or Select object
- `params` (array, optional) - Parameters (if using SQL string)

**Returns:** `Promise<any>` - Single column value

### CRUD Methods

#### `async insert(table, data)`

Execute INSERT statement.

**Parameters:**
- `table` (string) - Table name
- `data` (object) - Column-value pairs

**Returns:** `Promise` - Insert result

**Example:**
```javascript
const result = await db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
    active: true
});
```

#### `async update(table, data, where, whereParams = [])`

Execute UPDATE statement.

**Parameters:**
- `table` (string) - Table name
- `data` (object) - Column-value pairs to update
- `where` (string) - WHERE clause condition
- `whereParams` (array, optional) - Parameters for WHERE clause

**Returns:** `Promise` - Update result

**Example:**
```javascript
await db.update('users', 
    { name: 'Jane Doe', active: false },
    'id = ?',
    [123]
);
```

#### `async delete(table, where, whereParams = [])`

Execute DELETE statement.

**Parameters:**
- `table` (string) - Table name
- `where` (string) - WHERE clause condition
- `whereParams` (array, optional) - Parameters for WHERE clause

**Returns:** `Promise` - Delete result

**Example:**
```javascript
await db.delete('users', 'id = ?', [123]);
```

### Transaction Methods

#### `async beginTransaction()`

Begin database transaction.

**Returns:** `Promise` - Transaction promise

#### `async commit()`

Commit current transaction.

**Returns:** `Promise` - Commit promise

#### `async rollback()`

Rollback current transaction.

**Returns:** `Promise` - Rollback promise

#### `async transaction(callback)`

Execute callback within a transaction.

**Parameters:**
- `callback` (function) - Async function to execute

**Returns:** `Promise` - Result of callback

**Example:**
```javascript
const result = await db.transaction(async (trx) => {
    await trx.insert('users', userData);
    await trx.insert('profiles', profileData);
    return { success: true };
});
```

### Utility Methods

#### `escape(value)`

Escape a value for use in SQL queries.

**Parameters:**
- `value` (any) - Value to escape

**Returns:** `string` - Escaped value

#### `quoteIdentifier(identifier)`

Quote an identifier (table/column name).

**Parameters:**
- `identifier` (string) - Identifier to quote

**Returns:** `string` - Quoted identifier

#### `async lastInsertId()`

Get the last inserted auto-increment ID.

**Returns:** `Promise` - Last insert ID

**Note:** Must be implemented by concrete adapters.

#### `getConnectionInfo()`

Get database connection information.

**Returns:** `object` - Connection details

---

## PostgreSQLAdapter Class

Concrete implementation of DatabaseAdapter for PostgreSQL databases.

### Constructor

#### `new PostgreSQLAdapter(config)`

Creates a new PostgreSQL adapter.

**Parameters:**
- `config` (object) - PostgreSQL connection configuration

**Configuration Options:**
```javascript
{
    host: 'localhost',           // Database host
    port: 5432,                  // Database port
    database: 'myapp',           // Database name
    username: 'user',            // Username
    password: 'pass',            // Password
    max_connections: 10,         // Connection pool size
    idle_timeout: 30000,         // Idle connection timeout (ms)
    connection_timeout: 2000     // New connection timeout (ms)
}
```

### PostgreSQL-Specific Methods

#### `async insert(table, data)`

Enhanced INSERT with RETURNING clause.

**Returns:** 
```javascript
{
    insertedId: number|null,     // Auto-generated ID
    insertedRow: object|null,    // Complete inserted row
    rowsAffected: number         // Number of affected rows
}
```

#### `async update(table, data, where, whereParams = [])`

Enhanced UPDATE with RETURNING clause.

**Returns:**
```javascript
{
    rowsAffected: number,        // Number of affected rows
    updatedRows: Array           // Updated rows
}
```

#### `async delete(table, where, whereParams = [])`

Enhanced DELETE with RETURNING clause.

**Returns:**
```javascript
{
    rowsAffected: number,        // Number of affected rows
    deletedRows: Array           // Deleted rows
}
```

#### `async getDatabaseInfo()`

Get PostgreSQL database information.

**Returns:** 
```javascript
{
    type: 'PostgreSQLAdapter',
    connected: boolean,
    version: string,
    database_size: string,
    client_encoding: string
}
```

#### `async tableExists(tableName)`

Check if a table exists.

**Parameters:**
- `tableName` (string) - Name of table to check

**Returns:** `Promise<boolean>` - True if table exists

#### `async getTableColumns(tableName)`

Get table column information.

**Parameters:**
- `tableName` (string) - Name of table

**Returns:** `Promise<Array>` - Array of column information

**Column Information Structure:**
```javascript
{
    column_name: string,
    data_type: string,
    is_nullable: string,
    column_default: string|null,
    character_maximum_length: number|null
}
```

#### `async lastInsertId(sequence = null)`

Get last inserted ID from PostgreSQL sequence.

**Parameters:**
- `sequence` (string, optional) - Sequence name

**Returns:** `Promise<number|null>` - Last insert ID

### Usage Examples

#### Basic Connection and Query
```javascript
const adapter = new PostgreSQLAdapter({
    host: 'localhost',
    database: 'myapp',
    username: 'user',
    password: 'password'
});

await adapter.connect();

const users = await adapter.select()
    .from('users')
    .where('active = ?', true)
    .execute();
```

#### Transaction Example
```javascript
await adapter.transaction(async (trx) => {
    const userResult = await trx.insert('users', {
        name: 'John Doe',
        email: 'john@example.com'
    });
    
    await trx.insert('profiles', {
        user_id: userResult.insertedId,
        bio: 'Software Developer'
    });
});
```

#### Database Introspection
```javascript
const tableExists = await adapter.tableExists('users');
if (tableExists) {
    const columns = await adapter.getTableColumns('users');
    console.log('User table columns:', columns);
}

const dbInfo = await adapter.getDatabaseInfo();
console.log('Database info:', dbInfo);
```

---

## Error Handling

All methods may throw errors. Common error types:

### Connection Errors
- Database connection failures
- Authentication errors
- Network timeouts

### Query Errors
- SQL syntax errors
- Table/column not found
- Constraint violations
- Data type mismatches

### Transaction Errors
- Deadlocks
- Constraint violations during transactions
- Connection failures during transactions

### Example Error Handling
```javascript
try {
    await db.connect();
    
    const result = await db.select()
        .from('users')
        .where('invalid_column = ?', 'value')
        .execute();
        
} catch (error) {
    if (error.message.includes('column "invalid_column" does not exist')) {
        console.error('Column not found:', error.message);
    } else if (error.message.includes('connection')) {
        console.error('Database connection error:', error.message);
    } else {
        console.error('Unexpected error:', error.message);
    }
}
```