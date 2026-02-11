# Database Query Builder Documentation

A comprehensive Node.js database query builder providing a fluent interface for constructing SQL queries safely and efficiently. Supports **PostgreSQL**, **MySQL**, **SQL Server**, and **SQLite** with database-specific optimizations while maintaining a consistent API.

## 🎯 Supported Databases

- **PostgreSQL** - Full feature support with RETURNING clauses, JSON operations
- **MySQL** - Auto-increment handling, batch optimizations, table utilities  
- **SQL Server** - OUTPUT clauses, TOP optimization, identity management
- **SQLite** - File-based storage, WAL mode, pragma optimization, maintenance utilities

## 📚 Documentation Overview

### [📖 Main Guide - Database Query Builder](./database-query-builder.md)
Complete guide covering architecture, basic usage, advanced features, security, and performance considerations. **Start here** for a comprehensive overview.

### [📋 API Reference](./database-api-reference.md)
Detailed API documentation for all classes and methods including:
- **Select Class** - Fluent query builder interface
- **DatabaseAdapter Class** - Abstract database operations
- **PostgreSQLAdapter Class** - PostgreSQL concrete implementation
- **MySQLAdapter Class** - MySQL concrete implementation  
- **SqlServerAdapter Class** - SQL Server concrete implementation
- **SQLiteAdapter Class** - SQLite concrete implementation

### [🛠️ Examples & Patterns](./database-examples.md)
Practical examples and real-world patterns including:
- **CRUD Operations** - Create, Read, Update, Delete examples
- **Advanced Queries** - Complex WHERE conditions, subqueries, joins
- **Pagination** - Both offset-based and cursor-based patterns
- **Search & Filtering** - Text search, date ranges, dynamic filtering
- **Aggregations** - Reporting queries and analytics
- **Transactions** - Complex business logic examples
- **Table Gateway Patterns** - Data access layer design patterns
- **Performance Optimization** - Best practices for efficient queries
- **Cross-Database Examples** - Using same code across different databases

## 🚀 Quick Start

### Installation
The query builder is built into the MVC framework. Install database drivers as needed:

```bash
# PostgreSQL
npm install pg

# MySQL  
npm install mysql2

# SQL Server
npm install mssql

# SQLite
npm install sqlite3
```

### Basic Usage

**PostgreSQL:**
```javascript
const PostgreSQLAdapter = require('./library/mvc/db/adapter/postgreSQLAdapter');
const db = new PostgreSQLAdapter({
    host: 'localhost', database: 'myapp', username: 'user', password: 'pass'
});
```

**MySQL:**
```javascript
const MySQLAdapter = require('./library/mvc/db/adapter/mysqlAdapter');
const db = new MySQLAdapter({
    host: 'localhost', database: 'myapp', user: 'root', password: 'pass'
});
```

**SQL Server:**
```javascript
const SqlServerAdapter = require('./library/mvc/db/adapter/sqlServerAdapter');
const db = new SqlServerAdapter({
    server: 'localhost', database: 'MyApp', user: 'sa', password: 'Pass123!'
});
```

**SQLite:**
```javascript
const SQLiteAdapter = require('./library/mvc/db/adapter/sqliteAdapter');
const db = new SQLiteAdapter({
    database: './database.sqlite' // or ':memory:' for in-memory
});
```

**Common Usage (same for all databases):**
```javascript
await db.connect();

// Build and execute query
const users = await db.select()
    .from('users', ['id', 'name', 'email'])
    .where('active = ?', true)
    .order('name', 'ASC')
    .limit(10)
    .execute();
```

## 🎯 Key Features

### ✨ Fluent Interface
```javascript
const result = db.select()
    .from({u: 'users'}, ['u.name', 'u.email'])
    .joinLeft({p: 'profiles'}, 'u.id = p.user_id', ['p.bio'])
    .where('u.active = ?', true)
    .where('u.department = ?', 'Engineering')
    .order('u.name', 'ASC')
    .limit(20)
    .execute();
```

