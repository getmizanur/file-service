# Database Query Builder Documentation

The database query builder provides a fluent, object-oriented interface for constructing SQL queries safely and efficiently. It includes automatic parameter binding, SQL injection prevention, and support for complex queries including joins, subqueries, and transactions.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Select Query Builder](#select-query-builder)
4. [Database Adapters](#database-adapters)
5. [Advanced Features](#advanced-features)
6. [Security](#security)
7. [Examples](#examples)
8. [API Reference](#api-reference)

## Quick Start

### Installation

The query builder is built into the MVC framework. No additional packages are required for basic usage.

For database-specific support, install the appropriate driver:

**PostgreSQL:**
```bash
npm install pg
```

**MySQL:**
```bash
npm install mysql2
```

**SQL Server:**
```bash
npm install mssql
```

**SQLite:**
```bash
npm install sqlite3
```

### Basic Usage

**PostgreSQL:**
```javascript
const PostgreSQLAdapter = require('./library/mvc/db/adapter/postgreSQLAdapter');

const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'user',
    password: 'password'
};
```

**MySQL:**
```javascript
const MySQLAdapter = require('./library/mvc/db/adapter/mysqlAdapter');

const dbConfig = {
    host: 'localhost',
    port: 3306,
    database: 'myapp',
    user: 'root',
    password: 'password'
};
```

**SQL Server:**
```javascript
const SqlServerAdapter = require('./library/mvc/db/adapter/sqlServerAdapter');

const dbConfig = {
    server: 'localhost',
    port: 1433,
    database: 'MyApp',
    user: 'sa',
    password: 'Password123!',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};
```

**SQLite:**
```javascript
const SQLiteAdapter = require('./library/mvc/db/adapter/sqliteAdapter');

const dbConfig = {
    database: './database.sqlite', // File path or ':memory:' for in-memory
    options: {
        enableWAL: true,
        foreignKeys: true,
        busyTimeout: 10000
    }
};
```

**Common Usage Pattern:**
```javascript
// Initialize any adapter (example with PostgreSQL)
const db = new PostgreSQLAdapter(dbConfig);
await db.connect();

// Build and execute query (same syntax for all databases)
const users = await db.select()
    .from('users', ['id', 'name', 'email'])
    .where('active = ?', true)
    .order('name', 'ASC')
    .limit(10)
    .execute();

console.log('Users:', users);
```

## Architecture Overview

The query builder follows a layered architecture:

```
┌─────────────────────────────────────────────────┐
│                Application Layer                │
│           (Controllers, Services)               │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│              Query Builder Layer                │
│        Select Class (Fluent Interface)         │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│             Database Adapter Layer              │
│     PostgreSQLAdapter, MySQLAdapter, etc.      │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│              Database Driver Layer              │
│              (pg, mysql2, etc.)                 │
└─────────────────────────────────────────────────┘
```

### Core Components

- **Select**: Query builder with fluent interface
- **DatabaseAdapter**: Abstract base class for database operations
- **PostgreSQLAdapter**: Concrete PostgreSQL implementation
- **TableGateway**: Table-specific data access layer

## Select Query Builder

The `Select` class provides a fluent interface for building SQL SELECT queries.

### Basic Structure

```javascript
const select = db.select()
    .from('table_name')
    .where('condition')
    .order('column')
    .limit(10);
```

### Method Chaining

All query builder methods return the Select instance, allowing method chaining:

```javascript
const complexQuery = db.select()
    .from({u: 'users'}, ['u.id', 'u.name'])
    .joinLeft({p: 'profiles'}, 'u.id = p.user_id', ['p.bio'])
    .where('u.active = ?', true)
    .where('u.department = ?', 'Engineering')
    .group('u.department')
    .having('COUNT(*) > ?', 5)
    .order('u.name', 'ASC')
    .limit(20, 10);
```

### FROM Clause

#### Simple Table
```javascript
select.from('users');                    // FROM users
select.from('users', ['name', 'email']); // SELECT name, email FROM users
```

#### Table Aliases
```javascript
select.from({u: 'users'}, ['u.name']);   // FROM users AS u
```

#### Column Selection
```javascript
// String format
select.from('users', 'name');

// Array format
select.from('users', ['id', 'name', 'email']);

// Object format (with aliases)
select.from('users', {
    'user_id': 'id',
    'full_name': 'name',
    'email_address': 'email'
});
// SELECT id AS user_id, name AS full_name, email AS email_address FROM users
```

### WHERE Conditions

#### Basic Conditions
```javascript
select.where('active = ?', true);
select.where('age > ?', 18);
select.where('name LIKE ?', '%john%');
```

#### Multiple Conditions (AND)
```javascript
select.where('active = ?', true)
      .where('department = ?', 'IT')
      .where('salary > ?', 50000);
// WHERE active = $1 AND department = $2 AND salary = $3
```

#### OR Conditions
```javascript
select.where('department = ?', 'IT')
      .orWhere('department = ?', 'Engineering');
// WHERE department = $1 OR department = $2
```

#### Complex Conditions
```javascript
select.where('(status = ? OR priority = ?)', ['active', 'high'])
      .where('created_at >= ?', '2023-01-01');
```

### JOINs

#### Inner Join
```javascript
select.join('profiles', 'users.id = profiles.user_id');
select.join('profiles', 'users.id = profiles.user_id', ['bio', 'avatar']);
```

#### Left Join
```javascript
select.joinLeft({p: 'profiles'}, 'u.id = p.user_id', ['p.bio']);
```

#### Right Join
```javascript
select.joinRight('orders', 'users.id = orders.user_id', ['total']);
```

### GROUP BY and HAVING

```javascript
select.from('orders')
      .group('customer_id')
      .group('status')
      .having('SUM(total) > ?', 1000);
```

### ORDER BY

```javascript
select.order('name');                    // ORDER BY name ASC
select.order('created_at', 'DESC');      // ORDER BY created_at DESC
select.order('priority').order('name');  // Multiple columns
```

### LIMIT and OFFSET

```javascript
select.limit(10);           // LIMIT 10
select.limit(20, 40);       // LIMIT 20 OFFSET 40
select.offset(50);          // OFFSET 50
```

## Database Adapters

The framework supports multiple database systems through dedicated adapters. Each adapter implements database-specific optimizations while maintaining a consistent interface.

### PostgreSQLAdapter

PostgreSQL adapter with advanced features like RETURNING clauses and JSON support.

#### Configuration
```javascript
const PostgreSQLAdapter = require('./library/mvc/db/adapter/postgreSQLAdapter');

const config = {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'dbuser',
    password: 'dbpass',
    max_connections: 10,
    idle_timeout: 30000,
    connection_timeout: 2000
};

const db = new PostgreSQLAdapter(config);
await db.connect();
```

#### PostgreSQL-Specific Features
```javascript
// RETURNING clause support
const result = await db.insert('users', { name: 'John' });
console.log('Inserted record:', result.insertedRecord);

// JSON operations
await db.query('SELECT data->>? as name FROM users WHERE id = ?', ['name', 123]);

// PostgreSQL introspection
const tables = await db.listTables();
const tableInfo = await db.getTableInfo('users');
```

### MySQLAdapter

MySQL adapter with auto-increment handling and MySQL-specific optimizations.

#### Configuration
```javascript
const MySQLAdapter = require('./library/mvc/db/adapter/mysqlAdapter');

const config = {
    host: 'localhost',
    port: 3306,
    database: 'myapp',
    user: 'root',
    password: 'password',
    pool: {
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000
    }
};

const db = new MySQLAdapter(config);
await db.connect();
```

#### MySQL-Specific Features
```javascript
// Auto-increment handling
const result = await db.insert('users', { name: 'John' });
console.log('Inserted ID:', result.insertedId);

// Batch inserts (optimized for MySQL)
const users = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
];
await db.insertBatch('users', users);

// MySQL utilities
const nextId = await db.getNextAutoIncrement('users');
const tableStatus = await db.showTableStatus('users');
await db.optimizeTable('users');
```

### SqlServerAdapter

SQL Server adapter with OUTPUT clause support and TOP clause optimization.

#### Configuration
```javascript
const SqlServerAdapter = require('./library/mvc/db/adapter/sqlServerAdapter');

const config = {
    server: 'localhost',
    port: 1433,
    database: 'MyApp',
    user: 'sa',
    password: 'Password123!',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const db = new SqlServerAdapter(config);
await db.connect();
```

#### SQL Server-Specific Features
```javascript
// OUTPUT clause for inserts
const result = await db.insert('Users', { Name: 'John' });
console.log('Inserted record:', result.insertedRecord);

// OUTPUT clause for updates/deletes
const updateResult = await db.update(
    'Users', 
    { LastLogin: new Date() }, 
    'Id = ?', 
    [123], 
    true // Return updated records
);

// TOP clause queries
const topUsers = await db.selectTop('Users', 5, 'Active = ?', [1]);

// SQL Server utilities
const nextIdentity = await db.getNextIdentity('Users');
const tableSize = await db.getTableSize('Users');
```

### SQLiteAdapter

SQLite adapter with file-based storage, WAL mode support, and maintenance utilities.

#### Configuration
```javascript
const SQLiteAdapter = require('./library/mvc/db/adapter/sqliteAdapter');

const config = {
    database: './myapp.sqlite', // File path or ':memory:' for in-memory
    options: {
        enableWAL: true,        // WAL mode for better concurrency
        busyTimeout: 10000,     // Wait time for busy database
        foreignKeys: true,      // Enable foreign key constraints
        cacheSize: -2000,       // 2MB cache size
        tempStore: 'MEMORY'     // Store temp tables in memory
    }
};

const db = new SQLiteAdapter(config);
await db.connect();
```

#### SQLite-Specific Features
```javascript
// Database maintenance
const sizeInfo = await db.getDatabaseSize();
console.log('Database size:', sizeInfo.sizeMB, 'MB');

const vacuumResult = await db.vacuum(); // Reclaim space
await db.analyze(); // Update query planner statistics

// Integrity check
const isIntact = await db.integrityCheck();

// Index management
await db.createIndex('idx_users_email', 'users', ['email'], true);
const indexes = await db.listIndexes();
await db.dropIndex('idx_old_index');

// File-based benefits: No server required, easy backup/restore
// Simply copy the .sqlite file to backup or transfer the database
```

### Adapter Selection Guide

| Feature | PostgreSQL | MySQL | SQL Server | SQLite |
|---------|------------|-------|------------|--------|
| **RETURNING Clause** | ✅ Native | ❌ Simulated | ✅ OUTPUT | ❌ Simulated |
| **JSON Support** | ✅ Native | ✅ Limited | ✅ Native | ✅ Limited |
| **Window Functions** | ✅ Full | ✅ Limited | ✅ Full | ✅ Limited |
| **Auto-increment** | ✅ SERIAL | ✅ AUTO_INCREMENT | ✅ IDENTITY | ✅ AUTOINCREMENT |
| **Batch Operations** | ✅ Good | ✅ Optimized | ✅ Good | ✅ Transaction |
| **Connection Pooling** | ✅ Built-in | ✅ Built-in | ✅ Built-in | ❌ File-based |
| **Server Required** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **File Size** | ❌ Large | ❌ Large | ❌ Large | ✅ Small |
| **Setup Complexity** | 🟡 Medium | 🟡 Medium | 🟡 Medium | ✅ Simple |

#### Query Execution

```javascript
// Execute raw SQL
const result = await db.query('SELECT * FROM users WHERE id = $1', [123]);

// Execute Select object
const select = db.select().from('users');
const users = await db.fetchAll(select);

// Fetch single row
const user = await db.fetchRow(select);

// Fetch single value
const count = await db.fetchOne(db.select().from('users', 'COUNT(*)'));
```

#### CRUD Operations

```javascript
// Insert
const insertResult = await db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
    active: true
});

// Update
const updateResult = await db.update('users', 
    { name: 'Jane Doe' },
    'id = ?', 
    [123]
);

// Delete
const deleteResult = await db.delete('users', 'id = ?', [123]);
```

## Advanced Features

### Transactions

#### Basic Transaction
```javascript
await db.transaction(async (trx) => {
    await trx.insert('users', userData);
    await trx.insert('profiles', profileData);
    await trx.update('stats', { user_count: 'user_count + 1' }, 'id = ?', [1]);
});
```

#### Manual Transaction Control
```javascript
try {
    await db.beginTransaction();
    await db.insert('users', userData);
    await db.insert('profiles', profileData);
    await db.commit();
} catch (error) {
    await db.rollback();
    throw error;
}
```

### Query Cloning

Create reusable base queries:

```javascript
const baseQuery = db.select()
    .from('products')
    .where('active = ?', true);

// Clone for different purposes
const featuredProducts = baseQuery.clone()
    .where('featured = ?', true)
    .order('priority', 'DESC');

const discountedProducts = baseQuery.clone()
    .where('discount > ?', 0)
    .order('discount', 'DESC');
```

### Subqueries

```javascript
// Build subquery
const subSelect = db.select()
    .from('orders', 'user_id')
    .where('total > ?', 100);

// Use in main query
const usersWithLargeOrders = db.select()
    .from('users')
    .where(`id IN (${subSelect.toString()})`);

// Combine parameters
const allParams = usersWithLargeOrders.getParameters()
    .concat(subSelect.getParameters());
```

### Dynamic Query Building

```javascript
function buildProductQuery(filters = {}) {
    const select = db.select()
        .from('products', ['id', 'name', 'price', 'category']);
    
    if (filters.category) {
        select.where('category = ?', filters.category);
    }
    
    if (filters.minPrice) {
        select.where('price >= ?', filters.minPrice);
    }
    
    if (filters.maxPrice) {
        select.where('price <= ?', filters.maxPrice);
    }
    
    if (filters.search) {
        select.where('name ILIKE ?', `%${filters.search}%`);
    }
    
    if (filters.sortBy) {
        const direction = filters.sortOrder || 'ASC';
        select.order(filters.sortBy, direction);
    }
    
    if (filters.limit) {
        select.limit(filters.limit, filters.offset || 0);
    }
    
    return select;
}

// Usage
const products = await buildProductQuery({
    category: 'electronics',
    minPrice: 100,
    search: 'laptop',
    sortBy: 'price',
    sortOrder: 'ASC',
    limit: 20
}).execute();
```

## Security

### Parameter Binding

The query builder automatically handles parameter binding to prevent SQL injection:

```javascript
// SAFE - Uses parameter binding
select.where('user_id = ?', userInput);

// UNSAFE - Direct string interpolation (avoid this)
select.where(`user_id = ${userInput}`);
```

### Identifier Quoting

```javascript
const quotedTable = db.quoteIdentifier('table name with spaces');
const quotedColumn = db.quoteIdentifier('column-with-dashes');
```

### Value Escaping

```javascript
const escapedValue = db.escape("O'Malley");  // Returns: 'O''Malley'
const escapedNull = db.escape(null);         // Returns: NULL
const escapedNumber = db.escape(123);        // Returns: 123
```

## Performance Considerations

### Connection Pooling

The PostgreSQL adapter uses connection pooling by default:

```javascript
const config = {
    // ... other config
    max_connections: 10,        // Maximum pool size
    idle_timeout: 30000,        // Idle connection timeout
    connection_timeout: 2000    // New connection timeout
};
```

### Query Optimization

1. **Use specific column lists** instead of SELECT *
2. **Add appropriate WHERE conditions** to limit result sets
3. **Use LIMIT** for pagination
4. **Index frequently queried columns**

```javascript
// Good: Specific columns with LIMIT
const users = await db.select()
    .from('users', ['id', 'name', 'email'])
    .where('active = ?', true)
    .limit(10)
    .execute();

// Avoid: SELECT * without limits
const allUsers = await db.select()
    .from('users')
    .execute();
```

### Query Caching

For frequently used queries, consider caching the query objects:

```javascript
class UserQueries {
    constructor(db) {
        this.db = db;
        this.activeUsersQuery = db.select()
            .from('users', ['id', 'name', 'email'])
            .where('active = ?', true)
            .order('name', 'ASC');
    }
    
    async getActiveUsers(limit = 10) {
        return this.activeUsersQuery.clone()
            .limit(limit)
            .execute();
    }
}
```

## Error Handling

### Database Connection Errors

```javascript
try {
    await db.connect();
} catch (error) {
    console.error('Database connection failed:', error.message);
    // Handle connection failure
}
```

### Query Execution Errors

```javascript
try {
    const result = await db.select()
        .from('non_existent_table')
        .execute();
} catch (error) {
    if (error.message.includes('does not exist')) {
        console.error('Table not found:', error.message);
    } else {
        console.error('Query error:', error.message);
    }
}
```

### Transaction Errors

```javascript
try {
    await db.transaction(async (trx) => {
        await trx.insert('users', userData);
        await trx.insert('invalid_table', data); // This will fail
    });
} catch (error) {
    console.error('Transaction failed and was rolled back:', error.message);
}
```

## Integration with Table Gateway

The query builder integrates seamlessly with the Table Gateway pattern:

```javascript
class UserGateway {
    constructor(dbAdapter) {
        this.db = dbAdapter;
        this.tableName = 'users';
    }
    
    async findActiveUsers() {
        return this.db.select()
            .from(this.tableName)
            .where('active = ?', true)
            .order('name', 'ASC')
            .execute();
    }
    
    async findByDepartment(department) {
        return this.db.select()
            .from(this.tableName, ['id', 'name', 'email'])
            .where('department = ?', department)
            .where('active = ?', true)
            .execute();
    }
    
    async getUsersWithProfiles() {
        return this.db.select()
            .from({u: this.tableName}, ['u.id', 'u.name', 'u.email'])
            .joinLeft({p: 'profiles'}, 'u.id = p.user_id', ['p.bio', 'p.avatar'])
            .where('u.active = ?', true)
            .execute();
    }
}