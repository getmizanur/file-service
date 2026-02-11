/**
 * Database Query Builder Usage Examples
 * Demonstrates how to use the Select class and DatabaseAdapter
 */

// Example database configuration
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'user',
    password: 'pass',
    max_connections: 10
};

/**
 * Basic Usage Examples
 */
async function basicExamples() {
    // Initialize database adapter
    const PostgreSQLAdapter = require('./adapter/postgreSQLAdapter');
    const db = new PostgreSQLAdapter(dbConfig);
    
    try {
        // Connect to database
        await db.connect();
        
        // Example 1: Basic SELECT
        const select1 = db.select()
            .from('users', ['id', 'name', 'email'])
            .where('active = ?', 1)
            .order('name', 'ASC')
            .limit(10);
        
        console.log('Basic SELECT:', select1.toString());
        // Output: SELECT id, name, email FROM users WHERE active = $1 ORDER BY name ASC LIMIT 10
        
        const users = await select1.execute();
        console.log('Users:', users);
        
        
        // Example 2: SELECT with JOINs
        const select2 = db.select()
            .from({u: 'users'}, ['u.name', 'u.email'])
            .joinLeft({p: 'profiles'}, 'u.id = p.user_id', ['p.bio', 'p.avatar'])
            .where('u.age > ?', 18)
            .where('u.status = ?', 'active')
            .order('u.created_at', 'DESC');
        
        console.log('JOIN SELECT:', select2.toString());
        
        
        // Example 3: Aggregate queries with GROUP BY
        const select3 = db.select()
            .from('orders', {
                'department': 'department',
                'total_orders': 'COUNT(*)',
                'avg_amount': 'AVG(amount)'
            })
            .where('created_at >= ?', '2023-01-01')
            .group('department')
            .having('COUNT(*) > ?', 5)
            .order('total_orders', 'DESC');
        
        console.log('Aggregate SELECT:', select3.toString());
        
        
        // Example 4: Subquery example
        const subSelect = db.select()
            .from('orders', 'user_id')
            .where('total > ?', 100);
        
        const select4 = db.select()
            .from('users')
            .where(`id IN (${subSelect.toString()})`);
        
        console.log('Subquery SELECT:', select4.toString());
        
        
        // Example 5: Complex WHERE conditions
        const select5 = db.select()
            .from('products')
            .where('category = ?', 'electronics')
            .where('price BETWEEN ? AND ?', [100, 500])
            .orWhere('featured = ?', true)
            .order('price', 'ASC')
            .limit(20);
        
        console.log('Complex WHERE:', select5.toString());
        
    } catch (error) {
        console.error('Database error:', error.message);
    } finally {
        await db.disconnect();
    }
}

/**
 * Advanced Usage Examples
 */
