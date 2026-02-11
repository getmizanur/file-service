/**
 * CRUD Query Builders Usage Examples
 * Demonstrates how to use Insert, Update, Delete, and Select classes
 */

const PostgreSQLAdapter = require('../adapter/postgreSQLAdapter');
const MySQLAdapter = require('../adapter/mysqlAdapter');
const SqlServerAdapter = require('../adapter/sqlServerAdapter');
const SQLiteAdapter = require('../adapter/sqliteAdapter');

/**
 * Insert Query Builder Examples
 */
async function insertExamples() {
    console.log('=== INSERT Query Builder Examples ===');
    
    const db = new SQLiteAdapter({ database: ':memory:' });
    await db.connect();
    
    // Create test table
    await db.query(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            age INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    try {
        // Example 1: Simple insert
        const insert1 = db.insert()
            .into('users')
            .set({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            });
        
        console.log('Simple Insert SQL:', insert1.toString());
        const result1 = await insert1.execute();
        console.log('Insert Result:', result1);
        
        // Example 2: Insert with specific columns
        const insert2 = db.insert()
            .into('users')
            .columns(['name', 'email', 'age'])
            .values(['Alice Smith', 'alice@example.com', 25]);
        
        console.log('Column-specific Insert SQL:', insert2.toString());
        await insert2.execute();
        
        // Example 3: Batch insert
        const insert3 = db.insert()
            .into('users')
            .batchValues([
                { name: 'Bob Wilson', email: 'bob@example.com', age: 35 },
                { name: 'Carol Brown', email: 'carol@example.com', age: 28 },
                { name: 'David Lee', email: 'david@example.com', age: 32 }
            ]);
        
        console.log('Batch Insert SQL:', insert3.toString());
        await insert3.execute();
        
        // Example 4: Insert with conflict handling (would work with PostgreSQL/MySQL)
        const insert4 = db.insert()
            .into('users')
            .set({ name: 'John Doe', email: 'john@example.com', age: 31 })
            .onConflict('IGNORE');
        
        console.log('Insert with Conflict Handling:', insert4.toString());
        
    } catch (error) {
        console.error('Insert Example Error:', error.message);
    }
    
    await db.disconnect();
}

/**
 * Update Query Builder Examples
 */
async function updateExamples() {
    console.log('\\n=== UPDATE Query Builder Examples ===');
    
    const db = new SQLiteAdapter({ database: ':memory:' });
    await db.connect();
    
    // Create and populate test table
    await db.query(`
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price DECIMAL(10,2),
            stock INTEGER DEFAULT 0,
            category TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.query(`
        INSERT INTO products (name, price, stock, category) VALUES
        ('Laptop', 999.99, 10, 'Electronics'),
        ('Mouse', 25.99, 50, 'Electronics'),
        ('Book', 15.99, 100, 'Books'),
        ('Desk', 299.99, 5, 'Furniture')
    `);
    
    try {
        // Example 1: Simple update
        const update1 = db.update()
            .table('products')
            .set('price', 899.99)
            .where('name = ?', 'Laptop');
        
        console.log('Simple Update SQL:', update1.toString());
        const result1 = await update1.execute();
        console.log('Update Result:', result1);
        
        // Example 2: Multiple column update
        const update2 = db.update()
            .table('products')
            .set({
                price: 23.99,
                stock: 75,
                updated_at: new Date().toISOString()
            })
            .where('name = ?', 'Mouse');
        
        console.log('Multiple Column Update SQL:', update2.toString());
        await update2.execute();
        
        // Example 3: Update with increment
        const update3 = db.update()
            .table('products')
            .increment('stock', 25)
            .where('category = ?', 'Books');
        
        console.log('Increment Update SQL:', update3.toString());
        await update3.execute();
        
        // Example 4: Update with complex conditions
        const update4 = db.update()
            .table('products')
            .set('price', 199.99)
            .where('category = ?', 'Electronics')
            .where('price < ?', 50)
            .limit(10);
        
        console.log('Complex Update SQL:', update4.toString());
        await update4.execute();
        
        // Example 5: Update with JOIN (conceptual - would work with full SQL)
        const update5 = db.update()
            .table({ p: 'products' })
            .set('p.price', 0)
            .where('p.stock = ?', 0);
        
        console.log('Update with Alias SQL:', update5.toString());
        
    } catch (error) {
        console.error('Update Example Error:', error.message);
    }
    
    await db.disconnect();
}

/**
 * Delete Query Builder Examples
 */
async function deleteExamples() {
    console.log('\\n=== DELETE Query Builder Examples ===');
    
    const db = new SQLiteAdapter({ database: ':memory:' });
    await db.connect();
    
    // Create and populate test table
    await db.query(`
        CREATE TABLE logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            processed BOOLEAN DEFAULT FALSE
        )
    `);
    
    await db.query(`
        INSERT INTO logs (user_id, action, processed) VALUES
        (1, 'login', 1),
        (1, 'logout', 1),
        (2, 'login', 0),
        (2, 'view_page', 0),
        (3, 'login', 1),
        (3, 'purchase', 0)
    `);
    
    try {
        // Example 1: Simple delete
        const delete1 = db.delete()
            .from('logs')
            .where('processed = ?', true);
        
        console.log('Simple Delete SQL:', delete1.toString());
        const result1 = await delete1.execute();
        console.log('Delete Result:', result1);
        
        // Example 2: Delete with multiple conditions
        const delete2 = db.delete()
            .from('logs')
            .where('user_id = ?', 2)
            .where('action = ?', 'view_page');
        
        console.log('Conditional Delete SQL:', delete2.toString());
        await delete2.execute();
        
        // Example 3: Delete with IN clause
        const delete3 = db.delete()
            .from('logs')
            .whereIn('user_id', [1, 3]);
        
        console.log('Delete IN SQL:', delete3.toString());
        await delete3.execute();
        
        // Example 4: Delete with LIMIT (MySQL/SQLite)
        const delete4 = db.delete()
            .from('logs')
            .where('processed = ?', false)
            .orderBy('id', 'ASC')
            .limit(5);
        
        console.log('Limited Delete SQL:', delete4.toString());
        
        // Example 5: Truncate table
        const delete5 = db.delete().from('logs');
        console.log('Truncate Alternative:', delete5.toString());
        
    } catch (error) {
        console.error('Delete Example Error:', error.message);
    }
    
    await db.disconnect();
}

/**
 * Cross-Database Query Builder Examples
 */
async function crossDatabaseCRUDExamples() {
    console.log('\\n=== Cross-Database CRUD Examples ===');
    
    const adapters = [
        {
            name: 'PostgreSQL',
            adapter: new PostgreSQLAdapter({
                host: 'localhost',
                database: 'test_db',
                username: 'postgres',
                password: 'password'
            })
        },
        {
            name: 'MySQL',
            adapter: new MySQLAdapter({
                host: 'localhost',
                database: 'test_db',
                user: 'root',
                password: 'password'
            })
        },
        {
            name: 'SQL Server',
            adapter: new SqlServerAdapter({
                server: 'localhost',
                database: 'TestDB',
                user: 'sa',
                password: 'Password123!'
            })
        },
        {
            name: 'SQLite',
            adapter: new SQLiteAdapter({
                database: './test.sqlite'
            })
        }
    ];
    
    adapters.forEach(({ name, adapter }) => {
        console.log(`\\n--- ${name} Query Examples ---`);
        
        try {
            // INSERT example
            const insert = adapter.insert()
                .into('users')
                .set({
                    name: 'Test User',
                    email: 'test@example.com',
                    created_at: new Date()
                });
            
            console.log(`${name} INSERT:`, insert.toString());
            
            // UPDATE example
            const update = adapter.update()
                .table('users')
                .set({ last_login: new Date() })
                .where('email = ?', 'test@example.com');
            
            console.log(`${name} UPDATE:`, update.toString());
            
            // DELETE example
            const deleteQuery = adapter.delete()
                .from('users')
                .where('created_at < ?', '2023-01-01');
            
            console.log(`${name} DELETE:`, deleteQuery.toString());
            
            // SELECT example
            const select = adapter.select()
                .from('users', ['id', 'name', 'email'])
                .where('active = ?', true)
                .order('created_at', 'DESC')
                .limit(10);
            
            console.log(`${name} SELECT:`, select.toString());
            
        } catch (error) {
            console.error(`${name} Error:`, error.message);
        }
    });
}

/**
 * Advanced Query Builder Patterns
 */
async function advancedCRUDPatterns() {
    console.log('\\n=== Advanced CRUD Patterns ===');
    
    const db = new SQLiteAdapter({ database: ':memory:' });
    await db.connect();
    
    try {
        // Pattern 1: Upsert simulation (insert or update)
        const upsertUser = async (userData) => {
            const exists = await db.select()
                .from('users')
                .where('email = ?', userData.email)
                .execute();
            
            if (exists.length > 0) {
                return await db.update()
                    .table('users')
                    .set(userData)
                    .where('email = ?', userData.email)
                    .execute();
            } else {
                return await db.insert()
                    .into('users')
                    .set(userData)
                    .execute();
            }
        };
        
        console.log('Upsert Pattern: Function created');
        
        // Pattern 2: Conditional delete with verification
        const safeDelete = async (table, conditions) => {
            // First count what would be deleted
            const countQuery = db.select()
                .from(table)
                .select('COUNT(*) as count');
            
            conditions.forEach(cond => {
                countQuery.where(cond.condition, ...cond.values);
            });
            
            const countResult = await countQuery.execute();
            console.log(`Would delete ${countResult[0].count} rows`);
            
            // Then perform the delete if reasonable
            if (countResult[0].count > 0 && countResult[0].count < 1000) {
                const deleteQuery = db.delete().from(table);
                conditions.forEach(cond => {
                    deleteQuery.where(cond.condition, ...cond.values);
                });
                
                return await deleteQuery.execute();
            } else {
                console.log('Delete operation cancelled - too many rows or no matches');
                return { affectedRows: 0, success: false };
            }
        };
        
        console.log('Safe Delete Pattern: Function created');
        
        // Pattern 3: Batch operations with transaction
        const batchUpdateWithRollback = async (updates) => {
            return await db.transaction(async (trx) => {
                const results = [];
                
                for (const update of updates) {
                    const query = `UPDATE ${update.table} SET ${update.column} = ? WHERE ${update.condition}`;
                    const result = await trx.query(query, [update.value, ...update.params]);
                    results.push(result);
                    
                    // If any update affects unexpected number of rows, rollback
                    if (result.rowCount !== update.expectedRows) {
                        throw new Error(`Expected ${update.expectedRows} rows, affected ${result.rowCount}`);
                    }
                }
                
                return results;
            });
        };
        
        console.log('Batch Update with Rollback Pattern: Function created');
        
    } catch (error) {
        console.error('Advanced Pattern Error:', error.message);
    }
    
    await db.disconnect();
}

// Export all examples
module.exports = {
    insertExamples,
    updateExamples,
    deleteExamples,
    crossDatabaseCRUDExamples,
    advancedCRUDPatterns
};

// Uncomment to run examples:
// insertExamples().catch(console.error);
// updateExamples().catch(console.error);
// deleteExamples().catch(console.error);
// crossDatabaseCRUDExamples().catch(console.error);
// advancedCRUDPatterns().catch(console.error);