### 🔒 Security Built-In
- **Automatic parameter binding** prevents SQL injection
- **Query parameterization** with `$1, $2, $3...` placeholders
- **Value escaping** for different data types
- **Identifier quoting** for table and column names

### 🔧 Advanced Query Building
- **Complex JOINs** - INNER, LEFT, RIGHT joins with aliases
- **Subqueries** - Embedded queries for complex logic
- **Aggregations** - GROUP BY, HAVING, window functions
- **Dynamic queries** - Runtime query construction
- **Query cloning** - Reusable base queries

### 📊 Multiple Execution Methods
```javascript
const rows = await db.fetchAll(select);    // All rows
const row = await db.fetchRow(select);     // Single row
const value = await db.fetchOne(select);   // Single value
const result = await select.execute();     // Direct execution
```

### 🏗️ Object-Oriented Design
- **Abstract base classes** for database adapters
- **Concrete implementations** (PostgreSQL included)
- **Table Gateway pattern** support
- **Service layer** integration
- **Dependency injection** friendly

### ⚡ Transaction Support
```javascript
await db.transaction(async (trx) => {
    await trx.insert('users', userData);
    await trx.insert('profiles', profileData);
    await trx.update('statistics', {user_count: 'user_count + 1'});
});
```

## 📁 File Structure

```
library/mvc/db/
├── select.js                    # Main query builder class
├── table-gateway.js             # Existing table gateway (updated)
├── examples.js                  # Usage examples and patterns
└── adapter/
    ├── database-adapter.js      # Abstract database interface
    └── postgre-sql-adapter.js   # PostgreSQL implementation

docs/
├── database-query-builder.md    # Main documentation guide
├── database-api-reference.md    # Detailed API documentation
├── database-examples.md         # Practical examples & patterns
└── README.md                    # This file
```

## 🎓 Learning Path

1. **Start with [Main Guide](./database-query-builder.md)** - Understand the architecture and basic concepts
2. **Try the examples** from the guide or [Examples document](./database-examples.md)
3. **Reference the [API docs](./database-api-reference.md)** when you need specific method details
4. **Build your own Table Gateway classes** following the patterns in examples

## 🔗 Integration with MVC Framework

The query builder integrates seamlessly with the existing MVC framework:

### With Controllers
```javascript
class UserController {
    async indexAction() {
        const users = await this.db.select()
            .from('users')
            .where('active = ?', true)
            .execute();
        
        return this.view.render('users/index', { users });
    }
}
```

### With Table Gateways
```javascript
class UserGateway extends TableGateway {
    async findActiveUsers() {
        return this.db.select()
            .from(this.tableName)
            .where('active = ?', true)
            .execute();
    }
}
```

### With Services
```javascript
class UserService {
    constructor(userGateway, emailService) {
        this.userGateway = userGateway;
        this.emailService = emailService;
    }
    
    async createUser(userData) {
        const userId = await this.userGateway.db.transaction(async (trx) => {
            const result = await trx.insert('users', userData);
            await this.emailService.sendWelcomeEmail(userData.email);
            return result.insertedId;
        });
        
        return userId;
    }
}
```

## 🛡️ Security Considerations

- **Always use parameter binding** instead of string interpolation
- **Validate input data** before passing to queries
- **Use transactions** for multi-step operations
- **Limit query results** with appropriate WHERE clauses and LIMIT
- **Quote identifiers** when using dynamic table/column names

## 🚀 Performance Tips

- **Use specific column lists** instead of SELECT *
- **Add appropriate WHERE conditions** to limit result sets
- **Use LIMIT and OFFSET** for pagination
- **Index frequently queried columns**
- **Use connection pooling** (enabled by default)
- **Monitor query performance** with EXPLAIN ANALYZE

## 🤝 Contributing

When extending the query builder:

1. Follow the established patterns in existing code
2. Add comprehensive tests for new features
3. Update documentation for any API changes
4. Ensure backward compatibility when possible
5. Follow the object-oriented design principles

## 📄 License

This database query builder is part of the MVC framework and follows the same licensing terms.

---

**Need help?** Check the [examples document](./database-examples.md) for practical patterns or the [API reference](./database-api-reference.md) for detailed method documentation.