async function advancedExamples() {
    const PostgreSQLAdapter = require('./adapter/postgreSQLAdapter');
    const db = new PostgreSQLAdapter(dbConfig);
    
    try {
        await db.connect();
        
        // Example 1: Transaction with multiple operations
        await db.transaction(async (trx) => {
            // Insert new user
            const userResult = await trx.insert('users', {
                name: 'John Doe',
                email: 'john@example.com',
                active: true
            });
            
            const userId = userResult.insertedId;
            
            // Create user profile
            await trx.insert('profiles', {
                user_id: userId,
                bio: 'Software Developer',
                avatar: 'john.jpg'
            });
            
            // Update user statistics
            await trx.update('user_stats', 
                { total_users: 'total_users + 1' },
                'id = ?', [1]
            );
        });
        
        
        // Example 2: Dynamic query building
        function buildUserQuery(filters = {}) {
            const select = db.select()
                .from('users', ['id', 'name', 'email', 'created_at']);
            
            if (filters.active !== undefined) {
                select.where('active = ?', filters.active);
            }
            
            if (filters.search) {
                select.where('name ILIKE ?', `%${filters.search}%`);
            }
            
            if (filters.department) {
                select.where('department = ?', filters.department);
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
        
        // Use dynamic query
        const userQuery = buildUserQuery({
            active: true,
            search: 'john',
            sortBy: 'created_at',
            sortOrder: 'DESC',
            limit: 10
        });
        
        console.log('Dynamic query:', userQuery.toString());
        
        
        // Example 3: Query builder chaining and cloning
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
        
        const newProducts = baseQuery.clone()
            .where('created_at >= ?', new Date(Date.now() - 7*24*60*60*1000))
            .order('created_at', 'DESC');
        
        console.log('Featured products:', featuredProducts.toString());
        console.log('Discounted products:', discountedProducts.toString());
        console.log('New products:', newProducts.toString());
        
        
        // Example 4: Using different fetch methods
        const productSelect = db.select()
            .from('products')
            .where('category = ?', 'books')
            .order('price', 'ASC');
        
        // Fetch all results
        const allProducts = await db.fetchAll(productSelect);
        console.log('All products:', allProducts.length);
        
        // Fetch single row
        const firstProduct = await db.fetchRow(productSelect);
        console.log('First product:', firstProduct);
        
        // Fetch single value
        const countSelect = db.select()
            .from('products', 'COUNT(*)')
            .where('category = ?', 'books');
        
        const productCount = await db.fetchOne(countSelect);
        console.log('Product count:', productCount);
        
    } catch (error) {
        console.error('Advanced example error:', error.message);
    } finally {
        await db.disconnect();
    }
}

/**
 * Table Gateway Integration Example
 */
class ProductGateway {
    constructor(dbAdapter) {
        this.db = dbAdapter;
        this.tableName = 'products';
    }
    
    /**
     * Get active products with optional filters
     */
    async getActiveProducts(filters = {}) {
        const select = this.db.select()
            .from(this.tableName)
            .where('active = ?', true);
        
        if (filters.category) {
            select.where('category = ?', filters.category);
        }
        
        if (filters.minPrice) {
            select.where('price >= ?', filters.minPrice);
        }
        
        if (filters.maxPrice) {
            select.where('price <= ?', filters.maxPrice);
        }
        
        select.order('name', 'ASC');
        
        return this.db.fetchAll(select);
    }
    
    /**
     * Get product statistics by category
     */
    async getCategoryStats() {
        const select = this.db.select()
            .from(this.tableName, {
                'category': 'category',
                'count': 'COUNT(*)',
                'avg_price': 'AVG(price)',
                'min_price': 'MIN(price)',
                'max_price': 'MAX(price)'
            })
            .where('active = ?', true)
            .group('category')
            .order('count', 'DESC');
        
        return this.db.fetchAll(select);
    }
    
    /**
     * Search products with pagination
     */
    async searchProducts(searchTerm, page = 1, perPage = 20) {
        const offset = (page - 1) * perPage;
        
        const select = this.db.select()
            .from(this.tableName)
            .where('active = ?', true)
            .where('(name ILIKE ? OR description ILIKE ?)', [`%${searchTerm}%`, `%${searchTerm}%`])
            .order('name', 'ASC')
            .limit(perPage, offset);
        
        const products = await this.db.fetchAll(select);
        
        // Get total count for pagination
        const countSelect = this.db.select()
            .from(this.tableName, 'COUNT(*)')
            .where('active = ?', true)
            .where('(name ILIKE ? OR description ILIKE ?)', [`%${searchTerm}%`, `%${searchTerm}%`]);
        
        const totalCount = await this.db.fetchOne(countSelect);
        
        return {
            products,
            pagination: {
                page,
                perPage,
                total: parseInt(totalCount),
                pages: Math.ceil(totalCount / perPage)
            }
        };
    }
}

/**
 * MySQL Database Adapter Examples
 */
async function mysqlExamples() {
    const MySQLAdapter = require('./adapter/mysqlAdapter');
    
    // MySQL-specific configuration
    const mysqlConfig = {
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
    
    const db = new MySQLAdapter(mysqlConfig);
    
    try {
        await db.connect();
        console.log('MySQL Version:', await db.getVersion());
        
        // Example 1: Basic MySQL insert with auto-increment
        const insertResult = await db.insert('users', {
            name: 'John Doe',
            email: 'john@example.com',
            created_at: new Date()
        });
        
        console.log('MySQL Insert Result:', insertResult);
        // Output: { insertedId: 123, affectedRows: 1, success: true }
        
        // Example 2: Batch insert optimization
        const batchData = [
            { name: 'Alice', email: 'alice@example.com' },
            { name: 'Bob', email: 'bob@example.com' },
            { name: 'Charlie', email: 'charlie@example.com' }
        ];
        
        const batchResult = await db.insertBatch('users', batchData);
        console.log('Batch Insert:', batchResult);
        
        // Example 3: MySQL-specific features
        console.log('Next Auto-Increment:', await db.getNextAutoIncrement('users'));
        console.log('Table Status:', await db.showTableStatus('users'));
        
        // Example 4: Table optimization
        await db.optimizeTable('users');
        console.log('Table optimized');
        
        // Example 5: Using with Select builder
        const select = db.select()
            .from('users', ['id', 'name', 'email'])
            .where('created_at > ?', '2023-01-01')
            .order('id', 'DESC')
            .limit(5);
        
        const users = await select.execute();
        console.log('Recent users:', users);
        
        await db.disconnect();
    } catch (error) {
        console.error('MySQL Example Error:', error.message);
    }
}

/**
 * SQL Server Database Adapter Examples
 */
async function sqlServerExamples() {
    const SqlServerAdapter = require('./adapter/sqlServerAdapter');
    
    // SQL Server configuration
    const sqlServerConfig = {
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
    
    const db = new SqlServerAdapter(sqlServerConfig);
    
    try {
        await db.connect();
        console.log('SQL Server Version:', await db.getVersion());
        
        // Example 1: Insert with OUTPUT clause
        const insertResult = await db.insert('Users', {
            Name: 'Jane Doe',
            Email: 'jane@example.com',
            CreatedAt: new Date()
        });
        
        console.log('SQL Server Insert Result:', insertResult);
        // Output: { insertedId: 123, insertedRecord: {...}, affectedRows: 1, success: true }
        
        // Example 2: Update with OUTPUT clause
        const updateResult = await db.update(
            'Users',
            { LastLogin: new Date() },
            'Email = ?',
            ['jane@example.com'],
            true // Return updated records
        );
        
        console.log('Update with OUTPUT:', updateResult);
        
        // Example 3: SQL Server TOP clause
        const topUsers = await db.selectTop('Users', 5, 'Active = ?', [1]);
        console.log('Top 5 Active Users:', topUsers);
        
        // Example 4: Delete with OUTPUT clause
        const deleteResult = await db.delete(
            'Users',
            'LastLogin < ?',
            ['2023-01-01'],
            true // Return deleted records
        );
        
        console.log('Deleted Records:', deleteResult);
        
        // Example 5: SQL Server-specific information
        console.log('Next Identity Value:', await db.getNextIdentity('Users'));
        console.log('Table Size:', await db.getTableSize('Users'));
        
        // Example 6: Using with Select builder
        const select = db.select()
            .from('Users', ['Id', 'Name', 'Email'])
            .where('CreatedAt > ?', '2023-01-01')
            .order('Id', 'DESC')
            .limit(10); // Will be converted to TOP in SQL Server
        
        const users = await select.execute();
        console.log('Recent users:', users);
        
        // Example 7: Transaction with OUTPUT
        const transactionResult = await db.transaction(async (trx) => {
            // Insert user and get the record back
            const userInsert = await trx.query(`
                INSERT INTO Users (Name, Email, CreatedAt)
                OUTPUT INSERTED.*
                VALUES (@param0, @param1, @param2)
            `, ['Transaction User', 'trx@example.com', new Date()]);
            
            const userId = userInsert.rows[0].Id;
            
            // Insert profile for the user
            await trx.query(`
                INSERT INTO Profiles (UserId, Bio, Avatar)
                VALUES (@param0, @param1, @param2)
            `, [userId, 'Bio for transaction user', 'avatar.jpg']);
            
            return { userId, message: 'User and profile created' };
        });
        
        console.log('Transaction Result:', transactionResult);
        
        await db.disconnect();
    } catch (error) {
        console.error('SQL Server Example Error:', error.message);
    }
}

/**
 * Cross-Database Compatibility Examples
 */
async function crossDatabaseExamples() {
    // This example shows how the same query builder works across databases
    
    const adapters = [
        {
            name: 'PostgreSQL',
            adapter: new (require('./adapter/postgreSQLAdapter'))({
                host: 'localhost',
                database: 'postgres_db',
                username: 'postgres',
                password: 'password'
            })
        },
        {
            name: 'MySQL',
            adapter: new (require('./adapter/mysqlAdapter'))({
                host: 'localhost',
                database: 'mysql_db',
                user: 'root',
                password: 'password'
            })
        },
        {
            name: 'SQL Server',
            adapter: new (require('./adapter/sqlServerAdapter'))({
                server: 'localhost',
                database: 'sqlserver_db',
                user: 'sa',
                password: 'Password123!'
            })
        },
        {
            name: 'SQLite',
            adapter: new (require('./adapter/sqliteAdapter'))({
                database: './database.sqlite',
                options: {
                    enableWAL: true,
                    foreignKeys: true
                }
            })
        }
    ];
    
    for (const { name, adapter } of adapters) {
        try {
            console.log(`\\n=== ${name} Example ===`);
            
            // Same query builder code works for all databases
            const select = adapter.select()
                .from('products', ['id', 'name', 'price'])
                .where('category = ?', 'electronics')
                .where('price > ?', 100)
                .order('price', 'DESC')
                .limit(5);
            
            console.log(`${name} SQL:`, select.toString());
            
            // Database-specific SQL output:
            // PostgreSQL: SELECT id, name, price FROM products WHERE category = $1 AND price > $2 ORDER BY price DESC LIMIT 5
            // MySQL: SELECT id, name, price FROM products WHERE category = ? AND price = ? ORDER BY price DESC LIMIT 5  
            // SQL Server: SELECT TOP (5) id, name, price FROM products WHERE category = @param0 AND price > @param1 ORDER BY price DESC
            // SQLite: SELECT id, name, price FROM products WHERE category = ? AND price > ? ORDER BY price DESC LIMIT 5
            
        } catch (error) {
            console.error(`${name} Error:`, error.message);
        }
    }
}

/**
 * SQLite Database Adapter Examples
 */
async function sqliteExamples() {
    const SQLiteAdapter = require('./adapter/sqliteAdapter');
    
    // SQLite configuration
    const sqliteConfig = {
        database: './example.sqlite', // File path or ':memory:' for in-memory DB
        options: {
            enableWAL: true,           // Enable WAL mode for better concurrency
            busyTimeout: 10000,        // Wait up to 10 seconds for busy database
            foreignKeys: true,         // Enable foreign key constraints
            cacheSize: -2000,          // 2MB cache
            tempStore: 'MEMORY'        // Store temp tables in memory
        }
    };
    
    const db = new SQLiteAdapter(sqliteConfig);
    
    try {
        await db.connect();
        console.log('SQLite Version:', await db.getVersion());
        
        // Example 1: Create a simple table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Example 2: Basic insert with auto-increment
        const insertResult = await db.insert('users', {
            name: 'John Doe',
            email: 'john@example.com'
        });
        
        console.log('SQLite Insert Result:', insertResult);
        // Output: { insertedId: 1, affectedRows: 1, success: true }
        
        // Example 3: Batch insert with transaction
        const batchData = [
            { name: 'Alice', email: 'alice@example.com' },
            { name: 'Bob', email: 'bob@example.com' },
            { name: 'Charlie', email: 'charlie@example.com' }
        ];
        
        const batchResult = await db.insertBatch('users', batchData);
        console.log('Batch Insert:', batchResult);
        
        // Example 4: SQLite-specific features
        console.log('Database Size:', await db.getDatabaseSize());
        console.log('Integrity Check:', await db.integrityCheck());
        
        // Example 5: Create and manage indexes
        await db.createIndex('idx_users_email', 'users', ['email'], true);
        const indexes = await db.listIndexes();
        console.log('Indexes:', indexes);
        
        // Example 6: Using with Select builder
        const select = db.select()
            .from('users', ['id', 'name', 'email'])
            .where('name LIKE ?', '%John%')
            .order('created_at', 'DESC')
            .limit(5);
        
        const users = await select.execute();
        console.log('Users:', users);
        
        // Example 7: Transaction example
        const transactionResult = await db.transaction(async (trx) => {
            // Insert user
            const userResult = await trx.query(`
                INSERT INTO users (name, email) VALUES (?, ?)
            `, ['Transaction User', 'trx@example.com']);
            
            // Get the inserted user
            const userCheck = await trx.query(`
                SELECT * FROM users WHERE id = ?
            `, [userResult.insertedId]);
            
            return {
                userId: userResult.insertedId,
                user: userCheck.rows[0],
                message: 'User created in transaction'
            };
        });
        
        console.log('Transaction Result:', transactionResult);
        
        // Example 8: Database maintenance
        const vacuumResult = await db.vacuum();
        console.log('Vacuum Result:', vacuumResult);
        
        await db.analyze(); // Update statistics for query optimizer
        console.log('Database analyzed for optimization');
        
        await db.disconnect();
    } catch (error) {
        console.error('SQLite Example Error:', error.message);
    }
}

// Export examples for demonstration
module.exports = {
    basicExamples,
    advancedExamples,
    ProductGateway,
    mysqlExamples,
    sqlServerExamples,
    sqliteExamples,
    crossDatabaseExamples
};