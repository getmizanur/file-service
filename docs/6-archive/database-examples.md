# Database Query Builder - Examples & Patterns

This document provides practical examples and common patterns for using the database query builder in real-world applications.

## Table of Contents

1. [Basic CRUD Operations](#basic-crud-operations)
2. [Advanced Queries](#advanced-queries)
3. [Joins and Relationships](#joins-and-relationships)
4. [Pagination Patterns](#pagination-patterns)
5. [Search and Filtering](#search-and-filtering)
6. [Aggregations and Reporting](#aggregations-and-reporting)
7. [Transaction Patterns](#transaction-patterns)
8. [Table Gateway Patterns](#table-gateway-patterns)
9. [Performance Optimization](#performance-optimization)
10. [Common Use Cases](#common-use-cases)

## Basic CRUD Operations

### Create (INSERT)

```javascript
// Simple insert
const userResult = await db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
    department: 'Engineering',
    active: true,
    created_at: new Date()
});

console.log('New user ID:', userResult.insertedId);

// Batch insert (PostgreSQL)
const users = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
];

for (const userData of users) {
    await db.insert('users', userData);
}
```

### Read (SELECT)

```javascript
// Get all active users
const activeUsers = await db.select()
    .from('users')
    .where('active = ?', true)
    .order('name', 'ASC')
    .execute();

// Get user by ID
const user = await db.select()
    .from('users')
    .where('id = ?', 123)
    .fetchRow();

// Count users
const userCount = await db.select()
    .from('users', 'COUNT(*)')
    .where('active = ?', true)
    .fetchOne();
```

### Update

```javascript
// Update single user
const updateResult = await db.update('users',
    { 
        name: 'John Smith',
        updated_at: new Date() 
    },
    'id = ?',
    [123]
);

// Bulk update
const bulkUpdateResult = await db.update('users',
    { 
        active: false,
        deactivated_at: new Date() 
    },
    'last_login < ?',
    ['2022-01-01']
);

console.log('Users updated:', bulkUpdateResult.rowsAffected);
```

### Delete

```javascript
// Soft delete
await db.update('users',
    { 
        deleted: true,
        deleted_at: new Date() 
    },
    'id = ?',
    [123]
);

// Hard delete
const deleteResult = await db.delete('users', 'id = ?', [123]);
console.log('Deleted users:', deleteResult.rowsAffected);

// Delete with conditions
await db.delete('sessions', 'expires_at < ?', [new Date()]);
```

## Advanced Queries

### Complex WHERE Conditions

```javascript
// Multiple AND conditions
const engineeringUsers = await db.select()
    .from('users')
    .where('department = ?', 'Engineering')
    .where('active = ?', true)
    .where('salary > ?', 75000)
    .execute();

// OR conditions
const priorityUsers = await db.select()
    .from('users')
    .where('role = ?', 'admin')
    .orWhere('priority = ?', 'high')
    .orWhere('department = ?', 'Management')
    .execute();

// Complex nested conditions
const complexQuery = await db.select()
    .from('orders')
    .where('(status = ? OR priority = ?)', ['urgent', 'high'])
    .where('created_at >= ?', '2023-01-01')
    .where('total BETWEEN ? AND ?', [100, 1000])
    .execute();

// IN clause
const userIds = [1, 2, 3, 4, 5];
const specificUsers = await db.select()
    .from('users')
    .where('id = ANY(?)', [userIds])
    .execute();

// LIKE patterns
const searchUsers = await db.select()
    .from('users')
    .where('name ILIKE ?', '%john%')
    .where('email LIKE ?', '%@company.com')
    .execute();
```

### Subqueries

```javascript
// EXISTS subquery
const usersWithOrders = await db.select()
    .from('users', ['id', 'name', 'email'])
    .where(`EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.user_id = users.id 
        AND orders.created_at >= ?
    )`, ['2023-01-01'])
    .execute();

// IN subquery
const topSpenders = await db.select()
    .from('users')
    .where(`id IN (
        SELECT user_id FROM orders 
        GROUP BY user_id 
        HAVING SUM(total) > ?
    )`, [10000])
    .execute();

// Correlated subquery
const usersWithLatestOrder = await db.select()
    .from('users', [
        'users.id',
        'users.name',
        `(SELECT created_at FROM orders 
          WHERE orders.user_id = users.id 
          ORDER BY created_at DESC LIMIT 1) as last_order_date`
    ])
    .execute();
```

### Window Functions (PostgreSQL)

```javascript
// Row numbering
const rankedUsers = await db.query(`
    SELECT 
        name,
        salary,
        department,
        ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank
    FROM users
    WHERE active = $1
    ORDER BY department, rank
`, [true]);

// Running totals
const salesWithRunningTotal = await db.query(`
    SELECT 
        date,
        amount,
        SUM(amount) OVER (ORDER BY date) as running_total
    FROM sales
    ORDER BY date
`);
```

## Joins and Relationships

### Basic Joins

```javascript
// Inner join - users with profiles
const usersWithProfiles = await db.select()
    .from({u: 'users'}, ['u.id', 'u.name', 'u.email'])
    .join({p: 'profiles'}, 'u.id = p.user_id', ['p.bio', 'p.avatar'])
    .where('u.active = ?', true)
    .execute();

// Left join - all users, with profiles if they exist
const allUsersWithOptionalProfiles = await db.select()
    .from({u: 'users'}, ['u.id', 'u.name'])
    .joinLeft({p: 'profiles'}, 'u.id = p.user_id', ['p.bio'])
    .execute();
```

### Multiple Joins

```javascript
// Users with profiles and latest order
const usersWithDetails = await db.select()
    .from({u: 'users'}, ['u.id', 'u.name', 'u.email'])
    .joinLeft({p: 'profiles'}, 'u.id = p.user_id', ['p.bio'])
    .joinLeft({o: 'orders'}, 'u.id = o.user_id AND o.id = (
        SELECT id FROM orders o2 
        WHERE o2.user_id = u.id 
        ORDER BY created_at DESC LIMIT 1
    )', ['o.total as latest_order_total'])
    .where('u.active = ?', true)
    .execute();
```

### Self Joins

```javascript
// Employee hierarchy
const employeeHierarchy = await db.select()
    .from({e: 'employees'}, ['e.id', 'e.name', 'e.title'])
    .joinLeft({m: 'employees'}, 'e.manager_id = m.id', {
        'manager_name': 'm.name',
        'manager_title': 'm.title'
    })
    .order('e.department', 'ASC')
    .execute();
```

### Many-to-Many Relationships

```javascript
// Users with their roles (through user_roles junction table)
const usersWithRoles = await db.select()
    .from({u: 'users'}, ['u.id', 'u.name'])
    .join({ur: 'user_roles'}, 'u.id = ur.user_id')
    .join({r: 'roles'}, 'ur.role_id = r.id', ['r.name as role_name'])
    .where('u.active = ?', true)
    .order('u.name', 'ASC')
    .execute();

// Group roles per user
const usersWithGroupedRoles = await db.query(`
    SELECT 
        u.id,
        u.name,
        ARRAY_AGG(r.name) as roles
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.active = $1
    GROUP BY u.id, u.name
    ORDER BY u.name
`, [true]);
```

## Pagination Patterns

### Basic Pagination

```javascript
async function getPaginatedUsers(page = 1, perPage = 20) {
    const offset = (page - 1) * perPage;
    
    // Get users for current page
    const users = await db.select()
        .from('users', ['id', 'name', 'email', 'created_at'])
        .where('active = ?', true)
        .order('created_at', 'DESC')
        .limit(perPage, offset)
        .execute();
    
    // Get total count for pagination info
    const totalCount = await db.select()
        .from('users', 'COUNT(*)')
        .where('active = ?', true)
        .fetchOne();
    
    return {
        users,
        pagination: {
            page,
            perPage,
            total: parseInt(totalCount),
            pages: Math.ceil(totalCount / perPage),
            hasNext: page * perPage < totalCount,
            hasPrev: page > 1
        }
    };
}

// Usage
const result = await getPaginatedUsers(2, 10);
console.log('Page 2 users:', result.users);
console.log('Total pages:', result.pagination.pages);
```

### Cursor-based Pagination (Better for Large Datasets)

```javascript
async function getCursorPaginatedUsers(cursor = null, limit = 20) {
    const query = db.select()
        .from('users', ['id', 'name', 'email', 'created_at'])
        .where('active = ?', true)
        .order('created_at', 'DESC')
        .limit(limit + 1); // Get one extra to check if there's a next page
    
    if (cursor) {
        query.where('created_at < ?', cursor);
    }
    
    const results = await query.execute();
    const hasNext = results.length > limit;
    
    if (hasNext) {
        results.pop(); // Remove the extra record
    }
    
    const nextCursor = hasNext && results.length > 0 
        ? results[results.length - 1].created_at 
        : null;
    
    return {
        users: results,
        nextCursor,
        hasNext
    };
}

// Usage
let cursor = null;
do {
    const result = await getCursorPaginatedUsers(cursor, 10);
    console.log('Users:', result.users.length);
    cursor = result.nextCursor;
} while (cursor);
```

## Search and Filtering

### Text Search

```javascript
async function searchUsers(searchTerm, filters = {}) {
    const query = db.select()
        .from('users', ['id', 'name', 'email', 'department']);
    
    // Text search across multiple columns
    if (searchTerm) {
        query.where(`(
            name ILIKE ? OR 
            email ILIKE ? OR 
            department ILIKE ?
        )`, [
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`
        ]);
    }
    
    // Additional filters
    if (filters.department) {
        query.where('department = ?', filters.department);
    }
    
    if (filters.active !== undefined) {
        query.where('active = ?', filters.active);
    }
    
    if (filters.minSalary) {
        query.where('salary >= ?', filters.minSalary);
    }
    
    if (filters.maxSalary) {
        query.where('salary <= ?', filters.maxSalary);
    }
    
    // Sorting
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'ASC';
    query.order(sortBy, sortOrder);
    
    return query.execute();
}

// Usage
const results = await searchUsers('john', {
    department: 'Engineering',
    active: true,
    minSalary: 50000,
    sortBy: 'salary',
    sortOrder: 'DESC'
});
```

### Full-Text Search (PostgreSQL)

```javascript
// Create text search index (run once)
await db.query(`
    ALTER TABLE products 
    ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
        to_tsvector('english', name || ' ' || description)
    ) STORED
`);

await db.query('CREATE INDEX ON products USING GIN (search_vector)');

// Search products
async function searchProducts(searchTerm) {
    return db.query(`
        SELECT 
            id,
            name,
            description,
            ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
        FROM products
        WHERE search_vector @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC, name ASC
    `, [searchTerm]);
}
```

### Date Range Filtering

```javascript
async function getOrdersByDateRange(startDate, endDate, filters = {}) {
    const query = db.select()
        .from('orders', ['id', 'user_id', 'total', 'status', 'created_at'])
        .where('created_at >= ?', startDate)
        .where('created_at <= ?', endDate);
    
    if (filters.status) {
        query.where('status = ?', filters.status);
    }
    
    if (filters.minTotal) {
        query.where('total >= ?', filters.minTotal);
    }
    
    if (filters.userId) {
        query.where('user_id = ?', filters.userId);
    }
    
    query.order('created_at', 'DESC');
    
    return query.execute();
}

// Usage
const lastMonthOrders = await getOrdersByDateRange(
    new Date('2023-11-01'),
    new Date('2023-11-30'),
    { status: 'completed', minTotal: 100 }
);
```

## Aggregations and Reporting

### Basic Aggregations

```javascript
// User statistics by department
const departmentStats = await db.select()
    .from('users', {
        'department': 'department',
        'total_users': 'COUNT(*)',
        'active_users': 'COUNT(*) FILTER (WHERE active = true)',
        'avg_salary': 'AVG(salary)',
        'min_salary': 'MIN(salary)',
        'max_salary': 'MAX(salary)'
    })
    .where('deleted = ?', false)
    .group('department')
    .order('total_users', 'DESC')
    .execute();

// Monthly sales report
const monthlySales = await db.select()
    .from('orders', {
        'year': 'EXTRACT(YEAR FROM created_at)',
        'month': 'EXTRACT(MONTH FROM created_at)',
        'order_count': 'COUNT(*)',
        'total_revenue': 'SUM(total)',
        'avg_order_value': 'AVG(total)'
    })
    .where('status = ?', 'completed')
    .where('created_at >= ?', '2023-01-01')
    .group(['EXTRACT(YEAR FROM created_at)', 'EXTRACT(MONTH FROM created_at)'])
    .order(['year', 'month'])
    .execute();
```

### Advanced Reporting

```javascript
// Customer lifetime value
const customerLTV = await db.query(`
    SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(o.id) as total_orders,
        SUM(o.total) as lifetime_value,
        AVG(o.total) as avg_order_value,
        MIN(o.created_at) as first_order,
        MAX(o.created_at) as last_order,
        EXTRACT(DAYS FROM MAX(o.created_at) - MIN(o.created_at)) as customer_lifespan_days
    FROM users u
    JOIN orders o ON u.id = o.user_id
    WHERE o.status = $1
    GROUP BY u.id, u.name, u.email
    HAVING COUNT(o.id) > $2
    ORDER BY lifetime_value DESC
`, ['completed', 1]);

// Product performance report
const productPerformance = await db.query(`
    SELECT 
        p.id,
        p.name,
        p.category,
        COUNT(oi.id) as times_ordered,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.price * oi.quantity) as total_revenue,
        AVG(oi.price) as avg_selling_price,
        COUNT(DISTINCT o.user_id) as unique_customers
    FROM products p
    JOIN order_items oi ON p.id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = $1
    AND o.created_at >= $2
    GROUP BY p.id, p.name, p.category
    ORDER BY total_revenue DESC
`, ['completed', '2023-01-01']);
```

### Time-based Analytics

```javascript
// Daily active users trend
const dailyActiveUsers = await db.query(`
    SELECT 
        DATE(login_at) as date,
        COUNT(DISTINCT user_id) as daily_active_users
    FROM user_sessions
    WHERE login_at >= $1
    GROUP BY DATE(login_at)
    ORDER BY date
`, [new Date(Date.now() - 30*24*60*60*1000)]); // Last 30 days

// Hourly order distribution
const hourlyOrders = await db.query(`
    SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as order_count,
        AVG(total) as avg_order_value
    FROM orders
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
`);
```

## Transaction Patterns

### Basic Transaction

```javascript
async function createUserWithProfile(userData, profileData) {
    return db.transaction(async (trx) => {
        // Insert user
        const userResult = await trx.insert('users', userData);
        const userId = userResult.insertedId;
        
        // Insert profile with user reference
        const profileResult = await trx.insert('profiles', {
            ...profileData,
            user_id: userId
        });
        
        // Update user count statistics
        await trx.query(`
            INSERT INTO statistics (key, value) 
            VALUES ('total_users', 1) 
            ON CONFLICT (key) 
            DO UPDATE SET value = statistics.value + 1
        `);
        
        return { userId, profileId: profileResult.insertedId };
    });
}
```

### Complex Business Logic Transaction

```javascript
async function processOrder(orderData, items) {
    return db.transaction(async (trx) => {
        // 1. Create order
        const orderResult = await trx.insert('orders', {
            ...orderData,
            status: 'pending',
            created_at: new Date()
        });
        const orderId = orderResult.insertedId;
        
        let totalAmount = 0;
        
        // 2. Process each order item
        for (const item of items) {
            // Check product availability
            const product = await trx.fetchRow(`
                SELECT id, name, price, stock_quantity 
                FROM products 
                WHERE id = $1 AND active = true
            `, [item.productId]);
            
            if (!product) {
                throw new Error(`Product ${item.productId} not found or inactive`);
            }
            
            if (product.stock_quantity < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.name}`);
            }
            
            // Create order item
            await trx.insert('order_items', {
                order_id: orderId,
                product_id: item.productId,
                quantity: item.quantity,
                price: product.price
            });
            
            // Update product stock
            await trx.update('products',
                { stock_quantity: product.stock_quantity - item.quantity },
                'id = ?',
                [item.productId]
            );
            
            totalAmount += product.price * item.quantity;
        }
        
        // 3. Update order total
        await trx.update('orders',
            { 
                total: totalAmount,
                status: 'confirmed' 
            },
            'id = ?',
            [orderId]
        );
        
        // 4. Create audit log
        await trx.insert('audit_logs', {
            entity_type: 'order',
            entity_id: orderId,
            action: 'created',
            details: JSON.stringify({ items, total: totalAmount }),
            created_at: new Date()
        });
        
        return { orderId, total: totalAmount };
    });
}
```

### Batch Processing Transaction

```javascript
async function bulkUserUpdate(updates) {
    return db.transaction(async (trx) => {
        const results = [];
        
        for (const update of updates) {
            try {
                const result = await trx.update('users',
                    update.data,
                    'id = ?',
                    [update.userId]
                );
                
                results.push({
                    userId: update.userId,
                    success: true,
                    rowsAffected: result.rowsAffected
                });
                
            } catch (error) {
                results.push({
                    userId: update.userId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Log bulk operation
        await trx.insert('batch_operations', {
            operation_type: 'bulk_user_update',
            total_records: updates.length,
            successful_records: results.filter(r => r.success).length,
            failed_records: results.filter(r => !r.success).length,
            details: JSON.stringify(results),
            created_at: new Date()
        });
        
        return results;
    });
}
```

## Table Gateway Patterns

### Basic Table Gateway

```javascript
class UserGateway {
    constructor(dbAdapter) {
        this.db = dbAdapter;
        this.tableName = 'users';
    }
    
    async findById(id) {
        return this.db.select()
            .from(this.tableName)
            .where('id = ?', id)
            .fetchRow();
    }
    
    async findByEmail(email) {
        return this.db.select()
            .from(this.tableName)
            .where('email = ?', email)
            .fetchRow();
    }
    
    async findActive() {
        return this.db.select()
            .from(this.tableName)
            .where('active = ?', true)
            .where('deleted = ?', false)
            .order('name', 'ASC')
            .execute();
    }
    
    async create(userData) {
        const data = {
            ...userData,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        return this.db.insert(this.tableName, data);
    }
    
    async update(id, userData) {
        const data = {
            ...userData,
            updated_at: new Date()
        };
        
        return this.db.update(this.tableName, data, 'id = ?', [id]);
    }
    
    async softDelete(id) {
        return this.db.update(this.tableName,
            { 
                deleted: true,
                deleted_at: new Date() 
            },
            'id = ?',
            [id]
        );
    }
}
```

### Advanced Table Gateway with Relationships

```javascript
class OrderGateway {
    constructor(dbAdapter) {
        this.db = dbAdapter;
        this.tableName = 'orders';
    }
    
    async findWithItems(orderId) {
        // Get order details
        const order = await this.db.select()
            .from({o: this.tableName}, [
                'o.id', 'o.user_id', 'o.status', 'o.total', 'o.created_at'
            ])
            .joinLeft({u: 'users'}, 'o.user_id = u.id', [
                'u.name as customer_name',
                'u.email as customer_email'
            ])
            .where('o.id = ?', orderId)
            .fetchRow();
        
        if (!order) {
            return null;
        }
        
        // Get order items
        const items = await this.db.select()
            .from({oi: 'order_items'}, [
                'oi.id', 'oi.quantity', 'oi.price'
            ])
            .join({p: 'products'}, 'oi.product_id = p.id', [
                'p.name as product_name',
                'p.sku as product_sku'
            ])
            .where('oi.order_id = ?', orderId)
            .execute();
        
        return { ...order, items };
    }
    
    async findByUser(userId, options = {}) {
        const query = this.db.select()
            .from(this.tableName)
            .where('user_id = ?', userId);
        
        if (options.status) {
            query.where('status = ?', options.status);
        }
        
        if (options.dateFrom) {
            query.where('created_at >= ?', options.dateFrom);
        }
        
        if (options.dateTo) {
            query.where('created_at <= ?', options.dateTo);
        }
        
        query.order('created_at', 'DESC');
        
        if (options.limit) {
            query.limit(options.limit, options.offset || 0);
        }
        
        return query.execute();
    }
    
    async getStatistics(userId = null) {
        const query = this.db.select()
            .from(this.tableName, {
                'total_orders': 'COUNT(*)',
                'total_revenue': 'SUM(total)',
                'avg_order_value': 'AVG(total)',
                'min_order_value': 'MIN(total)',
                'max_order_value': 'MAX(total)'
            });
        
        if (userId) {
            query.where('user_id = ?', userId);
        }
        
        return query.fetchRow();
    }
}
```

### Service Layer with Multiple Gateways

```javascript
class UserService {
    constructor(userGateway, profileGateway, orderGateway) {
        this.userGateway = userGateway;
        this.profileGateway = profileGateway;
        this.orderGateway = orderGateway;
    }
    
    async createCompleteUser(userData, profileData) {
        return this.userGateway.db.transaction(async (trx) => {
            // Create user
            const userResult = await trx.insert('users', {
                ...userData,
                created_at: new Date()
            });
            
            const userId = userResult.insertedId;
            
            // Create profile
            if (profileData) {
                await trx.insert('profiles', {
                    ...profileData,
                    user_id: userId
                });
            }
            
            // Initialize user preferences
            await trx.insert('user_preferences', {
                user_id: userId,
                email_notifications: true,
                theme: 'light'
            });
            
            return userId;
        });
    }
    
    async getUserDashboard(userId) {
        const [user, profile, orderStats] = await Promise.all([
            this.userGateway.findById(userId),
            this.profileGateway.findByUserId(userId),
            this.orderGateway.getStatistics(userId)
        ]);
        
        const recentOrders = await this.orderGateway.findByUser(userId, {
            limit: 5
        });
        
        return {
            user,
            profile,
            orderStatistics: orderStats,
            recentOrders
        };
    }
}
```

## Performance Optimization

### Query Optimization

```javascript
// GOOD: Use specific columns and WHERE conditions
const efficientQuery = await db.select()
    .from('users', ['id', 'name', 'email'])  // Specific columns
    .where('active = ?', true)               // Indexed condition
    .where('created_at >= ?', lastWeek)      // Limit date range
    .limit(100)                              // Limit results
    .execute();

// AVOID: SELECT * without conditions
const inefficientQuery = await db.select()
    .from('users')  // All columns
    .execute();     // No WHERE, no LIMIT
```

### Index-Friendly Queries

```javascript
// Ensure queries use indexes effectively
const indexedQuery = await db.select()
    .from('orders')
    .where('user_id = ?', userId)        // Uses user_id index
    .where('status = ?', 'completed')    // Uses status index
    .where('created_at >= ?', startDate) // Uses created_at index
    .order('created_at', 'DESC')         // Uses same index for ordering
    .execute();

// Check query execution plan (PostgreSQL)
const explain = await db.query(
    'EXPLAIN ANALYZE ' + indexedQuery.toString(),
    indexedQuery.getParameters()
);
console.log('Execution plan:', explain);
```

### Batch Operations

```javascript
// Efficient batch insert
async function batchInsertUsers(users) {
    const batchSize = 1000;
    
    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await db.transaction(async (trx) => {
            for (const user of batch) {
                await trx.insert('users', user);
            }
        });
        
        console.log(`Processed ${Math.min(i + batchSize, users.length)} / ${users.length} users`);
    }
}
```

### Connection Pooling Optimization

```javascript
// Configure connection pool for optimal performance
const optimizedConfig = {
    host: 'localhost',
    database: 'myapp',
    username: 'user',
    password: 'password',
    max_connections: 20,           // Adjust based on your needs
    idle_timeout: 30000,           // 30 seconds
    connection_timeout: 5000,      // 5 seconds
    statement_timeout: 60000       // 60 seconds for long queries
};

const db = new PostgreSQLAdapter(optimizedConfig);
```

This comprehensive examples document shows practical patterns for using the database query builder in real applications. Each pattern includes working code examples and best practices for performance and security.