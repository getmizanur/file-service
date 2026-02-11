# Database Statement System

A comprehensive prepared statement implementation providing consistent database operations across PostgreSQL, MySQL, SQL Server, and SQLite.

## Overview

The Database Statement system provides an abstraction layer for prepared statements, similar to frameworks like Doctrine DBAL or ActiveRecord, offering:

- **Consistent API** across all supported databases
- **Parameter binding** for SQL injection protection
- **Multiple fetch modes** for flexible result handling
- **Resource management** with proper cleanup
- **Performance optimization** through statement reuse

## Quick Start

```javascript
// Get database adapter
const adapter = new PostgreSQLAdapter(config);
await adapter.connect();

// Create and execute prepared statement
const stmt = adapter.prepare('SELECT * FROM users WHERE age > ? AND active = ?');
const users = await stmt.execute([25, true]);

// Clean up
await stmt.close();
await adapter.disconnect();
```

## Core Classes

### Statement (Abstract Base Class)
- **Purpose**: Defines the interface for all statement implementations
- **Features**: Parameter binding, fetch modes, resource management
- **Methods**: `prepare()`, `execute()`, `fetch()`, `fetchAll()`, `close()`

### Database-Specific Implementations
- **PostgreSQLStatement**: Uses `$1, $2` parameter placeholders
- **MySQLStatement**: Uses `?` parameter placeholders with mysql2
- **SQLServerStatement**: Uses `@param0, @param1` parameter placeholders
- **SQLiteStatement**: Uses `?` parameter placeholders with sqlite3

## Statement Lifecycle

### 1. Creation
```javascript
const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?');
```

### 2. Parameter Binding
```javascript
// Method 1: During execution
await stmt.execute([123]);

// Method 2: Explicit binding
stmt.bindParam(0, 123);
await stmt.execute();

// Method 3: Named parameters (converted automatically)
stmt.bindParams({ userId: 123 });
await stmt.execute();
```

### 3. Execution and Fetching
```javascript
// Execute and get all results
const results = await stmt.execute([123]);

// Or fetch row by row
await stmt.execute([123]);
let row;
while ((row = await stmt.fetch()) !== null) {
    console.log(row);
}
```

### 4. Cleanup
```javascript
await stmt.close(); // Free statement resources
```

## Fetch Modes

### Object Mode (Default)
```javascript
stmt.setFetchMode('object');
const users = await stmt.execute();
// Result: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
```

### Array Mode
```javascript
stmt.setFetchMode('array');
const users = await stmt.execute();
// Result: [[1, 'John'], [2, 'Jane']]
```

### Column Mode
```javascript
stmt.setFetchMode('column');
const names = await stmt.execute();
// Result: ['John', 'Jane'] (first column only)
```

## Advanced Features

### Cursor Processing
```javascript
const stmt = adapter.prepare('SELECT * FROM large_table');
await stmt.execute();

// Process one row at a time (memory efficient)
let row;
while ((row = await stmt.fetch()) !== null) {
    processRow(row);
}
```

### Transaction Integration
```javascript
await adapter.transaction(async (transactionAdapter) => {
    const stmt = transactionAdapter.prepare('INSERT INTO users VALUES (?, ?)');
    await stmt.execute(['John', 'john@example.com']);
    await stmt.close();
});
```

### Statement Reuse
```javascript
const stmt = adapter.prepare('SELECT * FROM users WHERE status = ?');

// Execute multiple times with different parameters
const activeUsers = await stmt.execute(['active']);
const inactiveUsers = await stmt.execute(['inactive']);

await stmt.close();
```

## Database-Specific Features

### PostgreSQL
- **Parameter Style**: `$1, $2, $3`
- **Features**: RETURNING clauses, advanced data types
- **Example**: `INSERT INTO users (name) VALUES ($1) RETURNING id`

### MySQL
- **Parameter Style**: `?`
- **Features**: AUTO_INCREMENT handling, prepared statement caching
- **Example**: `INSERT INTO users (name) VALUES (?)`

### SQL Server
- **Parameter Style**: `@param0, @param1`
- **Features**: OUTPUT clauses, bulk operations
- **Example**: `INSERT INTO users (name) OUTPUT INSERTED.id VALUES (@param0)`

### SQLite
- **Parameter Style**: `?`
- **Features**: In-memory databases, file-based storage
- **Example**: `INSERT INTO users (name) VALUES (?)`

## Error Handling

### Basic Error Handling
```javascript
try {
    const stmt = adapter.prepare('SELECT * FROM users');
    const results = await stmt.execute();
    await stmt.close();
} catch (error) {
    console.error('Statement error:', error.message);
}
```

### Resource Cleanup
```javascript
let stmt;
try {
    stmt = adapter.prepare('SELECT * FROM users');
    const results = await stmt.execute();
    return results;
} catch (error) {
    console.error('Error:', error.message);
    throw error;
} finally {
    if (stmt) {
        await stmt.close();
    }
}
```

## Performance Considerations

### Statement Reuse
```javascript
// Good: Reuse prepared statements
const stmt = adapter.prepare('SELECT * FROM users WHERE category = ?');
for (const category of categories) {
    const users = await stmt.execute([category]);
    processUsers(users);
}
await stmt.close();

// Avoid: Creating new statements in loops
for (const category of categories) {
    const stmt = adapter.prepare('SELECT * FROM users WHERE category = ?');
    const users = await stmt.execute([category]);
    await stmt.close();
}
```

### Batch Operations
```javascript
const stmt = adapter.prepare('INSERT INTO logs (message, timestamp) VALUES (?, ?)');

// Process in batches
for (const logEntry of logEntries) {
    await stmt.execute([logEntry.message, logEntry.timestamp]);
}

await stmt.close();
```

## Common Patterns

### User Authentication
```javascript
async function authenticateUser(email, password) {
    const stmt = adapter.prepare('SELECT id, password_hash FROM users WHERE email = ? AND active = ?');
    const result = await stmt.execute([email, true]);
    await stmt.close();
    
    if (result.length === 0) {
        return null;
    }
    
    const user = result[0];
    return verifyPassword(password, user.password_hash) ? user : null;
}
```

### Data Pagination
```javascript
async function getUsers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const stmt = adapter.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?');
    
    const users = await stmt.execute([limit, offset]);
    await stmt.close();
    
    return users;
}
```

### Audit Logging
```javascript
async function logUserAction(userId, action, details) {
    const stmt = adapter.prepare(`
        INSERT INTO audit_log (user_id, action, details, timestamp) 
        VALUES (?, ?, ?, ?)
    `);
    
    await stmt.execute([userId, action, JSON.stringify(details), new Date()]);
    await stmt.close();
}
```

## Integration with Query Builders

The Statement system works alongside the existing query builders:

```javascript
// Build query with Select class
const selectQuery = adapter.select()
    .from('users')
    .where('active = ?', true)
    .where('age > ?', 25);

// Convert to statement for execution
const stmt = adapter.prepare(selectQuery.toString());
const results = await stmt.execute(selectQuery.getBindings());
await stmt.close();
```

## Migration from Raw Queries

### Before (Raw Queries)
```javascript
const results = await adapter.query('SELECT * FROM users WHERE id = ?', [userId]);
```

### After (Prepared Statements)
```javascript
const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?');
const results = await stmt.execute([userId]);
await stmt.close();
```

## Best Practices

1. **Always close statements** to free resources
2. **Reuse statements** when executing the same query multiple times
3. **Use transactions** for related operations
4. **Handle errors gracefully** with proper cleanup
5. **Choose appropriate fetch modes** based on your needs
6. **Use parameter binding** to prevent SQL injection
7. **Consider cursor processing** for large result sets

## Compatibility

- **Node.js**: 14.0+ (async/await support)
- **PostgreSQL**: 9.6+ (via pg driver)
- **MySQL**: 5.7+ (via mysql2 driver)
- **SQL Server**: 2012+ (via mssql driver)
- **SQLite**: 3.6+ (via sqlite3 driver)

## See Also

- [Query Builders Documentation](./query-builders.md)
- [Database Adapters Documentation](./database-adapters.md)
- [Transaction Management](./transactions.md)